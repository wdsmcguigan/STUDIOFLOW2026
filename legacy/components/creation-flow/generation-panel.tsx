
import React, { useState, useEffect } from 'react';
import { Download, Save, Share2, MessageSquare, Loader2, PlayCircle, History, Maximize2, Check, Trash2, ExternalLink } from 'lucide-react';
import { GenerationRequest } from '../lib/geminiService';
import LoadingIndicator from './LoadingIndicator';

interface GeneratedResult {
    id: string;
    type: 'image' | 'video';
    url: string; // or base64
    prompt: string;
    timestamp: Date | string;
}

interface GenerationPanelProps {
    isLoading: boolean;
    currentResult: GeneratedResult | null;
    history: GeneratedResult[];
    onRefine: (feedback: string) => void;
    onSelectHistory: (item: GeneratedResult) => void;
    onSave: (item: GeneratedResult) => Promise<boolean>;
    onDelete: (item: GeneratedResult) => void;
    onNavigateToAssets?: () => void;
    selectedModel?: string;
    error?: string | null;
    generationType?: 'image' | 'video';
}


export function GenerationPanel({ isLoading, currentResult, history, onRefine, onSelectHistory, onSave, onDelete, onNavigateToAssets, selectedModel = "Model", error, generationType = 'video' }: GenerationPanelProps) {
    const [refinementText, setRefinementText] = useState("");
    const [isMaximized, setIsMaximized] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    // Reset saved state when showing a new result
    useEffect(() => {
        setIsSaved(false);
        setShowSaveDialog(false);
    }, [currentResult?.id]);

    const handleRefineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (refinementText.trim()) {
            onRefine(refinementText);
            setRefinementText("");
        }
    };

    const handleSaveClick = async () => {
        if (!currentResult) return;
        const success = await onSave(currentResult);
        if (success) {
            setIsSaved(true);
            setShowSaveDialog(true);
            // Auto hide after 5 seconds if not interacted
            setTimeout(() => setShowSaveDialog(false), 5000);
        }
    };

    const handleDownload = async () => {
        if (!currentResult) return;
        try {
            const response = await fetch(currentResult.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `generated-${currentResult.type}-${Date.now()}.${currentResult.type === 'video' ? 'mp4' : 'png'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download failed:", e);
            window.open(currentResult.url, '_blank');
        }
    };

    const containerClass = isMaximized
        ? "fixed inset-0 z-[100] bg-black/95 flex flex-col p-8"
        : "flex flex-col h-full bg-black/20 rounded-xl overflow-hidden border border-white/10";

    return (
        <div className={containerClass}>
            {isMaximized && (
                <button
                    onClick={() => setIsMaximized(false)}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <Maximize2 className="h-6 w-6 transform rotate-180" />
                </button>
            )}

            {/* Main Display Area */}
            <div className={`flex-1 relative bg-black/40 flex items-center justify-center min-h-[300px] ${isMaximized ? 'h-[80vh]' : ''}`}>

                {/* Save Confirmation Dialog */}
                {showSaveDialog && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e293b] border border-green-500/30 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-green-500/20 p-2 rounded-full">
                            <Check className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm">Saved to Assets</h4>
                            <p className="text-xs text-white/50">Media is now safe in your project.</p>
                        </div>
                        {onNavigateToAssets && (
                            <button
                                onClick={onNavigateToAssets}
                                className="ml-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                                View
                                <ExternalLink className="h-3 w-3" />
                            </button>
                        )}
                        <button onClick={() => setShowSaveDialog(false)} className="ml-1 text-white/40 hover:text-white">
                            <span className="sr-only">Close</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}


                {isLoading ? (
                    <LoadingIndicator
                        title={generationType === 'image' ? "Generating Your Image" : "Generating Your Video"}
                        modelName={selectedModel}
                    />
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 text-red-400 p-6 text-center">
                        <div className="bg-red-500/10 p-4 rounded-full">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white">Generation Failed</h3>
                        <p className="text-sm text-white/60 max-w-sm font-mono bg-black/40 p-2 rounded border border-white/10 break-all">
                            {error}
                        </p>
                        <p className="text-xs text-white/40 mt-2">Check availability for: {selectedModel}</p>
                    </div>
                ) : currentResult ? (
                    <div className="relative w-full h-full group flex flex-col">
                        {/* Media Container */}
                        <div className="flex-1 relative flex items-center justify-center overflow-hidden p-8">
                            {currentResult.type === 'video' ? (
                                <video
                                    src={currentResult.url}
                                    controls
                                    autoPlay
                                    loop
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                                />
                            ) : (
                                <img
                                    src={currentResult.url}
                                    alt={currentResult.prompt}
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                                />
                            )}
                        </div>

                        {/* Overlay Actions */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                            <button
                                onClick={handleDownload}
                                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10 shadow-lg"
                                title="Download"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                            <button
                                onClick={handleSaveClick}
                                className={`p-2 rounded-lg backdrop-blur-md transition-colors border shadow-lg ${isSaved
                                    ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30'
                                    : 'bg-black/60 text-white border-white/10 hover:bg-black/80'}`}
                                title={isSaved ? "Saved" : "Save to Assets"}
                            >
                                {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                            </button>
                            <button
                                onClick={() => onDelete(currentResult)}
                                className="p-2 bg-black/60 hover:bg-red-900/80 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10 shadow-lg group/trash"
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4 group-hover/trash:text-red-400" />
                            </button>
                            <button
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10 shadow-lg"
                                title={isMaximized ? "Exit Full Screen" : "Full Screen"}
                            >
                                <Maximize2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
                            <PlayCircle className="h-8 w-8 text-white/20" />
                        </div>
                        <h3 className="text-white font-medium mb-1">Ready to Create</h3>
                        <p className="text-white/50 text-sm max-w-[200px] mx-auto">
                            Configure your inputs and click generate to see the magic happen.
                        </p>
                    </div>
                )}
            </div>

            {/* Prompt & Controls Section */}
            <div className="border-t border-white/10 bg-white/5 p-4 space-y-4">

                {/* Prompt Toggle/Display */}
                {currentResult && (
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowPrompt(!showPrompt)}
                            className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            {showPrompt ? 'Hide Prompt' : 'Show Technical Prompt'}
                        </button>
                        {showPrompt && (
                            <div className="bg-black/40 p-3 rounded-lg border border-white/10 text-xs text-white/80 animate-in fade-in slide-in-from-top-1 space-y-2">
                                <div className="flex items-center gap-2 text-[10px] text-green-400 uppercase tracking-wider font-semibold">
                                    <span>✓ Verified Generation</span>
                                    <span className="text-white/30">|</span>
                                    <span className="text-white/60">Model: {selectedModel || 'Unknown'}</span>
                                </div>
                                <p>{currentResult.prompt}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Refinement Input */}
                <form onSubmit={handleRefineSubmit} className="relative">
                    <input
                        type="text"
                        value={refinementText}
                        onChange={(e) => setRefinementText(e.target.value)}
                        placeholder="Refine result (e.g., 'Make it darker', 'Add rain')..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                        disabled={isLoading || !currentResult}
                    />
                    <button
                        type="submit"
                        disabled={!refinementText.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors"
                    >
                        <MessageSquare className="h-4 w-4" />
                    </button>
                </form>

                {/* History Carousel */}
                {history.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-xs text-white/50 uppercase tracking-wider font-medium">
                            <History className="h-3 w-3" />
                            <span>Project Generation History</span>
                            <span className="ml-auto text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                Right click to delete
                            </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide py-1 w-full max-w-full">
                            {history.slice().reverse().map((item) => (
                                <div key={item.id} className="relative group/history-item flex-shrink-0">
                                    <button
                                        onClick={() => onSelectHistory(item)}
                                        className={`relative w-16 h-16 rounded-lg overflow-hidden border transition-all ${currentResult?.id === item.id ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        {item.type === 'video' ? (
                                            <video src={item.url} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={item.url} className="w-full h-full object-cover" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                                        className="absolute -top-1 -right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/history-item:opacity-100 transition-opacity z-10"
                                        title="Delete"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper X icon for history delete
function X({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    )
}

