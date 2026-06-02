"use client"

import { useState, useRef, useEffect } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  X,
  Clock,
  Search,
  Brain,
  AlertTriangle,
  CheckCircle,
  Upload,
  FileVideo,
  Layers,
  Target,
  BarChart3,
  TrendingUp,
  Flag,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react"

interface DailiesClip {
  id: string
  filename: string
  scene: string
  take: number
  camera: string
  duration: number
  timecode: string
  shootingDate: string
  director: string
  dp: string
  status: "new" | "reviewed" | "approved" | "rejected" | "flagged"
  thumbnail: string
  videoUrl: string
  proxyUrl: string
  metadata: {
    resolution: string
    fps: number
    codec: string
    fileSize: number
    colorSpace: string
    lens: string
    iso: number
    aperture: string
    shutterSpeed: string
  }
  comments: Comment[]
  ratings: Rating[]
  tags: string[]
  aiAnalysis: {
    qualityScore: number
    exposureAnalysis: string
    focusAnalysis: string
    audioLevels: string
    technicalIssues: string[]
    suggestions: string[]
    transcription?: string
  }
  syncStatus: "synced" | "syncing" | "failed" | "pending"
  location: string
  weather: string
  notes: string
}

interface Comment {
  id: string
  user: string
  avatar: string
  role: string
  timestamp: number // seconds into video
  timecode: string
  comment: string
  type: "note" | "issue" | "approval" | "question"
  priority: "low" | "medium" | "high"
  status: "open" | "resolved" | "acknowledged"
  createdAt: string
  replies: Reply[]
  drawing?: {
    type: "circle" | "arrow" | "rectangle" | "freehand"
    coordinates: number[]
    color: string
  }
}

interface Reply {
  id: string
  user: string
  avatar: string
  comment: string
  createdAt: string
}

interface Rating {
  user: string
  role: string
  rating: number
  category: "performance" | "technical" | "overall"
  notes: string
  createdAt: string
}

interface DailiesReviewModuleProps {
  projectId?: string
}

const MOCK_DAILIES_STORE: Record<string, DailiesClip[]> = {}

