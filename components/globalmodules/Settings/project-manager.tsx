"use client"

import { useState, useEffect } from "react"
import {
    Settings,
    Plus,
    Folder,
    Download,
    Archive,
    Trash2,
    Upload,
    MoreVertical, // Keeping unused import to minimize diff noise if possible, or should I remove? strict linter might complain. I'll keep it as is from original if it was there.
    FileBox,
    RefreshCw,
    Search,
    Filter
} from "lucide-react"
import { useProjectActions } from "../../hooks/useProjectActions"
import { useLiveQuery } from "dexie-react-hooks"
import { db, seedMockData, type Project } from "../../../lib/db"

interface ProjectManagerProps {
    onNavigateToProject?: (projectId: string) => void
    onCreateProject?: () => void
}

export default function ProjectManager({ onNavigateToProject, onCreateProject }: ProjectManagerProps) {
    // Replace local state with live query from DB
    const projects = useLiveQuery(() => db.projects.toArray()) || []

    const [searchQuery, setSearchQuery] = useState("")

    const { isExporting, exportProject, archiveProject, deleteProject } = useProjectActions()

    const [showMockData, setShowMockData] = useState(true)

    // Initial load and settings listener
    useEffect(() => {
        const loadSettings = () => {
            const stored = localStorage.getItem("studio_flow_show_mock_data")
            if (stored !== null) {
                setShowMockData(JSON.parse(stored))
            }
        }

        loadSettings()

        // Seed data if empty and mock data is enabled (or just always check seed on load)
        seedMockData()

        const handleSettingsChange = () => {
            loadSettings()
        }

        window.addEventListener("studio_flow_settings_change", handleSettingsChange)
        return () => window.removeEventListener("studio_flow_settings_change", handleSettingsChange)
    }, [])

    const handleExportProject = (project: Project) => {
        exportProject(project)
    }

    const handleArchiveProject = (id: string) => {
        const project = projects.find(p => p.id === id)
        if (project) {
            // Update in DB instead of local state
            // archiveProject hook currently takes a callback to update local state.
            // We can wrap the DB update in that callback or just update DB directly.
            // detailed `archiveProject` implementation showed it calls the callback.
            archiveProject(project, async (pid, newStatus) => {
                await db.projects.update(pid, { status: newStatus as any })
            })
        }
    }

    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

    // Replaced original handleDeleteProject to open modal instead of calling hook
    const handleDeleteClick = (project: Project) => {
        setProjectToDelete(project)
    }

    const confirmDeleteProject = async () => {
        if (!projectToDelete) return

        try {
            const pid = projectToDelete.id

            // Try deleting as authentic string ID first
            const existsAsString = await db.projects.get(pid);
            if (existsAsString) {
                await db.projects.delete(pid);
            } else {
                // Fallback: check if it exists as a number
                const asNumber = Number(pid);
                if (!isNaN(asNumber)) {
                    const existsAsNumber = await db.projects.get(asNumber as any);
                    if (existsAsNumber) {
                        await db.projects.delete(asNumber as any);
                    }
                }
            }
            // Close modal
            setProjectToDelete(null)
        } catch (error) {
            console.error("[ProjectManager] Failed to delete project:", error);
            alert("Failed to delete project. Check console for details.");
        }
    }

    // Handle creating a new project (simple implementation for now)
    const handleCreateProject = async () => {
        // If prop is provided, call it (maybe it opens a modal)
        if (onCreateProject) {
            onCreateProject()
            return;
        }

        // Fallback or "Create" action logic if we wanted to add it here directly
        // For now we keep existing behavior which just called the prop
    }
    const filteredProjects = projects.filter(p => {
        // Filter by mock data setting
        if (!showMockData && p.isMock) return false

        // Filter by search query
        if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false

        return true
    })

    return (
        <div className="h-full flex flex-col text-white relative">
            {/* Delete Confirmation Modal */}
            {projectToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-4 mb-4 text-red-400">
                            <div className="p-3 bg-red-500/10 rounded-full">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Delete Project?</h3>
                        </div>

                        <p className="text-white/70 mb-6">
                            Are you sure you want to delete <span className="font-semibold text-white">"{projectToDelete.title}"</span>?
                            This action cannot be undone and all associated data will be permanently removed.
                        </p>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setProjectToDelete(null)}
                                className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteProject}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold mb-1">Project Management</h2>
                    <p className="text-white/60 text-sm">Manage, archive, and export your projects</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <button
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm shadow-lg hover:shadow-blue-500/25"
                        onClick={handleCreateProject}
                    >
                        <Plus className="h-4 w-4" />
                        New Project
                    </button>
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-lg transition-colors text-sm">
                        <Upload className="h-4 w-4" />
                        Import
                    </button>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-4 font-medium text-sm text-white/60">Project Name</th>
                            <th className="p-4 font-medium text-sm text-white/60">Status</th>
                            <th className="p-4 font-medium text-sm text-white/60">Size</th>
                            <th className="p-4 font-medium text-sm text-white/60">Last Activity</th>
                            <th className="p-4 font-medium text-sm text-white/60 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProjects.map((project) => (
                            <tr key={project.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                                            <FileBox className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">
                                                {project.title}
                                                {project.isMock && <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">MOCK</span>}
                                            </div>
                                            <div className="text-xs text-white/50">ID: {project.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs border ${project.status === "production" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                        project.status === "development" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                            project.status === "archived" ? "bg-gray-500/10 border-gray-500/20 text-gray-400" :
                                                "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                        } `}>
                                        {project.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-white/70">{project.size}</td>
                                <td className="p-4 text-sm text-white/70">{project.lastActivity}</td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onNavigateToProject?.(project.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                                            title="Project Settings"
                                        >
                                            <Settings className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleExportProject(project)}
                                            disabled={isExporting === project.id}
                                            className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                                            title="Export Project"
                                        >
                                            {isExporting === project.id ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Download className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleArchiveProject(project.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-yellow-400 transition-colors"
                                            title="Archive Project"
                                        >
                                            <Archive className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteClick(project)
                                            }}
                                            className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-red-400 transition-colors"
                                            title="Delete Project"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
