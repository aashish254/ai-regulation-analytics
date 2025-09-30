'use client';

import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Star, Trash2, Edit2, X, Check } from 'lucide-react';

interface SavedView {
  id: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  activeTab: string;
  isFavorite: boolean;
  createdAt: string;
}

interface SavedViewsManagerProps {
  currentView: {
    dateFrom: string;
    dateTo: string;
    activeTab: string;
  };
  onLoadView: (view: SavedView) => void;
}

export default function SavedViewsManager({ currentView, onLoadView }: SavedViewsManagerProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [editingView, setEditingView] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Load saved views from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('savedDashboardViews');
    if (stored) {
      try {
        setSavedViews(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load saved views:', e);
      }
    }
  }, []);

  // Save views to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('savedDashboardViews', JSON.stringify(savedViews));
  }, [savedViews]);

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      alert('Please enter a name for this view');
      return;
    }

    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      dateFrom: currentView.dateFrom,
      dateTo: currentView.dateTo,
      activeTab: currentView.activeTab,
      isFavorite: false,
      createdAt: new Date().toISOString()
    };

    setSavedViews([...savedViews, newView]);
    setNewViewName('');
    setShowSaveModal(false);
  };

  const handleDeleteView = (id: string) => {
    if (confirm('Are you sure you want to delete this view?')) {
      setSavedViews(savedViews.filter(v => v.id !== id));
    }
  };

  const handleToggleFavorite = (id: string) => {
    setSavedViews(savedViews.map(v => 
      v.id === id ? { ...v, isFavorite: !v.isFavorite } : v
    ));
  };

  const handleRenameView = (id: string) => {
    if (!editName.trim()) return;
    setSavedViews(savedViews.map(v => 
      v.id === id ? { ...v, name: editName.trim() } : v
    ));
    setEditingView(null);
    setEditName('');
  };

  const startEditing = (view: SavedView) => {
    setEditingView(view.id);
    setEditName(view.name);
  };

  const favoriteViews = savedViews.filter(v => v.isFavorite);
  const regularViews = savedViews.filter(v => !v.isFavorite);

  return (
    <div className="flex items-center gap-2">
      {/* Quick Access Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowViewsModal(!showViewsModal)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Load Saved View"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Saved Views</span>
          {savedViews.length > 0 && (
            <span className="bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {savedViews.length}
            </span>
          )}
        </button>

        {showViewsModal && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowViewsModal(false)}
            />
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Saved Views</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click to load a saved dashboard configuration
                </p>
              </div>

              {savedViews.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved views yet</p>
                  <p className="text-xs mt-1">Save your current view to get started</p>
                </div>
              ) : (
                <div className="p-2">
                  {/* Favorite Views */}
                  {favoriteViews.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 mb-1">
                        FAVORITES
                      </p>
                      {favoriteViews.map(view => (
                        <ViewItem
                          key={view.id}
                          view={view}
                          onLoad={() => {
                            onLoadView(view);
                            setShowViewsModal(false);
                          }}
                          onDelete={() => handleDeleteView(view.id)}
                          onToggleFavorite={() => handleToggleFavorite(view.id)}
                          onStartEdit={() => startEditing(view)}
                          isEditing={editingView === view.id}
                          editName={editName}
                          setEditName={setEditName}
                          onSaveEdit={() => handleRenameView(view.id)}
                          onCancelEdit={() => setEditingView(null)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Regular Views */}
                  {regularViews.length > 0 && (
                    <div>
                      {favoriteViews.length > 0 && (
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 mb-1 mt-2">
                          ALL VIEWS
                        </p>
                      )}
                      {regularViews.map(view => (
                        <ViewItem
                          key={view.id}
                          view={view}
                          onLoad={() => {
                            onLoadView(view);
                            setShowViewsModal(false);
                          }}
                          onDelete={() => handleDeleteView(view.id)}
                          onToggleFavorite={() => handleToggleFavorite(view.id)}
                          onStartEdit={() => startEditing(view)}
                          isEditing={editingView === view.id}
                          editName={editName}
                          setEditName={setEditName}
                          onSaveEdit={() => handleRenameView(view.id)}
                          onCancelEdit={() => setEditingView(null)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Save Current View Button */}
      <button
        onClick={() => setShowSaveModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
        title="Save Current View"
      >
        <Save className="w-4 h-4" />
        <span>Save View</span>
      </button>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Save Current View
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                View Name
              </label>
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveView()}
                placeholder="e.g., Monthly Compliance Review"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Current Configuration:
              </p>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p>📅 Date: {currentView.dateFrom} to {currentView.dateTo}</p>
                <p>📊 Tab: {currentView.activeTab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setNewViewName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ViewItem Component
interface ViewItemProps {
  view: SavedView;
  onLoad: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onStartEdit: () => void;
  isEditing: boolean;
  editName: string;
  setEditName: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function ViewItem({
  view,
  onLoad,
  onDelete,
  onToggleFavorite,
  onStartEdit,
  isEditing,
  editName,
  setEditName,
  onSaveEdit,
  onCancelEdit
}: ViewItemProps) {
  return (
    <div className="group p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0" onClick={onLoad}>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSaveEdit()}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveEdit();
                }}
                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEdit();
                }}
                className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="cursor-pointer">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {view.name}
                </p>
                {view.isFavorite && (
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {view.dateFrom} to {view.dateTo}
              </p>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="p-1 text-gray-600 dark:text-gray-400 hover:text-yellow-500 rounded"
              title={view.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 ${view.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 rounded"
              title="Rename"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-500 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
