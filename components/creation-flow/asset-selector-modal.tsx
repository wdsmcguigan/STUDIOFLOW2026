import React, { useState } from 'react';
import { X, Search, Image as ImageIcon, Video, Music, FileText, Folder } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ProjectAsset } from '../../lib/db';

interface AssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: ProjectAsset) => void;
  projectId?: string;
  acceptedTypes?: string[]; // 'image', 'video', etc.
}

export function AssetSelectorModal({ isOpen, onClose, onSelect, projectId, acceptedTypes = ['image'] }: AssetSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const project = useLiveQuery(
    () => (projectId ? db.projects.get(projectId) : undefined),
    [projectId]
  );

  const assets = project?.assets || [];

  const filteredAssets = assets.filter(asset => {
    // Type Filter
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(asset.type)) return false;
    // Search Filter
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSelect = (asset: ProjectAsset) => {
    setSelectedId(asset.id);
    // Optional: Allow double click or require confirm button?
    // Let's do instant select for now or confirm button.
    // Let's do click to select, then confirm button.
  };

  const handleConfirm = () => {
    const asset = assets.find(a => a.id === selectedId);
    if (asset) {
      onSelect(asset);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Select Asset</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <Folder className="h-12 w-12 mb-2 opacity-20" />
              <p>No matching assets found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => handleSelect(asset)}
                  className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all group ${selectedId === asset.id ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-white/10 hover:border-white/30'
                    }`}
                >
                  {asset.type === 'image' ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/40">
                      {asset.type === 'video' && <Video className="h-8 w-8 text-white/50" />}
                      {asset.type === 'audio' && <Music className="h-8 w-8 text-white/50" />}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-xs text-white truncate">{asset.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Select Asset
          </button>
        </div>
      </div>
    </div>
  );
}
