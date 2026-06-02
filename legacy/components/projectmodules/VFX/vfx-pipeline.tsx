"use client"

import { useState, useEffect } from "react"
import {
  Zap,
  Plus,
  Play,
  Eye,
  Edit,
  Download,
  Upload,
  Clock,
  CheckCircle,
  AlertTriangle,
  Grid3X3,
  List,
  X,
  Camera,
  Layers,
  Palette,
  FileVideo,
  Monitor,
} from "lucide-react"

interface VFXShot {
  id: number
  name: string
  description: string
  status: "pending" | "in progress" | "review" | "approved" | "completed" | "rejected"
  priority: "low" | "medium" | "high" | "urgent"
  dueDate: string
  assignee: string
  estimatedHours: number
  actualHours?: number
  progress: number
  complexity: "simple" | "medium" | "complex" | "extreme"
  shotType: "compositing" | "cgi" | "cleanup" | "color" | "motion graphics" | "3d animation"
  frameRange: string
  resolution: string
  frameRate: string
  software: string[]
  tags: string[]
  notes: string
  createdBy: string
  createdAt: string
  lastModified: string
  reviewNotes?: string
  previewUrl?: string
  finalUrl?: string
  dependencies?: string[]
  budget?: number
  client?: string
}

interface VFXPipelineProps {
  searchQuery?: string
  filters?: {
    status: string
    priority: string
    assignee?: string
    shotType?: string
  }
  projectId?: string
}

const MOCK_VFX_STORE: Record<string, VFXShot[]> = {}

