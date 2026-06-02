"use client"

import { useState, useRef, useEffect } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Save,
  Download,
  GitBranch,
  GitMerge,
  Users,
  Layers,
  Scissors,
  Copy,
  Trash2,
  RotateCcw,
  RotateCw,
  Brain,
  Settings,
  Eye,
  Lock,
  Plus,
  AlertTriangle,
  Wifi,
  CloudUpload,
  WifiOff,
  HardDrive,
  FileVideo,
  Music,
  Target,
  BarChart3,
} from "lucide-react"

interface TimelineClip {
  id: string
  name: string
  type: "video" | "audio" | "image" | "title" | "effect"
  track: number
  startTime: number // in seconds
  duration: number
  trimIn: number
  trimOut: number
  sourceFile: string
  thumbnail: string
  color: string
  locked: boolean
  muted: boolean
  opacity: number
  speed: number
  effects: Effect[]
  markers: Marker[]
  metadata: {
    resolution: string
    fps: number
    codec: string
    bitrate: string
    colorSpace: string
  }
  aiSuggestions: string[]
  version: string
  lastModified: string
  modifiedBy: string
}

interface Effect {
  id: string
  name: string
  type: "color" | "audio" | "transition" | "filter"
  parameters: Record<string, any>
  enabled: boolean
}

interface Marker {
  id: string
  time: number
  type: "comment" | "chapter" | "sync" | "issue"
  label: string
  color: string
  user: string
  timestamp: string
}

interface TimelineVersion {
  id: string
  name: string
  description: string
  createdBy: string
  createdAt: string
  parentVersion?: string
  status: "draft" | "review" | "approved" | "archived"
  changes: string[]
  clips: TimelineClip[]
  duration: number
  frameRate: number
  resolution: string
  colorSpace: string
  audioChannels: number
  sampleRate: number
}

interface CollaborativeUser {
  id: string
  name: string
  avatar: string
  role: string
  color: string
  cursor: { track: number; time: number } | null
  selection: { clipId: string; startTime: number; endTime: number } | null
  lastActive: string
  isOnline: boolean
}

interface DeliverySpec {
  id: string
  name: string
  format: string
  resolution: string
  frameRate: number
  codec: string
  bitrate: string
  audioCodec: string
  audioBitrate: string
  colorSpace: string
  container: string
  platform: string
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  estimatedTime: number
  fileSize: number
  outputPath: string
}

interface PostProductionTimelineProps {
  projectId?: string
}

const MOCK_POST_STORE: Record<string, TimelineVersion[]> = {}

