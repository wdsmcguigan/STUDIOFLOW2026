"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  User,
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles,
  ChevronDown,
  X,
} from "lucide-react"

interface ScriptModuleProps {
  searchQuery?: string
  projectId?: string
}

const MOCK_SCENES_STORE: Record<string, Scene[]> = {}

interface Scene {
  id: string
  number: string
  title: string
  description: string
  location: string
  timeOfDay: string
  characters: string[]
  pageCount: number
  status: "draft" | "approved" | "revision" | "locked"
  lastModified: string
  author: string
  notes: string[]
  extractedFromAI?: boolean
}

export default function ScriptModule({ searchQuery = "", projectId = "1" }: ScriptModuleProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [showAIExtraction, setShowAIExtraction] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractedScenes, setExtractedScenes] = useState<Scene[]>([])
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [pendingScenes, setPendingScenes] = useState<Scene[]>([])

  const [scenes, setScenes] = useState<Scene[]>([])

  useEffect(() => {
    if (MOCK_SCENES_STORE[projectId]) {
      setScenes(MOCK_SCENES_STORE[projectId])
      return
    }

    const initialScenes: Scene[] = [
      {
        id: "1",
        number: "1",
        title: "Opening - City Dawn",
        description:
          "Establishing shot of the futuristic city at dawn. Camera slowly pans across the cityscape revealing flying cars and holographic advertisements.",
        location: "EXT. NEO TOKYO - DAWN",
        timeOfDay: "Dawn",
        characters: ["Narrator (V.O.)"],
        pageCount: 2,
        status: "approved",
        lastModified: "2 hours ago",
        author: "Sarah Chen",
        notes: ["VFX heavy scene", "Drone shots required"],
      },
      {
        id: "2",
        number: "2",
        title: "Protagonist Introduction",
        description:
          "ALEX CHEN (28) wakes up in a cramped apartment. The room is filled with holographic displays showing news feeds and personal messages.",
        location: "INT. ALEX'S APARTMENT - MORNING",
        timeOfDay: "Morning",
        characters: ["Alex Chen", "AI Assistant (V.O.)"],
        pageCount: 3,
        status: "revision",
        lastModified: "1 day ago",
        author: "Sarah Chen",
        notes: ["Need to establish character motivation", "Add more world-building details"],
      },
      {
        id: "3",
        number: "3",
        title: "The Discovery",
        description:
          "Alex discovers a mysterious data chip hidden in an old book. The chip contains encrypted information about a conspiracy.",
        location: "INT. ALEX'S APARTMENT - MORNING",
        timeOfDay: "Morning",
        characters: ["Alex Chen"],
        pageCount: 1,
        status: "draft",
        lastModified: "3 hours ago",
        author: "Sarah Chen",
        notes: ["Needs more tension", "Consider adding flashback"],
      },
    ]

    // Customize
    if (projectId === "2") {
      initialScenes.forEach(s => s.location = s.location.replace("NEO TOKYO", "NEW YORK"));
      initialScenes.push({
        id: "4", number: "4", title: "Subway Chase", description: "Chase in the subway.", location: "INT. SUBWAY", timeOfDay: "Night", characters: ["Alex"], pageCount: 2, status: "draft", lastModified: "Now", author: "Mike", notes: []
      });
    } else if (projectId === "3") {
      initialScenes.forEach(s => s.location = s.location.replace("NEO TOKYO", "LOS ANGELES"));
      initialScenes.pop();
    }

    MOCK_SCENES_STORE[projectId] = initialScenes
    setScenes(initialScenes)
  }, [projectId])

  useEffect(() => {
    if (scenes.length > 0 && projectId) {
      MOCK_SCENES_STORE[projectId] = scenes
    }
  }, [scenes, projectId])

  const handleAIExtraction = async () => {
    setShowAIExtraction(true)
    setExtractionProgress(0)

    // Simulate AI extraction process
    const interval = setInterval(() => {
      setExtractionProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          // Simulate extracted scenes
          const newScenes: Scene[] = [
            {
              id: "ai-1",
              number: "4",
              title: "Chase Sequence",
              description:
                "High-speed chase through the city streets. Alex is pursued by corporate security forces after discovering the conspiracy.",
              location: "EXT. NEO TOKYO STREETS - DAY",
              timeOfDay: "Day",
              characters: ["Alex Chen", "Security Forces"],
              pageCount: 4,
              status: "draft",
              lastModified: "Just now",
              author: "AI Assistant",
              notes: ["Auto-extracted from script", "Requires director approval"],
              extractedFromAI: true,
            },
            {
              id: "ai-2",
              number: "5",
              title: "Underground Meeting",
              description:
                "Alex meets with MAYA RODRIGUEZ (35), a former corporate insider who knows about the conspiracy. They meet in an abandoned subway station.",
              location: "INT. ABANDONED SUBWAY STATION - NIGHT",
              timeOfDay: "Night",
              characters: ["Alex Chen", "Maya Rodriguez"],
              pageCount: 3,
              status: "draft",
              lastModified: "Just now",
              author: "AI Assistant",
              notes: ["Auto-extracted from script", "Character development scene"],
              extractedFromAI: true,
            },
            {
              id: "ai-3",
              number: "6",
              title: "Corporate Infiltration",
              description:
                "Alex and Maya infiltrate the corporate headquarters to gather evidence. They use advanced hacking tools and stealth technology.",
              location: "INT. CORPORATE HEADQUARTERS - NIGHT",
              timeOfDay: "Night",
              characters: ["Alex Chen", "Maya Rodriguez", "Security Guards"],
              pageCount: 5,
              status: "draft",
              lastModified: "Just now",
              author: "AI Assistant",
              notes: ["Action sequence", "VFX required for hacking scenes"],
              extractedFromAI: true,
            },
          ]
          setPendingScenes(newScenes)
          setShowApprovalModal(true)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleApproveScenes = (approvedScenes: Scene[]) => {
    setScenes([...scenes, ...approvedScenes])
    setPendingScenes([])
    setShowApprovalModal(false)
    setShowAIExtraction(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500"
      case "revision":
        return "bg-yellow-500"
      case "draft":
        return "bg-blue-500"
      case "locked":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const filteredScenes = scenes.filter(
    (scene) =>
      scene.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scene.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scene.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scene.characters.some((char) => char.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const SceneCard = ({ scene, isCompact = false }: { scene: Scene; isCompact?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
        {/* Compact Header - Always Visible */}
        <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">#{scene.number}</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{scene.title}</h3>
                <p className="text-white/60 text-xs">{scene.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(scene.status)}`}>
                {scene.status.toUpperCase()}
              </span>
              <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>
          </div>

          {/* Short Description - Always Visible */}
          <p className="text-white/70 text-sm line-clamp-2">{scene.description}</p>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
              <div>
                <span className="text-white/50 text-xs">Time of Day</span>
                <p className="text-white text-sm">{scene.timeOfDay}</p>
              </div>
              <div>
                <span className="text-white/50 text-xs">Page Count</span>
                <p className="text-white text-sm">{scene.pageCount} pages</p>
              </div>
              <div>
                <span className="text-white/50 text-xs">Characters</span>
                <p className="text-white text-sm">{scene.characters.join(", ")}</p>
              </div>
              <div>
                <span className="text-white/50 text-xs">Last Modified</span>
                <p className="text-white text-sm">{scene.lastModified}</p>
              </div>
            </div>

            {scene.notes.length > 0 && (
              <div className="mb-4">
                <span className="text-white/50 text-xs">Notes</span>
                <div className="mt-1 space-y-1">
                  {scene.notes.map((note, i) => (
                    <p key={i} className="text-white/70 text-sm">
                      • {note}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-white/50" />
                <span className="text-white/70 text-sm">{scene.author}</span>
                {scene.extractedFromAI && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full">
                    <Brain className="h-3 w-3 text-purple-400" />
                    <span className="text-purple-400 text-xs">AI Generated</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Edit className="h-4 w-4 text-white/70" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Eye className="h-4 w-4 text-white/70" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Trash2 className="h-4 w-4 text-white/70" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Script Management</h1>
          <p className="text-white/70">Manage scenes, dialogue, and script revisions with AI assistance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAIExtraction()}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            <Brain className="h-4 w-4" />
            Extract Scenes with AI
          </button>
          <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            Add Scene
          </button>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
            <Upload className="h-4 w-4" />
            Import Script
          </button>
        </div>
      </div>

      {/* Stats Cards - Much Narrower */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-blue-400" />
            <span className="text-white/70 text-xs">Total Scenes</span>
          </div>
          <p className="text-white font-bold text-lg">{scenes.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-white/70 text-xs">Approved</span>
          </div>
          <p className="text-white font-bold text-lg">{scenes.filter((s) => s.status === "approved").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-white/70 text-xs">In Review</span>
          </div>
          <p className="text-white font-bold text-lg">{scenes.filter((s) => s.status === "revision").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Edit className="h-4 w-4 text-blue-400" />
            <span className="text-white/70 text-xs">Draft</span>
          </div>
          <p className="text-white font-bold text-lg">{scenes.filter((s) => s.status === "draft").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-purple-400" />
            <span className="text-white/70 text-xs">Total Pages</span>
          </div>
          <p className="text-white font-bold text-lg">{scenes.reduce((acc, scene) => acc + scene.pageCount, 0)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-white/70 text-xs">AI Generated</span>
          </div>
          <p className="text-white font-bold text-lg">{scenes.filter((s) => s.extractedFromAI).length}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              List
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="revision">In Revision</option>
            <option value="draft">Draft</option>
            <option value="locked">Locked</option>
          </select>
          <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
            <option value="number">Sort by Scene #</option>
            <option value="modified">Last Modified</option>
            <option value="status">Status</option>
            <option value="author">Author</option>
          </select>
        </div>
      </div>

      {/* Scenes Grid/List */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
        {filteredScenes.map((scene) => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>

      {/* AI Extraction Modal */}
      {showAIExtraction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Scene Extraction</h3>
              <p className="text-white/70 mb-6">Analyzing script and extracting scenes...</p>

              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${extractionProgress}%` }}
                />
              </div>

              <p className="text-white/50 text-sm">{extractionProgress}% Complete</p>

              {extractionProgress < 100 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                  <span className="text-white/70 text-sm">Processing script content...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scene Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Review AI-Extracted Scenes</h3>
                <p className="text-white/70">Review and approve the scenes extracted by AI</p>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {pendingScenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveScenes(pendingScenes)}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg transition-all duration-300"
              >
                Approve All Scenes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
