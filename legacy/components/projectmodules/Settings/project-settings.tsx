"use client"

import { useState, useRef, useEffect } from "react"
import {
    Settings,
    Image as ImageIcon,
    Type,
    Calendar,
    DollarSign,
    Users,
    Upload,
    Check,
    RotateCcw,
    Save,
    LayoutTemplate,
    Eye,
    EyeOff
} from "lucide-react"

import { type Project } from "../../../lib/db"

interface ProjectSettingsProps {
    currentProject: Project | null
    onUpdateProject?: (project: Project, updates: Partial<Project>) => void
    onOpenContentFlow?: () => void
}

interface BackgroundOption {
    id: string
    name: string
    type: "image" | "gradient" | "color"
    value: string
    thumbnail: string
    isCustom?: boolean
}

export default function ProjectSettings({ currentProject, onUpdateProject, onOpenContentFlow }: ProjectSettingsProps) {
    const [activeTab, setActiveTab] = useState<"general" | "background" | "team" | "display">("general")

    // General Tab State
    const [projectTitle, setProjectTitle] = useState(currentProject?.title || "")
    const [projectGenre, setProjectGenre] = useState(currentProject?.genre || "")
    const [projectStatus, setProjectStatus] = useState(currentProject?.status || "development")
    const [platformType, setPlatformType] = useState<Project['platformType']>(currentProject?.platformType || "film")
    const [summary, setSummary] = useState(currentProject?.summary || "")
    const [estimatedBudget, setEstimatedBudget] = useState(currentProject?.estimatedBudget?.toString() || "")

    // Team Tab State
    const [writer, setWriter] = useState(currentProject?.writer || "")
    const [director, setDirector] = useState(currentProject?.director || "")
    const [dop, setDop] = useState(currentProject?.dop || "")
    const [editor, setEditor] = useState(currentProject?.editor || "")
    const [agency, setAgency] = useState(currentProject?.agency || "")
    const [productionCompany, setProductionCompany] = useState(currentProject?.productionCompany || "")
    const [producer, setProducer] = useState(currentProject?.producer || "")
    const [executiveProducer, setExecutiveProducer] = useState(currentProject?.executiveProducer || "")

    // Background/Display State
    const [selectedBackground, setSelectedBackground] = useState<string>("default")
    // Module Visibility State
    const [moduleVisibility, setModuleVisibility] = useState<Record<string, boolean>>(currentProject?.moduleVisibility || {})

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (currentProject) {
            // General
            setProjectTitle(currentProject.title || "")
            setProjectGenre(currentProject.genre || "")
            setProjectStatus(currentProject.status || "development")
            setPlatformType(currentProject.platformType || "film")
            setSummary(currentProject.summary || "")
            setEstimatedBudget(currentProject.estimatedBudget?.toString() || "")

            // Team
            setWriter(currentProject.writer || "")
            setDirector(currentProject.director || "")
            setDop(currentProject.dop || "")
            setEditor(currentProject.editor || "")
            setAgency(currentProject.agency || "")
            setProductionCompany(currentProject.productionCompany || "")
            setProducer(currentProject.producer || "")
            setExecutiveProducer(currentProject.executiveProducer || "")

            // Display
            setModuleVisibility(currentProject.moduleVisibility || {})
            // Try to match current background to an option ID if possible, otherwise just keep as is or default logic
        }
    }, [currentProject])

    // Background options (4 images, 4 gradients)
    const backgroundOptions: BackgroundOption[] = [
        // Images
        {
            id: "cinema",
            name: "Cinema Hall",
            type: "image",
            value: "/backgrounds/cinema-hall.jpg",
            thumbnail: "/backgrounds/cinema-hall.jpg",
        },
        {
            id: "mountain",
            name: "Mountain Peaks",
            type: "image",
            value: "/backgrounds/mountain-peaks.jpg",
            thumbnail: "/backgrounds/mountain-peaks.jpg",
        },
        {
            id: "abstract-neon",
            name: "Abstract Neon",
            type: "image",
            value: "/backgrounds/abstract-neon.jpg",
            thumbnail: "/backgrounds/abstract-neon.jpg",
        },
        {
            id: "noir-city",
            name: "Noir City",
            type: "image",
            value: "/backgrounds/noir-city.jpg",
            thumbnail: "/backgrounds/noir-city.jpg",
        },
        // Gradients
        {
            id: "minimal-gradient",
            name: "Deep Ocean",
            type: "gradient",
            value: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
            thumbnail: "",
            isCustom: false
        },
        {
            id: "sunset-vibes",
            name: "Sunset Vibes",
            type: "gradient",
            value: "linear-gradient(to right, #ff5f6d, #ffc371)",
            thumbnail: "",
            isCustom: false
        },
        {
            id: "northern-lights",
            name: "Northern Lights",
            type: "gradient",
            value: "linear-gradient(to right, #00c6ff, #0072ff)",
            thumbnail: "",
            isCustom: false
        },
        {
            id: "midnight-city",
            name: "Midnight City",
            type: "gradient",
            value: "linear-gradient(to right, #232526, #414345)",
            thumbnail: "",
            isCustom: false
        },
    ]

    const handleSaveGeneral = () => {
        if (onUpdateProject && currentProject) {
            onUpdateProject(currentProject, {
                title: projectTitle,
                genre: projectGenre,
                status: projectStatus,
                platformType,
                summary,
                estimatedBudget: parseFloat(estimatedBudget) || 0
            })
        }
    }

    const handleSaveTeam = () => {
        if (onUpdateProject && currentProject) {
            onUpdateProject(currentProject, {
                writer,
                director,
                dop,
                editor,
                agency,
                productionCompany,
                producer,
                executiveProducer
            })
        }
    }

    const handleBackgroundChange = (bg: BackgroundOption) => {
        setSelectedBackground(bg.id)
        if (onUpdateProject && currentProject) {
            onUpdateProject(currentProject, {
                backgroundImage: bg.type === "image" ? bg.value : undefined,
                backgroundColor: bg.type !== "image" ? bg.value : undefined,
                backgroundType: bg.type
            })
        }
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const result = e.target?.result as string
                if (result && onUpdateProject && currentProject) {
                    onUpdateProject(currentProject, {
                        backgroundImage: result,
                        backgroundType: "image"
                    })
                    setSelectedBackground("custom-upload")
                }
            }
            reader.readAsDataURL(file)
        }
    }

    const handleGenerateClick = () => {
        // Trigger ContentFlow via prop
        if (onOpenContentFlow) {
            onOpenContentFlow()
        }
    }

    const handleToggleModule = (moduleId: string) => {
        if (onUpdateProject && currentProject) {
            const newVisibility = {
                ...moduleVisibility,
                [moduleId]: moduleVisibility[moduleId] === undefined ? false : !moduleVisibility[moduleId]
            }
            setModuleVisibility(newVisibility)
            onUpdateProject(currentProject, {
                moduleVisibility: newVisibility
            })
        }
    }

    const renderGeneralSettings = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Project Details</h3>
                <div className="space-y-4 max-w-xl">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Project Title</label>
                            <input
                                type="text"
                                value={projectTitle}
                                onChange={(e) => setProjectTitle(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Status</label>
                            <select
                                value={projectStatus}
                                onChange={(e) => setProjectStatus(e.target.value as Project['status'])}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="development">Development</option>
                                <option value="pre-production">Pre-Production</option>
                                <option value="production">Production</option>
                                <option value="post-production">Post-Production</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Platform Type</label>
                            <select
                                value={platformType}
                                onChange={(e) => setPlatformType(e.target.value as any)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="film">Film</option>
                                <option value="tv">TV Series</option>
                                <option value="commercial">Commercial</option>
                                <option value="web">Web Series</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Genre</label>
                            <input
                                type="text"
                                value={projectGenre}
                                onChange={(e) => setProjectGenre(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-white/70 text-sm mb-2">Summary</label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            rows={4}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-sm mb-2">Estimated Budget ($)</label>
                        <input
                            type="number"
                            value={estimatedBudget}
                            onChange={(e) => setEstimatedBudget(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <button
                        onClick={handleSaveGeneral}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors mt-4"
                    >
                        <Save className="h-4 w-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )

    const renderTeamSettings = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Team Details</h3>
                <div className="space-y-4 max-w-xl">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Writer(s)</label>
                            <input
                                type="text"
                                value={writer}
                                onChange={(e) => setWriter(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                placeholder="Lastname, Firstname"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Director</label>
                            <input
                                type="text"
                                value={director}
                                onChange={(e) => setDirector(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Director of Photography</label>
                            <input
                                type="text"
                                value={dop}
                                onChange={(e) => setDop(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Editor</label>
                            <input
                                type="text"
                                value={editor}
                                onChange={(e) => setEditor(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Producer(s)</label>
                            <input
                                type="text"
                                value={producer}
                                onChange={(e) => setProducer(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Executive Producer(s)</label>
                            <input
                                type="text"
                                value={executiveProducer}
                                onChange={(e) => setExecutiveProducer(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Agency</label>
                            <input
                                type="text"
                                value={agency}
                                onChange={(e) => setAgency(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Production Company</label>
                            <input
                                type="text"
                                value={productionCompany}
                                onChange={(e) => setProductionCompany(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSaveTeam}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors mt-4"
                    >
                        <Save className="h-4 w-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )

    const renderDisplaySettings = () => {
        // List of modules to toggle (excluding project-settings)
        const modulesToToggle = [
            { id: "budget-module", name: "Budget" },
            { id: "script", name: "Script" },
            { id: "schedule", name: "Schedule" },
            { id: "storyboard", name: "Storyboard" },
            { id: "previs", name: "Previs" },
            { id: "cast", name: "Cast" },
            { id: "locations", name: "Locations" },
            { id: "gear", name: "Gear" },
            { id: "crew", name: "Crew" },
            { id: "legal", name: "Legal Docs" },
            { id: "call-sheets", name: "Call Sheets" },
            { id: "analytics", name: "Analytics" },
            { id: "user-management", name: "User Management" },
            { id: "dailies-review", name: "Dailies Review" },
            { id: "post-timeline", name: "Post Timeline" },
            { id: "dailies", name: "Dailies" },
            { id: "moodboard", name: "Moodboard" },
            { id: "audio", name: "Audio" },
            { id: "vfx", name: "VFX Pipeline" },
            { id: "assets", name: "Asset Manager" },
        ]

        return (
            <div className="space-y-8">
                {/* Compact Background Selection */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Project Background</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                        {backgroundOptions.map((bg) => (
                            <div
                                key={bg.id}
                                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-video ${selectedBackground === bg.id ? "border-blue-400" : "border-white/20 hover:border-white/40"
                                    }`}
                                onClick={() => handleBackgroundChange(bg)}
                            >
                                <div className="w-full h-full relative">
                                    {bg.type === "image" ? (
                                        <img src={bg.thumbnail || "/placeholder.svg"} alt={bg.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full" style={{ background: bg.value }}></div>
                                    )}
                                    {selectedBackground === bg.id && (
                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                            <Check className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-[10px] text-white truncate px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {bg.name}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Upload Option */}
                        <div
                            className="aspect-video border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all text-white/50 hover:text-white"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <Upload className="h-6 w-6 mb-2" />
                            <span className="text-xs">Upload</span>
                        </div>

                        {/* Generate Option */}
                        <div
                            className="aspect-video border-2 border-dashed border-blue-500/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/60 hover:bg-blue-500/10 transition-all text-blue-400"
                            onClick={handleGenerateClick}
                        >
                            <div className="relative">
                                <ImageIcon className="h-6 w-6 mb-2" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            </div>
                            <span className="text-xs text-center px-2">Generate Background</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8">
                    <h3 className="text-lg font-semibold text-white mb-4">Module Visibility</h3>
                    <p className="text-white/60 text-sm mb-6">Toggle the visibility of modules in the sidebar for this project.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {modulesToToggle.map((module) => {
                            const isVisible = moduleVisibility[module.id] !== false // Default to true
                            return (
                                <div key={module.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                                    <span className="text-white text-sm font-medium">{module.name}</span>
                                    <button
                                        onClick={() => handleToggleModule(module.id)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0f172a] ${isVisible ? 'bg-blue-600' : 'bg-gray-700'
                                            }`}
                                    >
                                        <span
                                            className={`${isVisible ? 'translate-x-6' : 'translate-x-1'
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    const tabs = [
        { id: "general", label: "General", icon: Settings },
        { id: "team", label: "Team", icon: Users },
        { id: "display", label: "Display", icon: LayoutTemplate },
        // { id: "background", label: "Background", icon: ImageIcon }, // Now part of Display
    ]

    if (!currentProject) {
        return <div className="text-white p-6">Please select a project to edit settings.</div>
    }

    return (
        <div className="flex h-full">
            {/* Project Settings Sidebar */}
            <div className="w-64 bg-white/5 border-r border-white/10 p-4 h-full">
                <h2 className="text-xl font-bold text-white mb-6">Project Settings</h2>
                <nav className="space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === tab.id ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto h-full">
                {activeTab === "general" && renderGeneralSettings()}
                {activeTab === "team" && renderTeamSettings()}
                {activeTab === "display" && renderDisplaySettings()}
            </div>
        </div>
    )
}
