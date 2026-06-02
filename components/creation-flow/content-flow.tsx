import React, { useState } from 'react';
import { Sparkles, Video, Image as ImageIcon, Maximize2, X, ChevronDown } from 'lucide-react';
import { AssetUploader } from './asset-uploader';
import { GenerationPanel } from './generation-panel';
import { geminiService } from '../../lib/geminiService';
import { db, type GeneratedAsset, type ProjectAsset } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { AssetSelectorModal } from './asset-selector-modal';
import { PresetManager } from './preset-manager';
import { type InputState } from '../../lib/db';

interface Asset {
    id: string;
    type: string;
    base64: string;
    selected?: boolean;
}

export default function ContentFlow({ onClose, projectId, onNavigateToAssets }: { onClose?: () => void, projectId?: string, onNavigateToAssets?: () => void }) {
    const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
    const [generationMode, setGenerationMode] = useState<'prompt' | 'direct'>('prompt');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [selectedModel, setSelectedModel] = useState('Gemini 3 Pro Image (Nano-Banana Pro)');
    const [error, setError] = useState<string | null>(null);

    // Live Project Data
    const project = useLiveQuery(
        () => (projectId ? db.projects.get(projectId) : undefined),
        [projectId]
    );

    // Inputs
    const [sceneScript, setSceneScript] = useState("");
    const [characterDetails, setCharacterDetails] = useState("");
    const [actionDetails, setActionDetails] = useState(""); // Not used in UI? Removing or keeping as hidden state? It was in refinePrompt inputs.
    const [visualStyle, setVisualStyle] = useState("");

    // Video Generation State
    const [videoTask, setVideoTask] = useState<'text-to-video' | 'image-to-video' | 'reference-to-video'>('text-to-video');
    const [generateAudio, setGenerateAudio] = useState(false);
    const [videoDuration, setVideoDuration] = useState("6");
    const [videoResolution, setVideoResolution] = useState("1280x720");
    const [videoFps, setVideoFps] = useState("24");

    // Split Assets State
    const [locationAssets, setLocationAssets] = useState<Asset[]>([]);
    const [characterAssets, setCharacterAssets] = useState<Asset[]>([]);
    const [styleAssets, setStyleAssets] = useState<Asset[]>([]);

    // Video Specific Assets
    const [startFrame, setStartFrame] = useState<Asset[]>([]);
    const [endFrame, setEndFrame] = useState<Asset[]>([]);
    const [subjectReference, setSubjectReference] = useState<Asset[]>([]);

    // Selector Modal State
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [selectorTarget, setSelectorTarget] = useState<'location' | 'character' | 'style' | 'startFrame' | 'endFrame' | 'subjectReference' | null>(null);

    // Generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentResult, setCurrentResult] = useState<GeneratedAsset | null>(null);

    // --- Effects ---
    // Auto-switch model when tab changes to prevent using Image model for Video task
    React.useEffect(() => {
        if (activeTab === 'video') {
            if (!selectedModel.includes('veo')) {
                setSelectedModel('veo-3.1-generate-preview');
            }
        } else {
            if (selectedModel.includes('veo')) {
                setSelectedModel('Gemini 3 Pro Image (Nano-Banana Pro)');
            }
        }
    }, [activeTab]);

    // Enforce Model Constraints (Veo Specifics)
    React.useEffect(() => {
        if (activeTab !== 'video') return;

        // Veo 3.0 only supports 8 seconds
        if (selectedModel.includes('veo-3.0') && videoDuration !== '8') {
            setVideoDuration('8');
        }

        // Veo 2.0 does not support audio
        if (selectedModel.includes('veo-2.0') && generateAudio) {
            setGenerateAudio(false);
        }

        // Veo 3.1: 1080p is only available for 8s duration (per docs)
        if (selectedModel.includes('veo-3.1') && videoResolution === '1920x1080' && videoDuration !== '8') {
            // If user selected 4s/6s, force 720p
            setVideoResolution('1280x720');
        }

    }, [selectedModel, videoDuration, activeTab, generateAudio, videoResolution]);


    // --- Asset Handling Helpers ---

    const handleAssetUpload = async (files: FileList, target: 'location' | 'character' | 'style' | 'startFrame' | 'endFrame' | 'subjectReference') => {
        const newAssets = await Promise.all(Array.from(files).map(async (file) => {
            return new Promise<Asset>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        id: Math.random().toString(36).substr(2, 9),
                        type: file.type.startsWith('video') ? 'video' : 'image',
                        base64: reader.result as string,
                        selected: true // Auto-select uploaded
                    });
                };
                reader.readAsDataURL(file);
            });
        }));

        if (target === 'location') setLocationAssets(prev => [...prev, ...newAssets]);
        if (target === 'character') setCharacterAssets(prev => [...prev, ...newAssets]);
        if (target === 'style') setStyleAssets(prev => [...prev, ...newAssets]);

        // Video specific (limits handled in UI but good to enforce here if needed, keeping simple for now)
        if (target === 'startFrame') setStartFrame(prev => [...prev, ...newAssets].slice(0, 1));
        if (target === 'endFrame') setEndFrame(prev => [...prev, ...newAssets].slice(0, 1));
        if (target === 'subjectReference') setSubjectReference(prev => [...prev, ...newAssets].slice(0, 3));
    };

    const handleAssetRemove = (id: string, target: 'location' | 'character' | 'style' | 'startFrame' | 'endFrame' | 'subjectReference') => {
        if (target === 'location') setLocationAssets(prev => prev.filter(a => a.id !== id));
        if (target === 'character') setCharacterAssets(prev => prev.filter(a => a.id !== id));
        if (target === 'style') setStyleAssets(prev => prev.filter(a => a.id !== id));
        if (target === 'startFrame') setStartFrame(prev => prev.filter(a => a.id !== id));
        if (target === 'endFrame') setEndFrame(prev => prev.filter(a => a.id !== id));
        if (target === 'subjectReference') setSubjectReference(prev => prev.filter(a => a.id !== id));
    };

    const handleAssetToggle = (id: string, target: 'location' | 'character' | 'style') => {
        const toggler = (prev: Asset[]) => prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a);
        if (target === 'location') setLocationAssets(toggler);
        if (target === 'character') setCharacterAssets(toggler);
        if (target === 'style') setStyleAssets(toggler);
    };

    const openSelector = (target: 'location' | 'character' | 'style' | 'startFrame' | 'endFrame' | 'subjectReference') => {
        setSelectorTarget(target);
        setIsSelectorOpen(true);
    };

    const handleLibrarySelect = async (projectAsset: ProjectAsset) => {
        if (!selectorTarget) return;

        // Fetch blob/base64 from URL if possible, or just use URL as base64 placeholder if it's a data URI
        // For project assets that are blobs/urls, we might need to fetch them to pass to Gemini as inline data.
        // If it's a blob URL (created with URL.createObjectURL), we can fetch it.
        // If it's a remote URL, we might need to proxy or use as is if Gemini supports it (Gemini Node SDK usually wants base64).

        try {
            let base64 = "";
            if (projectAsset.url.startsWith("data:")) {
                base64 = projectAsset.url;
            } else {
                // Try to fetch blob
                const response = await fetch(projectAsset.url);
                const blob = await response.blob();
                base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }

            const newAsset: Asset = {
                id: projectAsset.id, // Reuse ID? Or new ID? Reuse allows tracking.
                type: projectAsset.type,
                base64: base64,
                selected: true
            };

            if (selectorTarget === 'location') setLocationAssets(prev => [...prev, newAsset]);
            if (selectorTarget === 'character') setCharacterAssets(prev => [...prev, newAsset]);
            if (selectorTarget === 'style') setStyleAssets(prev => [...prev, newAsset]);

        } catch (e) {
            console.error("Failed to load project asset:", e);
            setError("Failed to load selected asset.");
        }
    };

    // --- State Management Helpers ---

    const getCurrentInputState = (): InputState => {
        return {
            sceneScript,
            characterDetails,
            visualStyle,
            locationAssets: locationAssets.map(a => ({ id: a.id, base64: a.base64, type: a.type, selected: a.selected })),
            characterAssets: characterAssets.map(a => ({ id: a.id, base64: a.base64, type: a.type, selected: a.selected })),
            styleAssets: styleAssets.map(a => ({ id: a.id, base64: a.base64, type: a.type, selected: a.selected })),
            generationMode,
            aspectRatio,
            selectedModel,
            activeTab,
            videoTask,
            generateAudio,
            startFrame: startFrame.map(a => ({ id: a.id, base64: a.base64, type: a.type, selected: a.selected })),
            endFrame: endFrame.map(a => ({ id: a.id, base64: a.base64, type: a.type, selected: a.selected })),
            subjectReference: subjectReference.map(a => ({ id: a.id, base64: a.base64, type: a.type, selected: a.selected }))
        };
    };

    const loadInputState = (inputs: InputState) => {
        setSceneScript(inputs.sceneScript);
        setCharacterDetails(inputs.characterDetails);
        setVisualStyle(inputs.visualStyle);
        // Map explicitly to Asset type (ensure selected is boolean)
        setLocationAssets(inputs.locationAssets.map(a => ({ ...a, selected: a.selected ?? true })));
        setCharacterAssets(inputs.characterAssets.map(a => ({ ...a, selected: a.selected ?? true })));
        setStyleAssets(inputs.styleAssets.map(a => ({ ...a, selected: a.selected ?? true })));

        setGenerationMode(inputs.generationMode);
        setAspectRatio(inputs.aspectRatio);
        setSelectedModel(inputs.selectedModel);
        setActiveTab(inputs.activeTab);

        if (inputs.videoTask) setVideoTask(inputs.videoTask);
        setGenerateAudio(inputs.generateAudio || false);
        if (inputs.startFrame) setStartFrame(inputs.startFrame.map(a => ({ ...a, selected: true }))); // Always select recalled inputs
        if (inputs.endFrame) setEndFrame(inputs.endFrame.map(a => ({ ...a, selected: true })));
        if (inputs.subjectReference) setSubjectReference(inputs.subjectReference.map(a => ({ ...a, selected: true })));
    };

    const handleHistorySelect = (item: GeneratedAsset) => {
        setCurrentResult(item);
        if (item.inputs) {
            loadInputState(item.inputs);
        }
    };


    // --- Generation Handler ---

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            let technical_prompt = "";
            let url = "";

            if (activeTab === 'video') {
                // --- VIDEO GENERATION LOGIC ---
                const parts: any[] = [];
                let promptText = sceneScript;

                // 1. Text Prompt
                parts.push({ text: promptText });

                // 2. Task Specific Assets
                if (videoTask === 'image-to-video') {
                    if (startFrame[0]) {
                        const base64Data = startFrame[0].base64.split(',')[1];
                        const mimeType = startFrame[0].base64.match(/data:([^;]+);/)?.[1] || "image/jpeg";
                        parts.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        });
                        // Note: Real Veo API might expect specific labeling for start/end frames, 
                        // but we'll pack them in order for now or use specific keys if service updated.
                        // For now assuming the service will handle the parts.
                    }
                    if (endFrame[0]) {
                        const base64Data = endFrame[0].base64.split(',')[1];
                        const mimeType = endFrame[0].base64.match(/data:([^;]+);/)?.[1] || "image/jpeg";
                        parts.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        });
                    }
                } else if (videoTask === 'reference-to-video') {
                    subjectReference.forEach(ref => {
                        const base64Data = ref.base64.split(',')[1];
                        const mimeType = ref.base64.match(/data:([^;]+);/)?.[1] || "image/jpeg";
                        parts.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        });
                    });
                }

                technical_prompt = promptText;

                url = await geminiService.generateMedia({
                    type: 'video',
                    prompt: technical_prompt,
                    contentParts: parts,
                    aspectRatio,
                    model: selectedModel,
                    videoConfig: {
                        durationSeconds: videoDuration,
                        resolution: videoResolution,
                        fps: videoFps,
                        withAudio: generateAudio
                    }
                });

            } else if (generationMode === 'direct') {
                // DIRECT MODE: Bundle raw inputs
                const parts: any[] = [];

                // Add Text Inputs
                let combinedText = "Generate an image based on these inputs:\n";
                if (sceneScript) combinedText += `Scene & Location: ${sceneScript}\n`;
                if (characterDetails) combinedText += `Characters: ${characterDetails}\n`;
                if (visualStyle) combinedText += `Visual Style: ${visualStyle}\n`;
                parts.push({ text: combinedText });

                // Add Selected Assets
                const allSelected = [...locationAssets, ...characterAssets, ...styleAssets].filter(a => a.selected);
                allSelected.forEach(asset => {
                    const mimeType = asset.base64.match(/data:([^;]+);/)?.[1] || "image/jpeg";
                    const base64Data = asset.base64.split(',')[1];
                    parts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    });
                });

                technical_prompt = combinedText; // Use raw text as prompt for history

                url = await geminiService.generateMedia({
                    type: 'image',
                    prompt: combinedText, // Fallback/Log
                    contentParts: parts,
                    aspectRatio,
                    model: selectedModel
                });

            } else {
                // PROMPT MODE: Analyze -> Refine -> Generate (Existing Logic)

                const locationSelected = locationAssets.filter(a => a.selected);
                const characterSelected = characterAssets.filter(a => a.selected);
                const styleSelected = styleAssets.filter(a => a.selected);

                // Helper to analyze and prefix
                const analyzeAndPrefix = async (assets: Asset[], prefix: string) => {
                    if (assets.length === 0) return [];
                    const analysis = await geminiService.analyzeImageAssets(assets);
                    return analysis.map(a => `${prefix}: ${a.description}`);
                };

                const [locDescs, charDescs, styleDescs] = await Promise.all([
                    analyzeAndPrefix(locationSelected, "Location Reference"),
                    analyzeAndPrefix(characterSelected, "Character Reference"),
                    analyzeAndPrefix(styleSelected, "Style Reference")
                ]);

                const allAssetDescriptions = [...locDescs, ...charDescs, ...styleDescs];

                // Refine Prompt
                const refined = await geminiService.refinePromptForGeneration({
                    script: sceneScript,
                    characterDetails,
                    actionCamera: actionDetails,
                    visualStyle,
                    assetDescriptions: allAssetDescriptions
                });
                technical_prompt = refined.technical_prompt;

                // Generate
                url = await geminiService.generateMedia({
                    type: 'image',
                    prompt: technical_prompt,
                    aspectRatio,
                    model: selectedModel
                });
            }

            // 5. Update State & DB
            const inputSnapshot = getCurrentInputState();

            const result: GeneratedAsset = {
                id: Date.now().toString(),
                type: activeTab,
                url,
                prompt: technical_prompt,
                timestamp: new Date(),
                model: selectedModel,
                inputs: inputSnapshot
            };

            if (projectId) {
                db.transaction('rw', db.projects, async () => {
                    const proj = await db.projects.get(projectId);
                    if (proj) {
                        const history = proj.generationHistory || [];
                        await db.projects.update(projectId, { generationHistory: [...history, result] });
                    }
                });
            }

            setCurrentResult(result);

        } catch (error: any) {
            console.error("Generation failed:", error);
            setError(error.message || "Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefine = async (feedback: string) => {
        setIsGenerating(true);
        setError(null);
        try {
            const sourceImage = currentResult?.url;
            const refinementPrompt = feedback;

            const url = await geminiService.generateMedia({
                type: activeTab,
                prompt: refinementPrompt,
                aspectRatio,
                model: selectedModel,
                sourceImage: sourceImage
            });

            const result: GeneratedAsset = {
                id: Date.now().toString(),
                type: activeTab,
                url,
                prompt: `Refined: "${feedback}"`,
                timestamp: new Date(),
                model: selectedModel,
                inputs: getCurrentInputState() // Save current state for refinement too
            };

            if (projectId) {
                db.transaction('rw', db.projects, async () => {
                    const proj = await db.projects.get(projectId);
                    if (proj) {
                        const history = proj.generationHistory || [];
                        await db.projects.update(projectId, { generationHistory: [...history, result] });
                    }
                });
            }

            setCurrentResult(result);
        } catch (error: any) {
            console.error("Refinement failed:", error);
            setError(error.message || "Refinement failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (item: GeneratedAsset) => {
        if (!projectId) return false;

        try {
            const newAsset: ProjectAsset = {
                id: `asset_${Date.now()}`,
                name: `Generated ${item.type} - ${new Date().toLocaleTimeString()}`,
                type: item.type === 'video' ? 'video' : 'image',
                url: item.url,
                size: "1.2 MB", // Placeholder
                dateAdded: new Date().toISOString().split("T")[0],
                folderId: "root",
                prompt: item.prompt,
                model: item.model,
                source: "generated",
                generationId: item.id,
                tags: ["ContentFlow Generated"]
            };

            await db.transaction('rw', db.projects, async () => {
                const proj = await db.projects.get(projectId);
                if (proj) {
                    const currentAssets = proj.assets || [];
                    await db.projects.update(projectId, { assets: [...currentAssets, newAsset] });
                }
            });
            return true;
        } catch (e) {
            console.error("Failed to save asset:", e);
            return false;
        }
    };

    const handleDelete = async (item: GeneratedAsset) => {
        if (!projectId) return;

        try {
            await db.transaction('rw', db.projects, async () => {
                const proj = await db.projects.get(projectId);
                if (proj) {
                    const history = proj.generationHistory || [];
                    const updatedHistory = history.filter(h => h.id !== item.id);
                    await db.projects.update(projectId, { generationHistory: updatedHistory });
                }
            });

            if (currentResult?.id === item.id) {
                setCurrentResult(null);
            }
        } catch (e) {
            console.error("Failed to delete asset:", e);
        }
    };

    return (
        <div className="flex flex-col h-full text-white relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-xl rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/20">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg">Content Flow</h2>
                        <p className="text-white/50 text-xs">Context-Aware Media Generator</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">


                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <X className="h-5 w-5 text-white/70" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT INPUT PANEL */}
                <div className="w-[400px] flex flex-col border-r border-white/10 bg-black/20 overflow-y-auto custom-scrollbar">

                    <div className="p-4 space-y-6 pb-24">

                        {/* Preset Manager */}
                        <PresetManager
                            projectId={projectId}
                            currentInputs={getCurrentInputState()}
                            onLoadPreset={loadInputState}
                        />

                        {/* ==================== IMAGE MODE INPUTS ==================== */}
                        {activeTab === 'image' && (
                            <>
                                {/* Scene Context */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-white/90">Scene & Location</h3>
                                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/50">Context</span>
                                    </div>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[80px]"
                                        placeholder="Describe the scene setting, time of day, and location details..."
                                        value={sceneScript}
                                        onChange={(e) => setSceneScript(e.target.value)}
                                    />
                                    <AssetUploader
                                        assets={locationAssets}
                                        onAdd={(f) => handleAssetUpload(f, 'location')}
                                        onRemove={(id) => handleAssetRemove(id, 'location')}
                                        onToggleSelection={(id) => handleAssetToggle(id, 'location')}
                                        onSelectFromLibrary={() => openSelector('location')}
                                        label="Location Refs"
                                    />
                                </div>

                                <div className="h-px bg-white/5" />

                                {/* Character Context */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-white/90">Characters</h3>
                                    </div>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[80px]"
                                        placeholder="Character descriptions, clothing, emotions..."
                                        value={characterDetails}
                                        onChange={(e) => setCharacterDetails(e.target.value)}
                                    />
                                    <AssetUploader
                                        assets={characterAssets}
                                        onAdd={(f) => handleAssetUpload(f, 'character')}
                                        onRemove={(id) => handleAssetRemove(id, 'character')}
                                        onToggleSelection={(id) => handleAssetToggle(id, 'character')}
                                        onSelectFromLibrary={() => openSelector('character')}
                                        label="Character Refs"
                                    />
                                </div>
                                <div className="h-px bg-white/5" />

                                {/* Visual Style */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-white/90">Visual Style</h3>
                                    </div>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[60px]"
                                        placeholder="Cinematic style, lens type, color grading..."
                                        value={visualStyle}
                                        onChange={(e) => setVisualStyle(e.target.value)}
                                    />
                                    <AssetUploader
                                        assets={styleAssets}
                                        onAdd={(f) => handleAssetUpload(f, 'style')}
                                        onRemove={(id) => handleAssetRemove(id, 'style')}
                                        onToggleSelection={(id) => handleAssetToggle(id, 'style')}
                                        onSelectFromLibrary={() => openSelector('style')}
                                        label="Style Refs"
                                    />
                                </div>
                            </>
                        )}


                        {/* ==================== VIDEO MODE INPUTS ==================== */}
                        {activeTab === 'video' && (
                            <div className="space-y-6">
                                {/* Task Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/70 uppercase">Video Task</label>
                                    <select
                                        value={videoTask}
                                        onChange={(e) => setVideoTask(e.target.value as any)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="text-to-video">Text-to-Video</option>
                                        <option value="image-to-video">Image-to-Video</option>
                                        <option value="reference-to-video">Reference-to-Video (Subject)</option>
                                    </select>
                                </div>

                                {/* Common Prompt Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/70 uppercase">Prompt</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[100px]"
                                        placeholder="Describe the video you want to generate..."
                                        value={sceneScript} // Reusing sceneScript as the main prompt for video
                                        onChange={(e) => setSceneScript(e.target.value)}
                                    />
                                </div>

                                {/* Image-to-Video Specifics */}
                                {videoTask === 'image-to-video' && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-3">
                                            <h3 className="text-sm font-semibold text-white/90">Input Images</h3>

                                            <div className="space-y-2">
                                                <label className="text-xs text-white/50">Start Frame (Required)</label>
                                                <AssetUploader
                                                    assets={startFrame}
                                                    onAdd={(f) => handleAssetUpload(f, 'startFrame')}
                                                    onRemove={(id) => handleAssetRemove(id, 'startFrame')}
                                                    onToggleSelection={(id) => { }} // No toggle needed for single/required
                                                    onSelectFromLibrary={() => openSelector('startFrame')}
                                                    label="Upload Start Frame"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-white/50">End Frame (Optional)</label>
                                                <AssetUploader
                                                    assets={endFrame}
                                                    onAdd={(f) => handleAssetUpload(f, 'endFrame')}
                                                    onRemove={(id) => handleAssetRemove(id, 'endFrame')}
                                                    onToggleSelection={(id) => { }}
                                                    onSelectFromLibrary={() => openSelector('endFrame')}
                                                    label="Upload End Frame"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Reference-to-Video Specifics */}
                                {videoTask === 'reference-to-video' && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-3">
                                            <h3 className="text-sm font-semibold text-white/90">Subject Reference</h3>
                                            <p className="text-xs text-white/40">Upload images of the subject you want to animate (Max 3)</p>

                                            <AssetUploader
                                                assets={subjectReference}
                                                onAdd={(f) => handleAssetUpload(f, 'subjectReference')}
                                                onRemove={(id) => handleAssetRemove(id, 'subjectReference')}
                                                onToggleSelection={(id) => { }}
                                                onSelectFromLibrary={() => openSelector('subjectReference')}
                                                label="Upload Subject"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 p-4 border-t border-white/10 bg-black/40 backdrop-blur-xl z-10 space-y-4">

                        {/* Mode Switcher */}
                        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                            <button
                                onClick={() => setActiveTab('image')}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'image' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                            >
                                <ImageIcon className="h-3.5 w-3.5" />
                                Image Generation
                            </button>
                            <button
                                onClick={() => setActiveTab('video')}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'video' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                            >
                                <Video className="h-3.5 w-3.5" />
                                Video Generation
                            </button>
                        </div>


                        <div className="flex gap-2">
                            {/* Image Mode Options */}
                            {activeTab === 'image' && (
                                <select
                                    value={generationMode}
                                    onChange={(e) => setGenerationMode(e.target.value as 'prompt' | 'direct')}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none flex-1"
                                >
                                    <option value="prompt">Prompt Mode (Smart)</option>
                                    <option value="direct">Direct Mode (Raw)</option>
                                </select>
                            )}



                            {/* Video Mode Options */}
                            {activeTab === 'video' && (
                                <>
                                    {/* Audio Toggle */}
                                    <button
                                        onClick={() => setGenerateAudio(!generateAudio)}
                                        disabled={selectedModel.includes('veo-2.0')}
                                        className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${selectedModel.includes('veo-2.0')
                                            ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-white/30'
                                            : generateAudio
                                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                                : 'bg-white/5 border-white/10 text-white/50'
                                            }`}
                                        title={selectedModel.includes('veo-2.0') ? "Not available for Veo 2.0" : "Generate Audio"}
                                    >
                                        <Sparkles className="h-3 w-3" />
                                        Audio
                                    </button>

                                    {/* Duration Selector */}
                                    <select
                                        value={videoDuration}
                                        onChange={(e) => setVideoDuration(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-xs text-white focus:outline-none flex-1"
                                    >
                                        <option value="4" disabled={selectedModel.includes('veo-3.0')}>4 Seconds</option>
                                        <option value="6" disabled={selectedModel.includes('veo-3.0')}>6 Seconds</option>
                                        <option value="8">8 Seconds</option>
                                    </select>

                                    {/* Resolution Selector */}
                                    <select
                                        value={videoResolution}
                                        onChange={(e) => setVideoResolution(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-xs text-white focus:outline-none flex-1"
                                    >
                                        <option value="1280x720">720p HD</option>
                                        <option
                                            value="1920x1080"
                                            disabled={
                                                selectedModel.includes('veo-2.0') ||
                                                (selectedModel.includes('veo-3.1') && videoDuration !== '8')
                                            }
                                        >
                                            1080p FHD {selectedModel.includes('veo-3.1') && videoDuration !== '8' ? '(Requires 8s)' : ''}
                                        </option>
                                    </select>
                                </>
                            )}

                            <select
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none flex-1"
                            >
                                <option value="16:9">16:9 Cinematic</option>
                                <option value="9:16">9:16 Social</option>
                                <option value="4:3">4:3 Analog</option>
                                <option value="1:1">1:1 Square</option>
                            </select>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Sparkles className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Generate {activeTab === 'image' ? 'Image' : 'Video'}
                                </>
                            )}
                        </button>

                        <div className="flex items-center gap-2 text-[10px] text-white/40 px-1">
                            <span>Model:</span>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="bg-transparent border-none text-white/60 hover:text-white focus:outline-none cursor-pointer max-w-[200px]"
                            >
                                {activeTab === 'image' ? (
                                    <>
                                        <option value="Gemini 3 Pro Image (Nano-Banana Pro)">Gemini 3 Pro Image (Nano-Banana Pro)</option>
                                        <option value="Gemini 2.5 Flash Image">Gemini 2.5 Flash Image</option>
                                        <option value="Gemini 2.0 Flash Exp">Gemini 2.0 Flash Exp</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="veo-3.1-generate-preview">Veo 3.1 Preview</option>
                                        <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast Preview</option>
                                        <option value="veo-3.0-generate-001">Veo 3.0 Generate</option>
                                        <option value="veo-3.0-fast-generate-001">Veo 3.0 Fast Generate</option>
                                        <option value="veo-2.0-generate-001">Veo 2.0 Generate</option>
                                    </>
                                )}
                            </select>
                            <span className="ml-auto">Cost: ~0.0{activeTab === 'image' ? '4' : '8'} Credits</span>
                        </div>
                    </div>

                </div>

                {/* RIGHT OUTPUT PANEL */}
                <div className="flex-1 p-6 bg-black/10 min-w-0">
                    <GenerationPanel
                        isLoading={isGenerating}
                        currentResult={currentResult}
                        history={project?.generationHistory || []}
                        onRefine={handleRefine}
                        onSelectHistory={handleHistorySelect}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        onNavigateToAssets={onNavigateToAssets}
                        selectedModel={selectedModel}
                        error={error}
                        generationType={activeTab}
                    />
                </div>

            </div>

            {/* Modals */}
            <AssetSelectorModal
                isOpen={isSelectorOpen}
                onClose={() => setIsSelectorOpen(false)}
                onSelect={handleLibrarySelect}
                projectId={projectId}
                acceptedTypes={['image']}
            />
        </div>
    );
}
