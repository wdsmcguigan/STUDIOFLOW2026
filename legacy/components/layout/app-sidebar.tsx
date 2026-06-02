"use client"

import { useState } from "react"
import {
    BarChart3,
    DollarSign,
    Settings,
    Folder,
    Check,
    ChevronDown,
    FileText,
    Calendar,
    Layers,
    Play,
    Users,
    MapPin,
    Camera,
    Megaphone,
    PlayCircle,
    Video,
    Image as ImageIcon,
    Mic,
    Tv
} from "lucide-react"
import { type Project } from "../../lib/db"

interface AppSidebarProps {
    collapsed: boolean
    currentView: string
    headerView: "dashboard" | "calendar" | "contacts"
    currentProject: Project | null
    projects: Project[]
    onNavigate: (view: string) => void
    onToggleCollapse: () => void
    onProjectSelect: (project: Project) => void
    onHeaderViewChange: (view: "dashboard" | "calendar" | "contacts") => void
}

export default function AppSidebar({
    collapsed,
    currentView,
    headerView,
    currentProject,
    projects,
    onNavigate,
    onToggleCollapse,
    onProjectSelect,
    onHeaderViewChange
}: AppSidebarProps) {
    const [showProjectDropdown, setShowProjectDropdown] = useState(false)

    // Helper to check visibility
    const isModuleVisible = (moduleId: string) => {
        if (!currentProject?.moduleVisibility) return true
        // Default to true if not explicitly set to false
        return currentProject.moduleVisibility[moduleId] !== false
    }

    const getModuleStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-500/0"
            case "active":
                return "bg-blue-500/0"
            case "pending":
                return "bg-yellow-500/0"
            case "blocked":
                return "bg-red-500/0"
            default:
                return "bg-gray-500/0"
        }
    }

    // Module definitions (mirrored from page.tsx for now, ideally shared config)
    const productionModules = [
        { id: "budget-module", name: "Budget", icon: DollarSign, status: "active", progress: 85, lastUpdated: "30 min ago" },
        { id: "script", name: "Script", icon: FileText, status: "active", progress: 90, lastUpdated: "2 hours ago" },
        { id: "schedule", name: "Schedule", icon: Calendar, status: "active", progress: 75, lastUpdated: "1 hour ago" },
        { id: "cast", name: "Cast", icon: Users, status: "completed", progress: 100, lastUpdated: "3 days ago" },
        { id: "crew", name: "Crew", icon: Users, status: "completed", progress: 95, lastUpdated: "1 day ago" },
        { id: "locations", name: "Locations", icon: MapPin, status: "active", progress: 80, lastUpdated: "4 hours ago" },
        { id: "gear", name: "Gear", icon: Camera, status: "active", progress: 85, lastUpdated: "6 hours ago" },
        { id: "call-sheets", name: "Call Sheets", icon: Megaphone, status: "active", progress: 90, lastUpdated: "30 min ago" },
        { id: "legal", name: "Legal Docs", icon: FileText, status: "active", progress: 85, lastUpdated: "2 hours ago" },
    ]



    const workflowModules = [
        { id: "moodboard", name: "Moodboard", icon: ImageIcon, status: "active", progress: 60, lastUpdated: "3 days ago" },
        { id: "storyboard", name: "Storyboard", icon: Layers, status: "pending", progress: 45, lastUpdated: "1 day ago" },
        { id: "previs", name: "Previs", icon: Play, status: "pending", progress: 30, lastUpdated: "2 days ago" },
        { id: "dailies-review", name: "Dailies Review", icon: PlayCircle, status: "active", progress: 70, lastUpdated: "1 hour ago" },
        { id: "dailies", name: "Dailies", icon: Video, status: "active", progress: 60, lastUpdated: "5 hours ago" },
        { id: "post-timeline", name: "Post Timeline", icon: Layers, status: "active", progress: 60, lastUpdated: "30 min ago" },
        { id: "vfx", name: "VFX Pipeline", icon: Tv, status: "pending", progress: 20, lastUpdated: "1 week ago" },
        { id: "audio", name: "Audio", icon: Mic, status: "active", progress: 40, lastUpdated: "2 days ago" },

    ]

    const adminModules = [
        { id: "analytics", name: "Analytics", icon: BarChart3, status: "active", progress: 95, lastUpdated: "1 hour ago" },
        { id: "user-management", name: "User Management", icon: Users, status: "active", progress: 100, lastUpdated: "30 min ago" },
    ]

    const renderModuleList = (modules: any[], title: string) => {
        const visibleModules = modules.filter(m => isModuleVisible(m.id))

        if (visibleModules.length === 0) return null

        return (
            <div className="mb-6">
                <h3 className="text-white/70 text-sm font-medium mb-3 uppercase tracking-wider">{title}</h3>
                <div className="space-y-1">
                    {visibleModules.map((module) => (
                        <button
                            key={module.id}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 hover:bg-white/10 ${currentView === module.id ? "bg-white/20" : ""
                                }`}
                            onClick={() => onNavigate(module.id)}
                        >
                            <div className={`status-indicator ${getModuleStatusColor(module.status)}`}>
                                <module.icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="text-white font-medium">{module.name}</div>
                                <div className="text-white/50 text-xs">
                                    {module.progress}% • {module.lastUpdated}
                                </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-white/30">
                                <div
                                    className="h-full rounded-full bg-blue-400 transition-all duration-300"
                                    style={{ width: `${module.progress}%` }}
                                ></div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    // Combined list for collapsed view
    const allModules = [
        ...productionModules,
        ...workflowModules,
        ...adminModules
    ].filter(m => isModuleVisible(m.id))

    return (
        <div
            className={`${collapsed ? "w-20" : "w-80"} h-full bg-white/10 backdrop-blur-lg shadow-xl border-r border-white/20 rounded-tr-3xl transition-all duration-300 overflow-y-auto scrollbar-hide flex-shrink-0 flex flex-col`}
        >
            <div className="p-4 flex-1">
                {/* Project Selector */}
                {!collapsed && currentProject && (
                    <div className="mb-6 relative">
                        <button
                            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                            className="w-full flex items-center justify-between gap-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white hover:bg-white/15 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                    {currentProject.title.charAt(0)}
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-sm">{currentProject.title}</div>
                                    <div className="text-xs text-white/70">{currentProject.status.replace("-", " ")}</div>
                                </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showProjectDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {/* Project Dropdown */}
                        {showProjectDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                                {projects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            onProjectSelect(project)
                                            setShowProjectDropdown(false)
                                        }}
                                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                            {project.title.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-white font-medium text-sm">{project.title}</div>
                                            <div className="text-white/70 text-xs">{project.status.replace("-", " ")}</div>
                                        </div>
                                        {currentProject.id === project.id && <Check className="h-4 w-4 text-green-400" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!collapsed && (
                    <button
                        className="mb-6 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 text-white w-full hover:from-blue-600 hover:to-purple-600 transition-all duration-300 ai-glow"
                        onClick={() => {
                            onHeaderViewChange("dashboard")
                            onNavigate("dashboard")
                        }}
                    >
                        <BarChart3 className="h-5 w-5" />
                        <span className="font-medium">Dashboard</span>
                    </button>
                )}

                {collapsed ? (
                    <div className="space-y-4">
                        <button
                            className="w-full p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                            onClick={() => {
                                onHeaderViewChange("dashboard")
                                onNavigate("dashboard")
                            }}
                        >
                            <BarChart3 className="h-6 w-6 mx-auto" />
                        </button>

                        {allModules.map((module) => (
                            <button
                                key={module.id}
                                className={`w-full p-3 rounded-lg transition-all duration-200 hover:bg-white/10 ${currentView === module.id ? "bg-white/20" : ""
                                    } status-indicator ${getModuleStatusColor(module.status)}`}
                                onClick={() => onNavigate(module.id)}
                            >
                                <module.icon className="h-6 w-6 text-white mx-auto" />
                            </button>
                        ))}

                        <button
                            className={`w-full p-3 rounded-lg transition-all duration-200 hover:bg-white/10 ${currentView === "project-settings" ? "bg-white/20" : ""
                                }`}
                            onClick={() => onNavigate("project-settings")}
                        >
                            <Settings className="h-6 w-6 text-white mx-auto" />
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Project Settings */}
                        <div className="mb-6">
                            <div className="space-y-1">
                                <button
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 hover:bg-white/10 ${currentView === "project-settings" ? "bg-white/20" : ""
                                        }`}
                                    onClick={() => onNavigate("project-settings")}
                                >
                                    <Settings className="h-5 w-5 text-white" />
                                    <span className="text-white font-medium">Project Settings</span>
                                </button>
                            </div>
                        </div>


                        {renderModuleList(
                            productionModules,
                            "Pre-Production",
                        )}
                        {renderModuleList(workflowModules, "Workflow")}
                        {/* Asset Management - Always visible or controlled? Assuming always visible or controlled by 'assets' key */}
                        {isModuleVisible("assets") && (
                            <div className="mb-6">
                                <h3 className="text-white/70 text-sm font-medium mb-3 uppercase tracking-wider">Assets</h3>
                                <button
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 hover:bg-white/10 ${currentView === "assets" ? "bg-white/20" : ""
                                        }`}
                                    onClick={() => onNavigate("assets")}
                                >
                                    <Folder className="h-5 w-5 text-white" />
                                    <span className="text-white font-medium">Asset Manager</span>
                                </button>
                            </div>
                        )}
                        {renderModuleList(adminModules, "Admin")}


                    </>
                )}
            </div>
        </div>
    )
}