export default function VFXPipeline({
  searchQuery = "",
  filters = { status: "all", priority: "all", assignee: "all", shotType: "all" },
  projectId = "1",
}: VFXPipelineProps) {
  const [selectedShot, setSelectedShot] = useState<VFXShot | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list" | "kanban">("kanban")
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "progress" | "name">("dueDate")
  const [vfxShots, setVfxShots] = useState<VFXShot[]>([])

  useEffect(() => {
    if (MOCK_VFX_STORE[projectId]) {
      setVfxShots(MOCK_VFX_STORE[projectId])
      return
    }

    const initialVfxShots: VFXShot[] = [
      {
        id: 1,
        name: "Hero Flight Sequence",
        description: "Superhero flying through the city with cape physics and environment interaction",
        status: "in progress",
        priority: "high",
        dueDate: "2024-03-15",
        assignee: "John Doe",
        estimatedHours: 40,
        actualHours: 25,
        progress: 65,
        complexity: "complex",
        shotType: "cgi",
        frameRange: "1001-1120",
        resolution: "4K (4096x2160)",
        frameRate: "24fps",
        software: ["Maya", "Houdini", "Nuke"],
        tags: ["hero", "flight", "city", "cape physics", "environment"],
        notes: "Complex cape simulation required. City environment needs detailed lighting.",
        createdBy: "VFX Supervisor",
        createdAt: "2024-01-10",
        lastModified: "2024-01-20",
        reviewNotes: "Cape physics looking good, need to adjust city lighting",
        previewUrl: "/previews/hero_flight_v003.mp4",
        dependencies: ["City Environment Model", "Hero Rig"],
        budget: 15000,
        client: "Marvel Studios",
      },
      {
        id: 2,
        name: "Explosion Composite",
        description: "Large-scale explosion with debris and smoke simulation",
        status: "review",
        priority: "medium",
        dueDate: "2024-03-22",
        assignee: "Jane Smith",
        estimatedHours: 24,
        actualHours: 22,
        progress: 90,
        complexity: "medium",
        shotType: "compositing",
        frameRange: "2001-2080",
        resolution: "2K (2048x1080)",
        frameRate: "24fps",
        software: ["Nuke", "Houdini", "After Effects"],
        tags: ["explosion", "debris", "smoke", "destruction"],
        notes: "Practical explosion plate needs enhancement with CG elements.",
        createdBy: "Compositing Lead",
        createdAt: "2024-01-12",
        lastModified: "2024-01-22",
        reviewNotes: "Explosion timing perfect, debris needs more variation",
        previewUrl: "/previews/explosion_comp_v005.mp4",
        dependencies: ["Practical Explosion Plate"],
        budget: 8000,
        client: "Warner Bros",
      },
      {
        id: 3,
        name: "Character Face Replacement",
        description: "Digital face replacement for stunt double in close-up shots",
        status: "pending",
        priority: "urgent",
        dueDate: "2024-03-29",
        assignee: "Peter Jones",
        estimatedHours: 32,
        progress: 0,
        complexity: "extreme",
        shotType: "cleanup",
        frameRange: "3001-3150",
        resolution: "4K (4096x2160)",
        frameRate: "24fps",
        software: ["Nuke", "Maya", "Mari"],
        tags: ["face replacement", "digital double", "close-up", "performance"],
        notes: "High-resolution face scan available. Requires precise tracking and lighting match.",
        createdBy: "Digital Human Specialist",
        createdAt: "2024-01-15",
        lastModified: "2024-01-15",
        dependencies: ["Face Scan Data", "Performance Capture"],
        budget: 25000,
        client: "Disney",
      },
      {
        id: 4,
        name: "Matte Painting Extension",
        description: "Digital environment extension for establishing shot of alien planet",
        status: "completed",
        priority: "low",
        dueDate: "2024-02-28",
        assignee: "Alice Brown",
        estimatedHours: 16,
        actualHours: 18,
        progress: 100,
        complexity: "simple",
        shotType: "compositing",
        frameRange: "4001-4001",
        resolution: "8K (8192x4320)",
        frameRate: "24fps",
        software: ["Photoshop", "Nuke", "Terragen"],
        tags: ["matte painting", "environment", "alien planet", "establishing shot"],
        notes: "Single frame matte painting for wide establishing shot.",
        createdBy: "Matte Painter",
        createdAt: "2024-01-08",
        lastModified: "2024-02-25",
        reviewNotes: "Approved - excellent work on atmospheric perspective",
        finalUrl: "/finals/alien_planet_matte_final.exr",
        budget: 5000,
        client: "Paramount",
      },
      {
        id: 5,
        name: "Creature Animation",
        description: "Full CG creature performance with facial animation and fur simulation",
        status: "in progress",
        priority: "high",
        dueDate: "2024-04-10",
        assignee: "Bob Williams",
        estimatedHours: 60,
        actualHours: 35,
        progress: 45,
        complexity: "extreme",
        shotType: "3d animation",
        frameRange: "5001-5240",
        resolution: "4K (4096x2160)",
        frameRate: "24fps",
        software: ["Maya", "Houdini", "Arnold", "Nuke"],
        tags: ["creature", "animation", "facial", "fur simulation", "performance"],
        notes: "Complex creature with detailed facial expressions and full-body fur simulation.",
        createdBy: "Animation Director",
        createdAt: "2024-01-05",
        lastModified: "2024-01-25",
        reviewNotes: "Animation performance strong, fur simulation needs refinement",
        previewUrl: "/previews/creature_anim_v002.mp4",
        dependencies: ["Creature Rig", "Fur Groom"],
        budget: 35000,
        client: "Universal",
      },
    ]

    if (projectId === "2") {
      initialVfxShots.pop();
      initialVfxShots[0].name = "Spaceship Battle";
      initialVfxShots[0].shotType = "cgi";
    } else if (projectId === "3") {
      initialVfxShots.shift();
      initialVfxShots[0].status = "completed";
    }

    MOCK_VFX_STORE[projectId] = initialVfxShots;
    setVfxShots(initialVfxShots);
  }, [projectId])

  useEffect(() => {
    if (vfxShots.length > 0 && projectId) {
      MOCK_VFX_STORE[projectId] = vfxShots;
    }
  }, [vfxShots, projectId])

  const filteredShots = vfxShots.filter((shot) => {
    const matchesSearch =
      shot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shot.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shot.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      shot.notes.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filters.status === "all" || shot.status === filters.status
    const matchesPriority = filters.priority === "all" || shot.priority === filters.priority
    const matchesAssignee = !filters.assignee || filters.assignee === "all" || shot.assignee === filters.assignee
    const matchesShotType = !filters.shotType || filters.shotType === "all" || shot.shotType === filters.shotType

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesShotType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gray-500"
      case "in progress":
        return "bg-blue-500"
      case "review":
        return "bg-yellow-500"
      case "approved":
        return "bg-green-500"
      case "completed":
        return "bg-emerald-500"
      case "rejected":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "text-green-400"
      case "medium":
        return "text-yellow-400"
      case "high":
        return "text-orange-400"
      case "urgent":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "simple":
        return "bg-green-500/20 text-green-400"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400"
      case "complex":
        return "bg-orange-500/20 text-orange-400"
      case "extreme":
        return "bg-red-500/20 text-red-400"
      default:
        return "bg-gray-500/20 text-gray-400"
    }
  }

  const getShotTypeIcon = (shotType: string) => {
    switch (shotType) {
      case "compositing":
        return <Layers className="h-4 w-4" />
      case "cgi":
        return <Monitor className="h-4 w-4" />
      case "cleanup":
        return <Edit className="h-4 w-4" />
      case "color":
        return <Palette className="h-4 w-4" />
      case "motion graphics":
        return <Zap className="h-4 w-4" />
      case "3d animation":
        return <Camera className="h-4 w-4" />
      default:
        return <FileVideo className="h-4 w-4" />
    }
  }

  const statusColumns = [
    { id: "pending", title: "Pending", shots: filteredShots.filter((s) => s.status === "pending") },
    { id: "in progress", title: "In Progress", shots: filteredShots.filter((s) => s.status === "in progress") },
    { id: "review", title: "Review", shots: filteredShots.filter((s) => s.status === "review") },
    { id: "approved", title: "Approved", shots: filteredShots.filter((s) => s.status === "approved") },
    { id: "completed", title: "Completed", shots: filteredShots.filter((s) => s.status === "completed") },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">VFX Pipeline</h1>
          <p className="text-white/70">Manage visual effects shots and production pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Shot
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <FileVideo className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{vfxShots.length}</p>
              <p className="text-white/70 text-sm">Total Shots</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {vfxShots.filter((s) => s.status === "in progress").length}
              </p>
              <p className="text-white/70 text-sm">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{vfxShots.filter((s) => s.status === "review").length}</p>
              <p className="text-white/70 text-sm">In Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{vfxShots.filter((s) => s.status === "completed").length}</p>
              <p className="text-white/70 text-sm">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{vfxShots.filter((s) => s.priority === "urgent").length}</p>
              <p className="text-white/70 text-sm">Urgent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "kanban" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="progress">Progress</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto">
          {statusColumns.map((column) => (
            <div key={column.id} className="bg-white/5 rounded-xl p-4 min-h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">{column.title}</h3>
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{column.shots.length}</span>
              </div>
              <div className="space-y-3">
                {column.shots.map((shot) => (
                  <div
                    key={shot.id}
                    className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-3 hover:bg-white/15 transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedShot(shot)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
                        {getShotTypeIcon(shot.shotType)}
                      </div>
                      <h4 className="text-white font-medium text-sm line-clamp-1">{shot.name}</h4>
                    </div>
                    <p className="text-white/70 text-xs mb-3 line-clamp-2">{shot.description}</p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/70">Progress</span>
                        <span className="text-white">{shot.progress}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${shot.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-xs font-medium ${getPriorityColor(shot.priority)}`}>
                        {shot.priority.toUpperCase()}
                      </span>
                      <span className="text-white/70 text-xs">{shot.assignee}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs text-white/60">
                      <span>{shot.frameRange}</span>
                      <span>{shot.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShots.map((shot) => (
            <div
              key={shot.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedShot(shot)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      {getShotTypeIcon(shot.shotType)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{shot.name}</h3>
                      <p className="text-white/60 text-xs capitalize">{shot.shotType}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(shot.status)}`}
                  >
                    {shot.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-white/70 text-sm mb-3 line-clamp-2">{shot.description}</p>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Progress:</span>
                    <span className="text-white">{shot.progress}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${shot.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Assignee:</span>
                    <span className="text-white">{shot.assignee}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Due Date:</span>
                    <span className="text-white">{shot.dueDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Priority:</span>
                    <span className={`font-medium ${getPriorityColor(shot.priority)}`}>
                      {shot.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Complexity:</span>
                    <span className={`px-2 py-1 rounded text-xs ${getComplexityColor(shot.complexity)}`}>
                      {shot.complexity}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/20">
                  <div className="flex flex-wrap gap-1">
                    {shot.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                        {tag}
                      </span>
                    ))}
                    {shot.tags.length > 3 && (
                      <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">
                        +{shot.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredShots.map((shot) => (
            <div
              key={shot.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedShot(shot)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  {getShotTypeIcon(shot.shotType)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{shot.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(shot.status)}`}
                    >
                      {shot.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getComplexityColor(shot.complexity)}`}>
                      {shot.complexity}
                    </span>
                  </div>
                  <p className="text-white/70 text-sm mb-2">{shot.description}</p>
                  <div className="flex items-center gap-4 text-sm text-white/70">
                    <span>Assignee: {shot.assignee}</span>
                    <span>Due: {shot.dueDate}</span>
                    <span>Frames: {shot.frameRange}</span>
                    <span className={getPriorityColor(shot.priority)}>Priority: {shot.priority.toUpperCase()}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-white font-medium mb-1">{shot.progress}%</div>
                  <div className="w-24 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${shot.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <Eye className="h-4 w-4 text-white/70" />
                  </button>
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <Edit className="h-4 w-4 text-white/70" />
                  </button>
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <Download className="h-4 w-4 text-white/70" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shot Detail Modal */}
      {selectedShot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedShot.name}</h2>
                <button
                  onClick={() => setSelectedShot(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-3">Shot Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Status:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedShot.status)}`}
                        >
                          {selectedShot.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Priority:</span>
                        <span className={`font-medium ${getPriorityColor(selectedShot.priority)}`}>
                          {selectedShot.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Complexity:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getComplexityColor(selectedShot.complexity)}`}>
                          {selectedShot.complexity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Shot Type:</span>
                        <span className="text-white capitalize">{selectedShot.shotType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Assignee:</span>
                        <span className="text-white">{selectedShot.assignee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Due Date:</span>
                        <span className="text-white">{selectedShot.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Technical Specs</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Frame Range:</span>
                        <span className="text-white">{selectedShot.frameRange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Resolution:</span>
                        <span className="text-white">{selectedShot.resolution}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Frame Rate:</span>
                        <span className="text-white">{selectedShot.frameRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Estimated Hours:</span>
                        <span className="text-white">{selectedShot.estimatedHours}h</span>
                      </div>
                      {selectedShot.actualHours && (
                        <div className="flex justify-between">
                          <span className="text-white/70">Actual Hours:</span>
                          <span className="text-white">{selectedShot.actualHours}h</span>
                        </div>
                      )}
                      {selectedShot.budget && (
                        <div className="flex justify-between">
                          <span className="text-white/70">Budget:</span>
                          <span className="text-white">${selectedShot.budget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Software</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedShot.software.map((software, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                          {software}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-3">Progress</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Completion</span>
                        <span className="text-white font-medium">{selectedShot.progress}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${selectedShot.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Description</h3>
                    <p className="text-white/80 text-sm">{selectedShot.description}</p>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedShot.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedShot.dependencies && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Dependencies</h3>
                      <div className="space-y-1">
                        {selectedShot.dependencies.map((dep, index) => (
                          <div key={index} className="text-white/80 text-sm bg-white/5 rounded px-2 py-1">
                            {dep}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedShot.notes && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Notes</h3>
                      <p className="text-white/80 text-sm bg-white/5 rounded-lg p-3">{selectedShot.notes}</p>
                    </div>
                  )}

                  {selectedShot.reviewNotes && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Review Notes</h3>
                      <p className="text-white/80 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        {selectedShot.reviewNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex gap-3 flex-wrap">
                  <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                    Edit Shot
                  </button>
                  {selectedShot.previewUrl && (
                    <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                      <Play className="h-4 w-4" />
                      View Preview
                    </button>
                  )}
                  <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload Version
                  </button>
                  <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Eye className="h-4 w-4" />
                    Request Review
                  </button>
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