export default function DailiesReviewModule({ projectId = "1" }: DailiesReviewModuleProps) {
  const [selectedClip, setSelectedClip] = useState<DailiesClip | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [activeView, setActiveView] = useState<"grid" | "timeline" | "approval" | "analytics">("grid")
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "reviewed" | "approved" | "rejected">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showComments, setShowComments] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [commentType, setCommentType] = useState<"note" | "issue" | "approval" | "question">("note")
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingTool, setDrawingTool] = useState<"circle" | "arrow" | "rectangle" | "freehand">("circle")
  const [showAIInsights, setShowAIInsights] = useState(true)
  const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Sample dailies data
  const [dailiesClips, setDailiesClips] = useState<DailiesClip[]>([])

  useEffect(() => {
    if (MOCK_DAILIES_STORE[projectId]) {
      setDailiesClips(MOCK_DAILIES_STORE[projectId])
      if (MOCK_DAILIES_STORE[projectId].length > 0) {
        setSelectedClip(MOCK_DAILIES_STORE[projectId][0])
      }
      return
    }

    const initialDailiesClips: DailiesClip[] = [
      {
        id: "clip-1",
        filename: "SC012_T003_CAM-A_HERO.mov",
        scene: "Scene 12",
        take: 3,
        camera: "Camera A",
        duration: 180,
        timecode: "01:23:45:12",
        shootingDate: "2024-03-15",
        director: "Sarah Chen",
        dp: "Alex Kim",
        status: "new",
        thumbnail: "/placeholder.svg?height=200&width=300",
        videoUrl: "/sample-video.mp4",
        proxyUrl: "/sample-proxy.mp4",
        metadata: {
          resolution: "4K (4096x2160)",
          fps: 24,
          codec: "ProRes 422 HQ",
          fileSize: 2.4 * 1024 * 1024 * 1024,
          colorSpace: "Rec. 709",
          lens: "50mm f/1.4",
          iso: 800,
          aperture: "f/2.8",
          shutterSpeed: "1/48",
        },
        comments: [
          {
            id: "comment-1",
            user: "Sarah Chen",
            avatar: "SC",
            role: "Director",
            timestamp: 45,
            timecode: "00:00:45:00",
            comment: "Love the performance here, but can we get a tighter frame on the reaction?",
            type: "note",
            priority: "medium",
            status: "open",
            createdAt: "2024-03-15T14:30:00Z",
            replies: [
              {
                id: "reply-1",
                user: "Alex Kim",
                avatar: "AK",
                comment: "Agreed, I have a closer angle from Camera B we can use.",
                createdAt: "2024-03-15T14:35:00Z",
              },
            ],
          },
          {
            id: "comment-2",
            user: "Emma Davis",
            avatar: "ED",
            role: "Editor",
            timestamp: 120,
            timecode: "00:02:00:00",
            comment: "Audio levels seem low here, might need ADR.",
            type: "issue",
            priority: "high",
            status: "open",
            createdAt: "2024-03-15T15:00:00Z",
            replies: [],
          },
        ],
        ratings: [
          {
            user: "Sarah Chen",
            role: "Director",
            rating: 5,
            category: "performance",
            notes: "Excellent emotional range, this is the hero take.",
            createdAt: "2024-03-15T14:45:00Z",
          },
          {
            user: "Alex Kim",
            role: "DP",
            rating: 4,
            category: "technical",
            notes: "Good exposure, slight camera shake at 1:20.",
            createdAt: "2024-03-15T14:50:00Z",
          },
        ],
        tags: ["hero-take", "dialogue", "interior", "emotional"],
        aiAnalysis: {
          qualityScore: 94,
          exposureAnalysis: "Optimal exposure with good shadow detail",
          focusAnalysis: "Sharp focus throughout, slight rack focus at 1:15",
          audioLevels: "Dialogue clear, ambient levels appropriate",
          technicalIssues: ["Minor camera shake at 1:20-1:25"],
          suggestions: [
            "Consider color grading to enhance mood",
            "Audio could benefit from slight EQ boost",
            "Excellent performance - recommend as hero take",
          ],
          transcription: "I never thought I'd see you again. After all these years...",
        },
        syncStatus: "synced",
        location: "Studio A - Interior Office Set",
        weather: "Controlled Environment",
        notes: "Great performance from both actors. Consider this the hero take for the scene.",
      },
      {
        id: "clip-2",
        filename: "SC012_T002_CAM-B_WIDE.mov",
        scene: "Scene 12",
        take: 2,
        camera: "Camera B",
        duration: 165,
        timecode: "01:23:42:08",
        shootingDate: "2024-03-15",
        director: "Sarah Chen",
        dp: "Alex Kim",
        status: "reviewed",
        thumbnail: "/placeholder.svg?height=200&width=300",
        videoUrl: "/sample-video-2.mp4",
        proxyUrl: "/sample-proxy-2.mp4",
        metadata: {
          resolution: "4K (4096x2160)",
          fps: 24,
          codec: "ProRes 422 HQ",
          fileSize: 1.8 * 1024 * 1024 * 1024,
          colorSpace: "Rec. 709",
          lens: "24-70mm f/2.8",
          iso: 800,
          aperture: "f/4.0",
          shutterSpeed: "1/48",
        },
        comments: [
          {
            id: "comment-3",
            user: "Michael Torres",
            avatar: "MT",
            role: "Producer",
            timestamp: 30,
            timecode: "00:00:30:00",
            comment: "Good coverage angle, this will cut well with the master.",
            type: "approval",
            priority: "low",
            status: "acknowledged",
            createdAt: "2024-03-15T16:00:00Z",
            replies: [],
          },
        ],
        ratings: [
          {
            user: "Emma Davis",
            role: "Editor",
            rating: 4,
            category: "overall",
            notes: "Solid coverage, good for cutting.",
            createdAt: "2024-03-15T16:15:00Z",
          },
        ],
        tags: ["coverage", "wide-shot", "interior"],
        aiAnalysis: {
          qualityScore: 87,
          exposureAnalysis: "Slightly underexposed, recoverable in post",
          focusAnalysis: "Sharp focus, good depth of field",
          audioLevels: "Good dialogue clarity, room tone present",
          technicalIssues: ["Slight underexposure", "Minor lens flare at 0:45"],
          suggestions: ["Increase exposure by 0.3 stops in color correction", "Good for intercutting with master shot"],
        },
        syncStatus: "synced",
        location: "Studio A - Interior Office Set",
        weather: "Controlled Environment",
        notes: "Good coverage angle for editing.",
      },
      {
        id: "clip-3",
        filename: "SC015_T001_CAM-A_ACTION.mov",
        scene: "Scene 15",
        take: 1,
        camera: "Camera A",
        duration: 240,
        timecode: "02:15:30:00",
        shootingDate: "2024-03-15",
        director: "Sarah Chen",
        dp: "Alex Kim",
        status: "flagged",
        thumbnail: "/placeholder.svg?height=200&width=300",
        videoUrl: "/sample-video-3.mp4",
        proxyUrl: "/sample-proxy-3.mp4",
        metadata: {
          resolution: "4K (4096x2160)",
          fps: 24,
          codec: "ProRes 422 HQ",
          fileSize: 3.2 * 1024 * 1024 * 1024,
          colorSpace: "Rec. 709",
          lens: "85mm f/1.8",
          iso: 1600,
          aperture: "f/2.8",
          shutterSpeed: "1/48",
        },
        comments: [
          {
            id: "comment-4",
            user: "Tom Wilson",
            avatar: "TW",
            role: "Stunt Coordinator",
            timestamp: 180,
            timecode: "00:03:00:00",
            comment: "Safety concern - actor too close to practical explosion. Need to reshoot.",
            type: "issue",
            priority: "high",
            status: "open",
            createdAt: "2024-03-15T17:30:00Z",
            replies: [
              {
                id: "reply-2",
                user: "Sarah Chen",
                avatar: "SC",
                comment: "Agreed, let's schedule a pickup shot with better safety distance.",
                createdAt: "2024-03-15T17:35:00Z",
              },
            ],
          },
        ],
        ratings: [],
        tags: ["action", "stunt", "safety-concern", "reshoot-needed"],
        aiAnalysis: {
          qualityScore: 76,
          exposureAnalysis: "High ISO noise visible, acceptable for action sequence",
          focusAnalysis: "Motion blur present, appropriate for action",
          audioLevels: "Loud practical effects, dialogue may need ADR",
          technicalIssues: ["High ISO noise", "Motion blur", "Safety protocol violation"],
          suggestions: [
            "Noise reduction required in post",
            "Consider ADR for dialogue clarity",
            "Safety review required before approval",
          ],
        },
        syncStatus: "synced",
        location: "Warehouse - Practical Location",
        weather: "Clear, 72°F",
        notes: "Action sequence with practical effects. Safety concerns noted.",
      },
    ]

    if (projectId === "2") {
      initialDailiesClips.pop();
      initialDailiesClips.forEach(clip => clip.scene = "Scene 20");
    } else if (projectId === "3") {
      initialDailiesClips.shift();
      initialDailiesClips.forEach(clip => clip.scene = "Scene 99");
    }

    MOCK_DAILIES_STORE[projectId] = initialDailiesClips;
    setDailiesClips(initialDailiesClips);
    if (initialDailiesClips.length > 0) {
      setSelectedClip(initialDailiesClips[0]);
    }
  }, [projectId])

  useEffect(() => {
    if (dailiesClips.length > 0 && projectId) {
      MOCK_DAILIES_STORE[projectId] = dailiesClips;
    }
  }, [dailiesClips, projectId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-500"
      case "reviewed":
        return "bg-yellow-500"
      case "approved":
        return "bg-green-500"
      case "rejected":
        return "bg-red-500"
      case "flagged":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case "note":
        return "text-blue-400"
      case "issue":
        return "text-red-400"
      case "approval":
        return "text-green-400"
      case "question":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-400"
      case "medium":
        return "text-yellow-400"
      case "low":
        return "text-green-400"
      default:
        return "text-gray-400"
    }
  }

  const filteredClips = dailiesClips.filter((clip) => {
    const matchesStatus = filterStatus === "all" || clip.status === filterStatus
    const matchesSearch =
      clip.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.scene.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const totalClips = dailiesClips.length
  const newClips = dailiesClips.filter((c) => c.status === "new").length
  const approvedClips = dailiesClips.filter((c) => c.status === "approved").length
  const flaggedClips = dailiesClips.filter((c) => c.status === "flagged").length
  const averageQuality = dailiesClips.reduce((sum, clip) => sum + clip.aiAnalysis.qualityScore, 0) / totalClips

  const addComment = () => {
    if (!newComment.trim() || !selectedClip) return

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      user: "Current User",
      avatar: "CU",
      role: "Reviewer",
      timestamp: currentTime,
      timecode: formatTime(currentTime),
      comment: newComment,
      type: commentType,
      priority: "medium",
      status: "open",
      createdAt: new Date().toISOString(),
      replies: [],
    }

    // In a real app, this would update the backend
    setNewComment("")
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const jumpToComment = (timestamp: number) => {
    seekTo(timestamp)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dailies Review & Approval</h1>
          <p className="text-white/70">AI-powered collaborative review with frame-accurate feedback</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Brain className="h-4 w-4" />
            AI Analysis
          </button>
          <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Upload className="h-4 w-4" />
            Upload Dailies
          </button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showAIInsights && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-6 border border-purple-300/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">AI Review Intelligence</h2>
            </div>
            <button
              onClick={() => setShowAIInsights(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-green-400" />
                <span className="text-sm text-white/70">Avg Quality Score</span>
              </div>
              <p className="text-white font-medium">{averageQuality.toFixed(0)}% • Excellent</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <span className="text-sm text-white/70">Issues Detected</span>
              </div>
              <p className="text-white font-medium">{flaggedClips} clips need attention</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-white/70">Review Progress</span>
              </div>
              <p className="text-white font-medium">
                {Math.round(((totalClips - newClips) / totalClips) * 100)}% complete
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-white/70">Approval Rate</span>
              </div>
              <p className="text-white font-medium">{Math.round((approvedClips / totalClips) * 100)}% approved</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <FileVideo className="h-5 w-5 text-blue-400" />
            <span className="text-white/70 text-sm">Total Clips</span>
          </div>
          <div className="text-2xl font-bold text-white">{totalClips}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            <span className="text-white/70 text-sm">Pending Review</span>
          </div>
          <div className="text-2xl font-bold text-white">{newClips}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-white/70 text-sm">Approved</span>
          </div>
          <div className="text-2xl font-bold text-white">{approvedClips}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="h-5 w-5 text-red-400" />
            <span className="text-white/70 text-sm">Flagged</span>
          </div>
          <div className="text-2xl font-bold text-white">{flaggedClips}</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
        {[
          { id: "grid", label: "Clip Grid", icon: Layers },
          { id: "timeline", label: "Timeline View", icon: Clock },
          { id: "approval", label: "Approval Queue", icon: CheckCircle },
          { id: "analytics", label: "Analytics", icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${activeView === tab.id ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 min-h-[600px]">
        {activeView === "grid" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Dailies Library</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search clips..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-white/10 border border-white/20 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="flagged">Flagged</option>
                </select>
                <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-lg p-1">
                  <button
                    onClick={() => setDeviceView("desktop")}
                    className={`p-2 rounded transition-colors ${deviceView === "desktop" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                      }`}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeviceView("tablet")}
                    className={`p-2 rounded transition-colors ${deviceView === "tablet" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                      }`}
                  >
                    <Tablet className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeviceView("mobile")}
                    className={`p-2 rounded transition-colors ${deviceView === "mobile" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                      }`}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Clips Grid */}
              <div className="lg:col-span-2">
                <div
                  className={`grid gap-4 ${deviceView === "mobile"
                    ? "grid-cols-1"
                    : deviceView === "tablet"
                      ? "grid-cols-2"
                      : "grid-cols-2 xl:grid-cols-3"
                    }`}
                >
                  {filteredClips.map((clip) => (
                    <div
                      key={clip.id}
                      className={`bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:bg-white/10 transition-colors cursor-pointer ${selectedClip?.id === clip.id ? "ring-2 ring-blue-400" : ""
                        }`}
                      onClick={() => setSelectedClip(clip)}
                    >
                      <div className="aspect-video bg-black/30 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-12 w-12 text-white/50" />
                        </div>
                        <div className="absolute top-2 left-2">
                          <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(clip.status)}`}>
                            {clip.status}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1">
                          {clip.aiAnalysis.qualityScore >= 90 && (
                            <div className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                              AI: {clip.aiAnalysis.qualityScore}%
                            </div>
                          )}
                          {clip.comments.length > 0 && (
                            <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                              {clip.comments.length}
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          {formatTime(clip.duration)}
                        </div>
                      </div>

                      <div className="p-3">
                        <h3 className="text-white font-medium text-sm mb-1 truncate">{clip.filename}</h3>
                        <div className="text-xs text-white/70 space-y-1">
                          <div className="flex justify-between">
                            <span>{clip.scene}</span>
                            <span>Take {clip.take}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{clip.camera}</span>
                            <span>{clip.timecode}</span>
                          </div>
                          <div>{clip.metadata.resolution}</div>
                        </div>

                        {clip.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {clip.tags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                            {clip.tags.length > 2 && (
                              <span className="text-white/50 text-xs">+{clip.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Player & Comments */}
              <div className="space-y-4">
                {selectedClip ? (
                  <>
                    {/* Video Player */}
                    <div className="bg-black rounded-lg overflow-hidden">
                      <div className="aspect-video relative">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-contain"
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={handleLoadedMetadata}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        >
                          <source src={selectedClip.proxyUrl} type="video/mp4" />
                        </video>
                        <canvas
                          ref={canvasRef}
                          className="absolute inset-0 pointer-events-none"
                          style={{ display: isDrawing ? "block" : "none" }}
                        />
                      </div>

                      {/* Video Controls */}
                      <div className="bg-black/80 p-4">
                        <div className="flex items-center gap-4 mb-3">
                          <button
                            onClick={togglePlayPause}
                            className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            {isPlaying ? (
                              <Pause className="h-5 w-5 text-white" />
                            ) : (
                              <Play className="h-5 w-5 text-white" />
                            )}
                          </button>
                          <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <SkipBack className="h-4 w-4 text-white" />
                          </button>
                          <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <SkipForward className="h-4 w-4 text-white" />
                          </button>
                          <div className="flex-1 bg-white/20 rounded-full h-1 cursor-pointer">
                            <div
                              className="bg-blue-400 h-1 rounded-full"
                              style={{ width: `${(currentTime / duration) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                          <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                          >
                            {isMuted ? (
                              <VolumeX className="h-4 w-4 text-white" />
                            ) : (
                              <Volume2 className="h-4 w-4 text-white" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-sm text-white/70">
                          <div className="flex items-center gap-4">
                            <span>
                              {selectedClip.scene} - Take {selectedClip.take}
                            </span>
                            <span>{selectedClip.camera}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={playbackSpeed}
                              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                            >
                              <option value={0.5}>0.5x</option>
                              <option value={1}>1x</option>
                              <option value={1.5}>1.5x</option>
                              <option value={2}>2x</option>
                            </select>
                            <button className="p-1 bg-white/10 rounded hover:bg-white/20 transition-colors">
                              <Maximize className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-5 w-5 text-purple-400" />
                        <h3 className="text-white font-medium">AI Analysis</h3>
                        <span className="text-purple-400 text-sm">{selectedClip.aiAnalysis.qualityScore}% Quality</span>
                      </div>
                      <div className="space-y-2 text-sm text-white/80">
                        <div>
                          <span className="text-white/60">Exposure:</span> {selectedClip.aiAnalysis.exposureAnalysis}
                        </div>
                        <div>
                          <span className="text-white/60">Focus:</span> {selectedClip.aiAnalysis.focusAnalysis}
                        </div>
                        <div>
                          <span className="text-white/60">Audio:</span> {selectedClip.aiAnalysis.audioLevels}
                        </div>
                        {selectedClip.aiAnalysis.technicalIssues.length > 0 && (
                          <div>
                            <span className="text-white/60">Issues:</span>
                            <ul className="list-disc list-inside ml-2">
                              {selectedClip.aiAnalysis.technicalIssues.map((issue, i) => (
                                <li key={i} className="text-yellow-400">
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Comments Section */}
                    <div className="bg-white/5 rounded-lg border border-white/10">
                      <div className="p-4 border-b border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white font-medium">Comments & Notes</h3>
                          <span className="text-white/60 text-sm">{selectedClip.comments.length} comments</span>
                        </div>

                        {/* Add Comment */}
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <select
                              value={commentType}
                              onChange={(e) => setCommentType(e.target.value as any)}
                              className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
                            >
                              <option value="note">Note</option>
                              <option value="issue">Issue</option>
                              <option value="approval">Approval</option>
                              <option value="question">Question</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Add a comment at current timecode..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                              onKeyPress={(e) => e.key === "Enter" && addComment()}
                            />
                            <button
                              onClick={addComment}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="max-h-64 overflow-y-auto">
                        {selectedClip.comments.map((comment) => (
                          <div key={comment.id} className="p-4 border-b border-white/10 last:border-b-0">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                {comment.avatar}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-medium text-sm">{comment.user}</span>
                                  <span className="text-white/60 text-xs">{comment.role}</span>
                                  <span className={`text-xs ${getCommentTypeColor(comment.type)}`}>{comment.type}</span>
                                  <span className={`text-xs ${getPriorityColor(comment.priority)}`}>
                                    {comment.priority}
                                  </span>
                                  <button
                                    onClick={() => jumpToComment(comment.timestamp)}
                                    className="text-blue-400 hover:text-blue-300 text-xs underline"
                                  >
                                    {comment.timecode}
                                  </button>
                                </div>
                                <p className="text-white/80 text-sm mb-2">{comment.comment}</p>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                  <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                  <button className="hover:text-white transition-colors">Reply</button>
                                  <button className="hover:text-white transition-colors">Resolve</button>
                                </div>
                                {comment.replies.length > 0 && (
                                  <div className="mt-2 ml-4 space-y-2">
                                    {comment.replies.map((reply) => (
                                      <div key={reply.id} className="bg-white/5 rounded p-2">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-white font-medium text-xs">{reply.user}</span>
                                          <span className="text-white/60 text-xs">
                                            {new Date(reply.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <p className="text-white/80 text-xs">{reply.comment}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Approval Actions */}
                    <div className="flex gap-2">
                      <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg transition-colors font-medium">
                        <CheckCircle className="h-4 w-4 inline mr-2" />
                        Approve
                      </button>
                      <button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg transition-colors font-medium">
                        <Flag className="h-4 w-4 inline mr-2" />
                        Flag for Review
                      </button>
                      <button className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg transition-colors font-medium">
                        <X className="h-4 w-4 inline mr-2" />
                        Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-white/50 py-12">
                    <FileVideo className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Select a Clip to Review</h3>
                    <p className="text-sm">Choose a clip from the library to start reviewing.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === "timeline" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Timeline View</h2>
            <div className="text-center text-white/50 py-12">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Timeline View Coming Soon</h3>
              <p className="text-sm">Visual timeline with clips organized by shooting day and scene.</p>
            </div>
          </div>
        )}

        {activeView === "approval" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Approval Queue</h2>
            <div className="space-y-4">
              {dailiesClips
                .filter((clip) => clip.status === "new" || clip.status === "flagged")
                .map((clip) => (
                  <div key={clip.id} className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 bg-black/30 rounded flex items-center justify-center">
                          <Play className="h-6 w-6 text-white/50" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{clip.filename}</h3>
                          <div className="text-white/70 text-sm">
                            {clip.scene} • Take {clip.take} • {clip.camera}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(clip.status)}`}>
                              {clip.status}
                            </span>
                            <span className="text-white/60 text-xs">AI: {clip.aiAnalysis.qualityScore}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors">
                          Approve
                        </button>
                        <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors">
                          Flag
                        </button>
                        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeView === "analytics" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Review Analytics</h2>
            <div className="text-center text-white/50 py-12">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Analytics Dashboard Coming Soon</h3>
              <p className="text-sm">Detailed review metrics, approval rates, and quality trends.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
