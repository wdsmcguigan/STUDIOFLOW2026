import React, { useState } from 'react';
import { Save, ChevronDown, Trash2, Edit2, Play, Check, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type InputState, type Preset } from '../../lib/db';

interface PresetManagerProps {
    projectId?: string;
    currentInputs: InputState;
    onLoadPreset: (inputs: InputState) => void;
}

export function PresetManager({ projectId, currentInputs, onLoadPreset }: PresetManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newPresetName, setNewPresetName] = useState("");

    const project = useLiveQuery(
        () => (projectId ? db.projects.get(projectId) : undefined),
        [projectId]
    );

    const presets = project?.presets || [];

    const handleSave = async () => {
        if (!projectId || !newPresetName.trim()) return;

        try {
            const newPreset: Preset = {
                id: `preset_${Date.now()}`,
                name: newPresetName,
                inputs: currentInputs,
                createdAt: new Date()
            };

            await db.transaction('rw', db.projects, async () => {
                const proj = await db.projects.get(projectId);
                if (proj) {
                    const currentPresets = proj.presets || [];
                    await db.projects.update(projectId, { presets: [...currentPresets, newPreset] });
                }
            });

            setNewPresetName("");
            setIsSaving(false);
        } catch (e) {
            console.error("Failed to save preset:", e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!projectId) return;
        try {
            await db.transaction('rw', db.projects, async () => {
                const proj = await db.projects.get(projectId);
                if (proj) {
                    const updated = (proj.presets || []).filter(p => p.id !== id);
                    await db.projects.update(projectId, { presets: updated });
                }
            });
        } catch (e) {
            console.error("Failed to delete preset:", e);
        }
    };

    return (
        <div className="relative mb-4">
            {/* Header / Toggle */}
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-2">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
                >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span>Presets ({presets.length})</span>
                </button>

                <button
                    onClick={() => setIsSaving(true)}
                    className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                    <Save className="h-3 w-3" />
                    Save Current
                </button>
            </div>

            {/* Save Form */}
            {isSaving && (
                <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Preset Name..."
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                            autoFocus
                        />
                        <button
                            onClick={handleSave}
                            disabled={!newPresetName.trim()}
                            className="p-1 hover:bg-white/10 rounded text-green-400 disabled:opacity-50"
                        >
                            <Check className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setIsSaving(false)}
                            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Dropdown List */}
            {isOpen && !isSaving && presets.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-slate-900 border border-white/20 rounded-lg shadow-xl max-h-[200px] overflow-y-auto custom-scrollbar">
                    {presets.map(preset => (
                        <div key={preset.id} className="flex items-center justify-between p-2 hover:bg-white/5 border-b border-white/5 last:border-0 group">
                            <button
                                onClick={() => {
                                    onLoadPreset(preset.inputs);
                                    setIsOpen(false);
                                }}
                                className="text-left flex-1"
                            >
                                <div className="text-xs font-medium text-white group-hover:text-indigo-300 transition-colors">{preset.name}</div>
                                <div className="text-[10px] text-white/30">
                                    Saved {new Date(preset.createdAt).toLocaleDateString()}
                                </div>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(preset.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded transition-all"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
