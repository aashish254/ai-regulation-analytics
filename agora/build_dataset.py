import os
import sys
import csv
import math
import json
from datetime import datetime

import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from langdetect import detect, DetectorFactory

# Make langdetect deterministic
DetectorFactory.seed = 0

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

AUTH_PATH = os.path.join(BASE_DIR, 'authorities.csv')
COLL_PATH = os.path.join(BASE_DIR, 'collections.csv')
DOCS_PATH = os.path.join(BASE_DIR, 'documents.csv')
FULLTEXT_DIR = os.path.join(BASE_DIR, 'fulltext')
OUT_PATH = os.path.join(BASE_DIR, 'clean_dataset.csv')

REQUIRED_COLUMNS = [
    'id','title','authority','country','region','topic','document_type','date','year','month',
    'sentiment','sentiment_score','risk_level','risk_score','document_length','confidence_score',
    'status','content','url','language','tags'
]


def read_csv_safe(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(f'Missing file: {path}')
    # Try common encodings
    for enc in ('utf-8-sig', 'utf-8', 'cp1252'):
        try:
            return pd.read_csv(path, encoding=enc)
        except Exception:
            continue
    # Fallback
    return pd.read_csv(path, encoding_errors='ignore')


def load_fulltext(doc_id: int) -> str:
    # Files are named like "{id}.txt"
    path = os.path.join(FULLTEXT_DIR, f"{int(doc_id)}.txt")
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except UnicodeDecodeError:
            with open(path, 'r', encoding='cp1252', errors='ignore') as f:
                return f.read().strip()
    return ''


def sanitize_text(text: str, max_len: int | None = None) -> str:
    """Remove newlines, collapse whitespace, strip non-printable edges, and optionally truncate."""
    if not isinstance(text, str):
        return ''
    t = text.replace('\r', ' ').replace('\n', ' ')
    # collapse spaces
    t = ' '.join(t.split())
    if max_len is not None and len(t) > max_len:
        t = t[:max_len].rstrip()
    return t


def first_valid_url(value: str) -> str:
    if not isinstance(value, str) or not value.strip():
        return ''
    # Split on common separators
    parts = []
    for sep in [';', '|', ',', '\n', '\r']:
        if sep in value:
            value = value.replace('\r', ' ').replace('\n', ' ')
    parts = [p.strip() for p in value.split(' ') if p.strip()]
    # Also consider semicolon-separated within tokens
    flat = []
    for p in parts:
        flat.extend([x for x in p.split(';') if x])
    for p in flat:
        if p.startswith('http://') or p.startswith('https://'):
            return p
    return ''


def choose_best_url(row: pd.Series) -> str:
    # Priority: Official pdf source (if present and looks like URL) > Official plaintext source > Link to document
    pdf_src = row.get('Official pdf source')
    pdf_retrieved = str(row.get('Official pdf retrieved', '')).strip().lower()
    plain_src = row.get('Official plaintext source')
    link = row.get('Link to document')

    # If PDF retrieved flag is informative, prefer it
    if pdf_retrieved in ('true', '1', 'yes'):
        u = first_valid_url(pdf_src)
        if u:
            return u
    # Otherwise try whichever source provides a valid URL first
    for candidate in (pdf_src, plain_src, link):
        u = first_valid_url(candidate)
        if u:
            return u
    return ''


def normalize_date(row) -> tuple[str|None, int|None, int|None]:
    # Prefer Most recent activity date, else Proposed date
    for col in ('Most recent activity date', 'Proposed date'):
        val = str(row.get(col, '')).strip()
        if val and val.lower() != 'nan':
            try:
                # Try ISO first
                dt = datetime.fromisoformat(val)
            except Exception:
                # Try common patterns
                for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y", "%Y-%m", "%Y"):
                    try:
                        dt = datetime.strptime(val, fmt)
                        break
                    except Exception:
                        dt = None
                if dt is None:
                    return None, None, None
            return dt.date().isoformat(), dt.year, dt.month
    return None, None, None


def infer_doc_type(title: str, collections: str) -> str:
    t = (title or '').lower()
    c = (collections or '').lower()
    if 'executive order' in t:
        return 'Executive Order'
    if 'bill' in t or 'act' in t:
        return 'Law/Act'
    if 'regulation' in t or 'regulations' in t or 'regulation' in c or 'regulations' in c:
        return 'Regulation'
    if 'resolution' in t:
        return 'Resolution'
    if 'policy' in t or 'policies' in t:
        return 'Policy/Guidance'
    # From collection hints
    if 'federal laws' in c or 'ndaa' in c:
        return 'Law/Act'
    if 'state and local' in c:
        return 'State/Local Law or Policy'
    return 'Other'


def extract_topic(tags: str, collections: str) -> str:
    # Prefer first collection as a compact topic; else use first tag
    if isinstance(collections, str) and collections.strip():
        return collections.split(';')[0].strip()
    if isinstance(tags, str) and tags.strip():
        # Use first tag phrase
        return tags.split(';')[0].strip()
    return ''


def normalize_tags(tags: str) -> str:
    if not isinstance(tags, str) or not tags.strip():
        return ''
    parts = [p.strip() for p in tags.replace('|', ';').split(';') if p.strip()]
    # Deduplicate while preserving order
    seen = set()
    norm = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            norm.append(p)
    # Limit to top 15 to keep CSV manageable
    return ', '.join(norm[:15])


def compute_sentiment(text: str, analyzer: SentimentIntensityAnalyzer) -> tuple[str, float]:
    sample = (text or '')
    if len(sample) > 8000:
        sample = sample[:8000]
    if not sample.strip():
        return 'neutral', 0.0
    score = analyzer.polarity_scores(sample)['compound']
    if score >= 0.05:
        label = 'positive'
    elif score <= -0.05:
        label = 'negative'
    else:
        label = 'neutral'
    return label, float(score)


def compute_risk(row: pd.Series, risk_cols: list[str], harm_cols: list[str]) -> tuple[str, float]:
    total_cols = len(risk_cols) + len(harm_cols)
    if total_cols == 0:
        return 'low', 0.0
    positives = 0
    for col in risk_cols + harm_cols:
        val = row.get(col)
        if isinstance(val, bool):
            positives += 1 if val else 0
        else:
            # Interpret strings like 'True', 'False'
            if str(val).strip().lower() in ('true', '1', 'yes'):
                positives += 1
    score = positives / total_cols
    if score < 0.34:
        level = 'low'
    elif score < 0.67:
        level = 'medium'
    else:
        level = 'high'
    return level, float(round(score, 4))


def compute_confidence(row: pd.Series) -> float:
    annotated = str(row.get('Annotated?', '')).strip().lower() == 'true'
    validated = str(row.get('Validated?', '')).strip().lower() == 'true'
    if validated:
        return 1.0
    if annotated:
        return 0.7
    return 0.5


def authority_country_region(authority: str, auth_df: pd.DataFrame) -> tuple[str|None, str|None]:
    if not isinstance(authority, str) or not authority.strip():
        return None, None
    # Exact match first
    match = auth_df.loc[auth_df['Name'] == authority]
    if len(match) == 0:
        # Try case-insensitive
        match = auth_df.loc[auth_df['Name'].str.lower() == authority.lower()]
    if len(match) == 0:
        return None, None
    country = match.iloc[0].get('Jurisdiction')
    parent = match.iloc[0].get('Parent authority')
    # Region preference: parent if available else country
    region = parent if isinstance(parent, str) and parent.strip() else country
    return (country if isinstance(country, str) and country.strip() else None,
            region if isinstance(region, str) and region.strip() else None)


def detect_language(text: str) -> str:
    sample = (text or '').strip()
    if not sample:
        return ''
    # Use first 2000 chars for speed
    sample = sample[:2000]
    try:
        return detect(sample)
    except Exception:
        return ''


def main():
    print('Loading CSVs...')
    docs = read_csv_safe(DOCS_PATH)
    auth = read_csv_safe(AUTH_PATH)
    # Ensure expected columns exist
    for col in ['Name', 'Jurisdiction', 'Parent authority']:
        if col not in auth.columns:
            raise ValueError(f'Missing column in authorities.csv: {col}')

    # Prepare risk and harms columns from documents header
    risk_cols = [c for c in docs.columns if c.lower().startswith('risk factors')]
    harm_cols = [c for c in docs.columns if c.lower().startswith('harms')]

    analyzer = SentimentIntensityAnalyzer()

    rows = []
    total = len(docs)
    for idx, row in docs.iterrows():
        try:
            doc_id = row.get('AGORA ID')
            if pd.isna(doc_id):
                continue
            try:
                doc_id_int = int(doc_id)
            except Exception:
                # some IDs may be strings; attempt to coerce
                doc_id_int = int(str(doc_id).strip())

            official_name = row.get('Official name')
            casual_name = row.get('Casual name')
            title_raw = official_name if isinstance(official_name, str) and official_name.strip() else casual_name
            title = sanitize_text(title_raw or '', max_len=300)
            authority = row.get('Authority') if isinstance(row.get('Authority'), str) else ''
            url = choose_best_url(row)
            collections = row.get('Collections') if isinstance(row.get('Collections'), str) else ''
            tags_raw = row.get('Tags') if isinstance(row.get('Tags'), str) else ''
            tags = normalize_tags(tags_raw)
            status = row.get('Most recent activity') if isinstance(row.get('Most recent activity'), str) else ''

            date_iso, year, month = normalize_date(row)
            topic = sanitize_text(extract_topic(tags_raw, collections), max_len=120)
            doc_type = infer_doc_type(title or '', collections)

            content = load_fulltext(doc_id_int)
            if not content:
                # Fallback to long or short summary
                long_summary = row.get('Long summary')
                short_summary = row.get('Short summary')
                content = (long_summary if isinstance(long_summary, str) and long_summary.strip() else '')
                if not content:
                    content = (short_summary if isinstance(short_summary, str) and short_summary.strip() else '')

            # Clean and truncate content to avoid multiline CSV cells
            content = sanitize_text(content, max_len=1500)

            doc_len = len(content.split()) if content else 0
            sentiment_label, sentiment_score = compute_sentiment(content, analyzer)
            risk_level, risk_score = compute_risk(row, risk_cols, harm_cols)
            conf = compute_confidence(row)
            country, region = authority_country_region(authority, auth)
            language = detect_language(content)

            out = {
                'id': doc_id_int,
                'title': title or '',
                'authority': authority or '',
                'country': country or '',
                'region': region or '',
                'topic': topic or '',
                'document_type': doc_type or '',
                'date': date_iso or '',
                'year': int(year) if year else '',
                'month': int(month) if month else '',
                'sentiment': sentiment_label,
                'sentiment_score': round(float(sentiment_score), 4),
                'risk_level': risk_level,
                'risk_score': round(float(risk_score), 4),
                'document_length': int(doc_len),
                'confidence_score': round(float(conf), 3),
                'status': status or '',
                'content': content or '',
                'url': url or '',
                'language': language or '',
                'tags': tags or ''
            }
            rows.append(out)
        except Exception as e:
            # Continue processing, but log error
            sys.stderr.write(f"Error processing row {idx}: {e}\n")
            continue
        if (idx + 1) % 250 == 0:
            print(f"Processed {idx + 1}/{total}...", flush=True)

    print(f"Writing {len(rows)} rows to {OUT_PATH} ...")
    # Write CSV with explicit column order
    df_out = pd.DataFrame(rows, columns=REQUIRED_COLUMNS)
    # Ensure id is integer and sort ascending
    df_out['id'] = pd.to_numeric(df_out['id'], errors='coerce').astype('Int64')
    df_out = df_out.sort_values('id').reset_index(drop=True)
    df_out.to_csv(OUT_PATH, index=False, encoding='utf-8')
    print('Done.')


if __name__ == '__main__':
    main()