export default function PostProductionTimeline({ projectId = "1" }: PostProductionTimelineProps) {
  const [currentVersion, setCurrentVersion] = useState<TimelineVersion | null>(null)
  const [versions, setVersions] = useState<TimelineVersion[]>([])
  const [activeUsers, setActiveUsers] = useState<CollaborativeUser[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(300) // 5 minutes default
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [selectedClips, setSelectedClips] = useState<string[]>([])
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [showVersions, setShowVersions] = useState(false)
  const [showCollaborators, setShowCollaborators] = useState(true)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [activeView, setActiveView] = useState<"timeline" | "versions" | "delivery" | "analytics">("timeline")
  const [trackHeight, setTrackHeight] = useState(80)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline" | "conflict">("synced")
  const [deliverySpecs, setDeliverySpecs] = useState<DeliverySpec[]>([])
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [newVersionName, setNewVersionName] = useState("")
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "video" | "audio" | "effects">("all")

  const timelineRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)

  // Sample timeline data
  const sampleVersions: TimelineVersion[] = [
    {
      id: "v1",
      name: "Rough Cut v1",
      description: "Initial assembly from approved dailies",
      createdBy: "Emma Davis",
      createdAt: "2024-03-15T10:00:00Z",
      status: "review",
      changes: ["Added Scene 12 coverage", "Synced audio tracks", "Basic color correction"],
      clips: [
        {
          id: "clip-1",
          name: "SC012_T003_CAM-A_HERO",
          type: "video",
          track: 1,
          startTime: 0,
          duration: 45,
          trimIn: 5,
          trimOut: 50,
          sourceFile: "dailies/SC012_T003_CAM-A_HERO.mov",
          thumbnail: "/placeholder.svg?height=60&width=80",
          color: "#3b82f6",
          locked: false,
          muted: false,
          opacity: 1,
          speed: 1,
          effects: [],
          markers: [
            {
              id: "marker-1",
              time: 15,
              type: "comment",
              label: "Great performance here",
              color: "#10b981",
              user: "Sarah Chen",
              timestamp: "2024-03-15T14:30:00Z",
            },
          ],
          metadata: {
            resolution: "4K",
            fps: 24,
            codec: "ProRes 422 HQ",
            bitrate: "220 Mbps",
            colorSpace: "Rec. 709",
          },
          aiSuggestions: ["Consider extending this shot by 2 seconds", "Audio levels optimal"],
          version: "v1",
          lastModified: "2024-03-15T14:30:00Z",
          modifiedBy: "Emma Davis",
        },
        {
          id: "clip-2",
          name: "SC012_T002_CAM-B_WIDE",
          type: "video",
          track: 1,
          startTime: 45,
          duration: 30,
          trimIn: 0,
          trimOut: 30,
          sourceFile: "dailies/SC012_T002_CAM-B_WIDE.mov",
          thumbnail: "/placeholder.svg?height=60&width=80",
          color: "#8b5cf6",
          locked: false,
          muted: false,
          opacity: 1,
          speed: 1,
          effects: [
            {
              id: "effect-1",
              name: "Color Correction",
              type: "color",
              parameters: { exposure: 0.3, contrast: 1.1, saturation: 1.05 },
              enabled: true,
            },
          ],
          markers: [],
          metadata: {
            resolution: "4K",
            fps: 24,
            codec: "ProRes 422 HQ",
            bitrate: "220 Mbps",
            colorSpace: "Rec. 709",
          },
          aiSuggestions: ["Good coverage angle", "Consider slight speed ramp"],
          version: "v1",
          lastModified: "2024-03-15T15:00:00Z",
          modifiedBy: "Emma Davis",
        },
        {
          id: "clip-3",
          name: "Audio_Scene12_Mix",
          type: "audio",
          track: 3,
          startTime: 0,
          duration: 75,
          trimIn: 0,
          trimOut: 75,
          sourceFile: "audio/Scene12_DialogueMix.wav",
          thumbnail: "/placeholder.svg?height=40&width=80",
          color: "#f59e0b",
          locked: false,
          muted: false,
          opacity: 1,
          speed: 1,
          effects: [
            {
              id: "effect-2",
              name: "EQ",
              type: "audio",
              parameters: { lowCut: 80, highBoost: 2 },
              enabled: true,
            },
          ],
          markers: [],
          metadata: {
            resolution: "N/A",
            fps: 0,
            codec: "PCM",
            bitrate: "1411 kbps",
            colorSpace: "N/A",
          },
          aiSuggestions: ["Audio levels consistent", "Consider noise reduction"],
          version: "v1",
          lastModified: "2024-03-15T15:30:00Z",
          modifiedBy: "Sound Designer",
        },
      ],
      duration: 75,
      frameRate: 24,
      resolution: "4K (4096x2160)",
      colorSpace: "Rec. 709",
      audioChannels: 2,
      sampleRate: 48000,
    },
    {
      id: "v2",
      name: "Director's Cut v1",
      description: "Incorporating director's feedback",
      createdBy: "Emma Davis",
      createdAt: "2024-03-16T09:00:00Z",
      parentVersion: "v1",
      status: "draft",
      changes: ["Extended hero shot", "Added reaction cutaway", "Adjusted pacing"],
      clips: [],
      duration: 82,
      frameRate: 24,
      resolution: "4K (4096x2160)",
      colorSpace: "Rec. 709",
      audioChannels: 2,
      sampleRate: 48000,
    },
  ]

  const sampleUsers: CollaborativeUser[] = [
    {
      id: "user-1",
      name: "Emma Davis",
      avatar: "ED",
      role: "Editor",
      color: "#3b82f6",
      cursor: { track: 1, time: 25 },
      selection: null,
      lastActive: "2024-03-16T10:30:00Z",
      isOnline: true,
    },
    {
      id: "user-2",
      name: "Sarah Chen",
      avatar: "SC",
      role: "Director",
      color: "#10b981",
      cursor: null,
      selection: { clipId: "clip-1", startTime: 15, endTime: 30 },
      lastActive: "2024-03-16T10:25:00Z",
      isOnline: true,
    },
    {
      id: "user-3",
      name: "Alex Kim",
      avatar: "AK",
      role: "Colorist",
      color: "#f59e0b",
      cursor: null,
      selection: null,
      lastActive: "2024-03-16T09:45:00Z",
      isOnline: false,
    },
  ]

  const sampleDeliverySpecs: DeliverySpec[] = [
    {
      id: "spec-1",
      name: "Netflix 4K Master",
      format: "ProRes 4444 XQ",
      resolution: "4096x2160",
      frameRate: 24,
      codec: "ProRes 4444 XQ",
      bitrate: "500 Mbps",
      audioCodec: "PCM",
      audioBitrate: "1411 kbps",
      colorSpace: "Rec. 2020",
      container: "MOV",
      platform: "Netflix",
      status: "completed",
      progress: 100,
      estimatedTime: 0,
      fileSize: 15.2 * 1024 * 1024 * 1024,
      outputPath: "/exports/netflix_4k_master.mov",
    },
    {
      id: "spec-2",
      name: "YouTube 1080p",
      format: "H.264",
      resolution: "1920x1080",
      frameRate: 24,
      codec: "H.264",
      bitrate: "8 Mbps",
      audioCodec: "AAC",
      audioBitrate: "320 kbps",
      colorSpace: "Rec. 709",
      container: "MP4",
      platform: "YouTube",
      status: "processing",
      progress: 65,
      estimatedTime: 8,
      fileSize: 2.1 * 1024 * 1024 * 1024,
      outputPath: "/exports/youtube_1080p.mp4",
    },
    {
      id: "spec-3",
      name: "Social Media Square",
      format: "H.264",
      resolution: "1080x1080",
      frameRate: 30,
      codec: "H.264",
      bitrate: "5 Mbps",
      audioCodec: "AAC",
      audioBitrate: "128 kbps",
      colorSpace: "Rec. 709",
      container: "MP4",
      platform: "Instagram",
      status: "pending",
      progress: 0,
      estimatedTime: 12,
      fileSize: 0,
      outputPath: "/exports/instagram_square.mp4",
    },
  ]

  useEffect(() => {
    setActiveUsers(sampleUsers)
    setDeliverySpecs(sampleDeliverySpecs)

    if (MOCK_POST_STORE[projectId]) {
      setVersions(MOCK_POST_STORE[projectId])
      setCurrentVersion(MOCK_POST_STORE[projectId][0])
      return
    }

    const initialVersions = [...sampleVersions]

    if (projectId === "2") {
      initialVersions[0].name = "Project 2 Timeline";
      initialVersions[0].duration = 120;
    } else if (projectId === "3") {
      initialVersions[0].name = "Project 3 Montage";
      initialVersions[0].duration = 60;
    }

    MOCK_POST_STORE[projectId] = initialVersions;
    setVersions(initialVersions)
    setCurrentVersion(initialVersions[0])
  }, [projectId])

  useEffect(() => {
    if (versions.length > 0 && projectId) {
      MOCK_POST_STORE[projectId] = versions;
    }
  }, [versions, projectId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * 24)
    return `${mins}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`
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
      case "draft":
        return "bg-gray-500"
      case "review":
        return "bg-yellow-500"
      case "approved":
        return "bg-green-500"
      case "archived":
        return "bg-gray-400"
      default:
        return "bg-blue-500"
    }
  }

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case "synced":
        return "text-green-400"
      case "syncing":
        return "text-yellow-400"
      case "offline":
        return "text-gray-400"
      case "conflict":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case "synced":
        return <Wifi className="h-4 w-4" />
      case "syncing":
        return <CloudUpload className="h-4 w-4 animate-pulse" />
      case "offline":
        return <WifiOff className="h-4 w-4" />
      case "conflict":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <HardDrive className="h-4 w-4" />
    }
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const createNewVersion = () => {
    if (!newVersionName.trim()) return

    const newVersion: TimelineVersion = {
      id: `v${versions.length + 1}`,
      name: newVersionName,
      description: "Branched from " + (currentVersion?.name || "main"),
      createdBy: "Current User",
      createdAt: new Date().toISOString(),
      parentVersion: currentVersion?.id,
      status: "draft",
      changes: [],
      clips: currentVersion?.clips || [],
      duration: currentVersion?.duration || 0,
      frameRate: 24,
      resolution: "4K (4096x2160)",
      colorSpace: "Rec. 709",
      audioChannels: 2,
      sampleRate: 48000,
    }

    setVersions([...versions, newVersion])
    setCurrentVersion(newVersion)
    setNewVersionName("")
    setShowBranchModal(false)
  }

  const renderTimelineTrack = (trackNumber: number, trackType: "video" | "audio") => {
    const trackClips = currentVersion?.clips.filter((clip) => clip.track === trackNumber) || []
    const pixelsPerSecond = 10 * zoom

    return (
      <div key={`${trackType}-${trackNumber}`} className="flex border-b border-white/10">
        {/* Track Header */}
        <div className="w-48 bg-white/5 border-r border-white/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {trackType === "video" ? (
              <FileVideo className="h-4 w-4 text-blue-400" />
            ) : (
              <Music className="h-4 w-4 text-yellow-400" />
            )}
            <span className="text-white text-sm font-medium">
              {trackType === "video" ? `V${trackNumber}` : `A${trackNumber}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-white/10 rounded">
              <Eye className="h-3 w-3 text-white/70" />
            </button>
            <button className="p-1 hover:bg-white/10 rounded">
              <Volume2 className="h-3 w-3 text-white/70" />
            </button>
            <button className="p-1 hover:bg-white/10 rounded">
              <Lock className="h-3 w-3 text-white/70" />
            </button>
          </div>
        </div>

        {/* Track Content */}
        <div className="flex-1 relative" style={{ height: `${trackHeight}px` }}>
          {/* Grid Lines */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: Math.ceil(duration / 10) }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-white/10"
                style={{ left: `${i * 10 * pixelsPerSecond}px` }}
              />
            ))}
          </div>

          {/* Clips */}
          {trackClips.map((clip) => (
            <div
              key={clip.id}
              className={`absolute top-1 bottom-1 rounded border-2 cursor-pointer transition-all duration-200 ${selectedClips.includes(clip.id)
                  ? "border-blue-400 shadow-lg shadow-blue-400/20"
                  : "border-transparent hover:border-white/30"
                }`}
              style={{
                left: `${clip.startTime * pixelsPerSecond}px`,
                width: `${clip.duration * pixelsPerSecond}px`,
                backgroundColor: clip.color + "40",
                borderColor: selectedClips.includes(clip.id) ? "#3b82f6" : clip.color,
              }}
              onClick={() => {
                if (selectedClips.includes(clip.id)) {
                  setSelectedClips(selectedClips.filter((id) => id !== clip.id))
                } else {
                  setSelectedClips([...selectedClips, clip.id])
                }
              }}
            >
              <div className="h-full flex items-center px-2 overflow-hidden">
                {trackType === "video" && (
                  <img
                    src={clip.thumbnail || "/placeholder.svg"}
                    alt={clip.name}
                    className="h-8 w-10 object-cover rounded mr-2 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-medium truncate">{clip.name}</div>
                  {clip.effects.length > 0 && (
                    <div className="text-white/60 text-xs">
                      {clip.effects.length} effect{clip.effects.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                {clip.locked && <Lock className="h-3 w-3 text-white/60 ml-1" />}
                {clip.muted && <VolumeX className="h-3 w-3 text-white/60 ml-1" />}
              </div>

              {/* Markers */}
              {clip.markers.map((marker) => (
                <div
                  key={marker.id}
                  className="absolute top-0 w-1 h-full"
                  style={{
                    left: `${marker.time * pixelsPerSecond}px`,
                    backgroundColor: marker.color,
                  }}
                  title={marker.label}
                />
              ))}

              {/* Trim Handles */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white" />
            </div>
          ))}

          {/* Collaborative Cursors */}
          {activeUsers
            .filter((user) => user.cursor?.track === trackNumber && user.isOnline)
            .map((user) => (
              <div
                key={user.id}
                className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-10"
                style={{
                  left: `${(user.cursor?.time || 0) * pixelsPerSecond}px`,
                  backgroundColor: user.color,
                }}
              >
                <div
                  className="absolute -top-6 -left-2 px-2 py-1 rounded text-xs text-white font-medium"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name}
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  const renderTimeline = () => (
    <div className="space-y-4">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={togglePlayPause} className="p-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
            {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
          </button>
          <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
            <SkipBack className="h-4 w-4 text-white" />
          </button>
          <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
            <SkipForward className="h-4 w-4 text-white" />
          </button>
          <div className="text-white font-mono text-sm bg-black/30 px-3 py-2 rounded">{formatTime(currentTime)}</div>
          <div className="text-white/60 text-sm">/ {formatTime(duration)}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">Zoom:</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-white text-sm">{zoom.toFixed(1)}x</span>
          </div>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-2 rounded-lg transition-colors ${snapToGrid ? "bg-blue-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
          >
            <Target className="h-4 w-4" />
          </button>
          <div className={`flex items-center gap-2 ${getSyncStatusColor(syncStatus)}`}>
            {getSyncStatusIcon(syncStatus)}
            <span className="text-sm capitalize">{syncStatus}</span>
          </div>
        </div>
      </div>

      {/* Timeline Ruler */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <div className="flex border-b border-white/10">
          <div className="w-48 bg-white/5 border-r border-white/10 p-2 flex items-center justify-center">
            <span className="text-white/70 text-sm font-medium">Timecode</span>
          </div>
          <div className="flex-1 relative h-8">
            {Array.from({ length: Math.ceil(duration / 10) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 flex flex-col justify-between">
                <div
                  className="text-white/70 text-xs"
                  style={{ left: `${i * 10 * 10 * zoom}px`, position: "absolute" }}
                >
                  {formatTime(i * 10)}
                </div>
                <div
                  className="border-l border-white/30 h-2"
                  style={{ left: `${i * 10 * 10 * zoom}px`, position: "absolute", bottom: 0 }}
                />
              </div>
            ))}
            {/* Playhead */}
            <div
              ref={playheadRef}
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: `${currentTime * 10 * zoom}px` }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rotate-45" />
            </div>
          </div>
        </div>

        {/* Video Tracks */}
        {[1, 2].map((trackNum) => renderTimelineTrack(trackNum, "video"))}

        {/* Audio Tracks */}
        {[1, 2, 3].map((trackNum) => renderTimelineTrack(trackNum, "audio"))}
      </div>

      {/* Timeline Tools */}
      <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex items-center gap-2">
          <button className="p-2 bg-white/10 rounded hover:bg-white/20 transition-colors">
            <Scissors className="h-4 w-4 text-white" />
          </button>
          <button className="p-2 bg-white/10 rounded hover:bg-white/20 transition-colors">
            <Copy className="h-4 w-4 text-white" />
          </button>
          <button className="p-2 bg-white/10 rounded hover:bg-white/20 transition-colors">
            <Trash2 className="h-4 w-4 text-white" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          <button className="p-2 bg-white/10 rounded hover:bg-white/20 transition-colors">
            <RotateCcw className="h-4 w-4 text-white" />
          </button>
          <button className="p-2 bg-white/10 rounded hover:bg-white/20 transition-colors">
            <RotateCw className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">
            {selectedClips.length} clip{selectedClips.length !== 1 ? "s" : ""} selected
          </span>
          {selectedClips.length > 0 && (
            <button onClick={() => setSelectedClips([])} className="text-blue-400 hover:text-blue-300 text-sm">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Post-Production Timeline</h1>
          <p className="text-white/70">Collaborative editing with AI assistance and version control</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBranchModal(true)}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            New Version
          </button>
          <button
            onClick={() => setShowAIAssistant(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Brain className="h-4 w-4" />
            AI Assistant
          </button>
          <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      {/* Version & Collaboration Bar */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">{currentVersion?.name || "No Version"}</span>
              <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(currentVersion?.status || "")}`}>
                {currentVersion?.status}
              </span>
            </div>
            <div className="text-white/60 text-sm">
              by {currentVersion?.createdBy} •{" "}
              {currentVersion && new Date(currentVersion.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Active Collaborators */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/70" />
              <div className="flex -space-x-2">
                {activeUsers
                  .filter((user) => user.isOnline)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white/20"
                      style={{ backgroundColor: user.color }}
                      title={`${user.name} (${user.role})`}
                    >
                      {user.avatar}
                    </div>
                  ))}
              </div>
              <span className="text-white/60 text-sm">{activeUsers.filter((u) => u.isOnline).length} online</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm">Auto-save:</span>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`w-10 h-5 rounded-full transition-colors ${autoSave ? "bg-green-500" : "bg-white/20"
                  } relative`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${autoSave ? "translate-x-5" : "translate-x-0.5"
                    }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
        {[
          { id: "timeline", label: "Timeline", icon: Layers },
          { id: "versions", label: "Versions", icon: GitBranch },
          { id: "delivery", label: "Delivery", icon: Download },
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
        {activeView === "timeline" && <div className="p-6">{renderTimeline()}</div>}

        {activeView === "versions" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Version History</h2>
              <button
                onClick={() => setShowBranchModal(true)}
                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <GitBranch className="h-4 w-4" />
                Create Branch
              </button>
            </div>

            <div className="space-y-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`bg-white/5 rounded-lg border p-4 cursor-pointer transition-all duration-200 ${currentVersion?.id === version.id
                      ? "border-blue-400 bg-blue-500/10"
                      : "border-white/10 hover:border-white/20 hover:bg-white/10"
                    }`}
                  onClick={() => setCurrentVersion(version)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-5 w-5 text-purple-400" />
                      <h3 className="text-white font-medium">{version.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(version.status)}`}>
                        {version.status}
                      </span>
                      {currentVersion?.id === version.id && (
                        <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs">Current</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-sm">{new Date(version.createdAt).toLocaleDateString()}</span>
                      <button className="p-1 hover:bg-white/10 rounded">
                        <GitMerge className="h-4 w-4 text-white/70" />
                      </button>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm mb-3">{version.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span>by {version.createdBy}</span>
                      <span>{formatTime(version.duration)}</span>
                      <span>{version.clips.length} clips</span>
                    </div>
                    {version.changes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-xs">{version.changes.length} changes</span>
                        <button className="text-blue-400 hover:text-blue-300 text-xs">View diff</button>
                      </div>
                    )}
                  </div>

                  {version.parentVersion && (
                    <div className="mt-2 text-xs text-white/50">
                      Branched from: {versions.find((v) => v.id === version.parentVersion)?.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === "delivery" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Delivery & Export</h2>
              <button
                onClick={() => setShowDeliveryModal(true)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Export
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {deliverySpecs.map((spec) => (
                <div key={spec.id} className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">{spec.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs text-white ${spec.status === "completed"
                          ? "bg-green-500"
                          : spec.status === "processing"
                            ? "bg-yellow-500"
                            : spec.status === "failed"
                              ? "bg-red-500"
                              : "bg-gray-500"
                        }`}
                    >
                      {spec.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-white/70 mb-4">
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span className="text-white">{spec.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolution:</span>
                      <span className="text-white">{spec.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span className="text-white">{spec.platform}</span>
                    </div>
                    {spec.fileSize > 0 && (
                      <div className="flex justify-between">
                        <span>File Size:</span>
                        <span className="text-white">{formatFileSize(spec.fileSize)}</span>
                      </div>
                    )}
                  </div>

                  {spec.status === "processing" && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-white/70 mb-1">
                        <span>Progress</span>
                        <span>{spec.progress}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${spec.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-1">Est. {spec.estimatedTime} minutes remaining</div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {spec.status === "completed" && (
                      <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors">
                        <Download className="h-4 w-4 inline mr-2" />
                        Download
                      </button>
                    )}
                    {spec.status === "pending" && (
                      <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded transition-colors">
                        Start Export
                      </button>
                    )}
                    <button className="px-4 bg-white/10 hover:bg-white/20 text-white py-2 rounded transition-colors">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === "analytics" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Timeline Analytics</h2>
            <div className="text-center text-white/50 py-12">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Analytics Dashboard Coming Soon</h3>
              <p className="text-sm">Edit time tracking, collaboration metrics, and performance insights.</p>
            </div>
          </div>
        )}
      </div>

      {/* New Version Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Create New Version</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Version Name</label>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="e.g., Director's Cut v2"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Branch From</label>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white">
                  {currentVersion?.name || "Current Version"}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={createNewVersion}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg transition-colors"
              >
                Create Version
              </button>
              <button
                onClick={() => setShowBranchModal(false)}
                className="px-4 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
