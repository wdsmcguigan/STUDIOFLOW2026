import React, { useRef } from 'react';
import { Upload, X, Check, Image as ImageIcon, FolderOpen } from 'lucide-react';

interface Asset {
    id: string;
    type: string; // 'image' | 'video'
    base64: string;
    selected?: boolean;
}

interface AssetUploaderProps {
    assets: Asset[];
    onAdd: (files: FileList) => void;
    onRemove: (id: string) => void;
    onToggleSelection: (id: string) => void;
    onSelectFromLibrary?: () => void;
    label?: string;
}

export function AssetUploader({ assets, onAdd, onRemove, onToggleSelection, onSelectFromLibrary, label = "Reference Assets" }: AssetUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAdd(e.target.files);
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/70 uppercase tracking-wider">{label}</label>
                <div className="flex items-center gap-2">
                    {onSelectFromLibrary && (
                        <button
                            onClick={onSelectFromLibrary}
                            className="text-xs flex items-center gap-1 text-white/50 hover:text-white transition-colors"
                        >
                            <FolderOpen className="h-3 w-3" />
                            Library
                        </button>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <Upload className="h-3 w-3" />
                        Upload
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                />
            </div>

            <div className="grid grid-cols-4 gap-2">
                {assets.map((asset) => (
                    <div
                        key={asset.id}
                        className={`relative aspect-square rounded-lg overflow-hidden group border transition-all cursor-pointer ${asset.selected ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-white/10 hover:border-white/30'
                            }`}
                        onClick={() => onToggleSelection(asset.id)}
                    >
                        <img src={asset.base64} alt="Asset" className="w-full h-full object-cover" />

                        {/* Selection Indicator */}
                        {asset.selected && (
                            <div className="absolute top-1 right-1 bg-indigo-500 rounded-full p-0.5">
                                <Check className="h-2 w-2 text-white" />
                            </div>
                        )}

                        {/* Remove Button (Hover) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(asset.id);
                            }}
                            className="absolute top-1 left-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                        >
                            <X className="h-3 w-3 text-white" />
                        </button>
                    </div>
                ))}

                {/* Empty Placeholder */}
                {assets.length === 0 && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="col-span-4 aspect-[4/1] rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-white/30 hover:bg-white/5 hover:border-white/40 transition-all cursor-pointer"
                    >
                        <ImageIcon className="h-5 w-5 mb-1" />
                        <span className="text-xs">Drop or click to upload</span>
                    </div>
                )}
            </div>
        </div>
    );
}
