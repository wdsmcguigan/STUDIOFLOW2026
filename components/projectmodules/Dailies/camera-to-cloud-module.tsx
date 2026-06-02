"use client"

import { useState } from "react"
import {
  Camera,
  Upload,
  Play,
  Eye,
  Star,
  Search,
  CheckCircle,
  Users,
  MapPin,
  Brain,
  BarChart3,
  Activity,
  HardDrive,
  Settings,
  Maximize,
  Volume2,
  SkipBack,
  SkipForward,
  FileVideo,
  FileImage,
  FileAudio,
  Database,
} from "lucide-react"

interface MediaAsset {
  id: string
  filename: string
  type: "video" | "image" | "audio"
  format: string
  size: number
  duration?: number
  resolution?: string
  fps?: number
  bitrate?: number
  uploadTime: string
  shootingDay: number
  sceneNumber?: number
  takeNumber?: number
  camera: string
  location: string
  status: "uploading" | "processing" | "ready" | "archived"
  thumbnail: string
  proxyUrl?: string
  originalUrl?: string
  metadata: {
    colorSpace?: string
    codec?: string
    timecode?: string
    lens?: string
    iso?: number
    aperture?: string
    shutterSpeed?: string
    whiteBalance?: number
  }
  tags: string[]
  notes: string
  reviews: {
    user: string
    rating: number
    comment: string
    timestamp: string
  }[]
  aiAnalysis?: {
    quality: number
    exposure: string
    focus: string
    composition: string
    suggestions: string[]
  }
}

interface CameraFeed {
  id: string
  name: string
  status: "online" | "offline" | "recording" | "standby"
  location: string
  operator: string
  batteryLevel: number
  storageUsed: number
  storageTotal: number
  signalStrength: number
  currentScene?: number
  currentTake?: number
  isRecording: boolean
  lastActivity: string
}

export default function CameraToCloudModule() {
  const [activeView, setActiveView] = useState<"live" | "assets" | "review" | "analytics">("live")
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filterType, setFilterType] = useState<"all" | "video" | "image" | "audio">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Sample camera feeds
  const cameraFeeds: CameraFeed[] = [
    {
      id: "cam-a",
      name: "Camera A (Main)",
      status: "recording",
      location: "Studio A - Set 1",
      operator: "John Smith",
      batteryLevel: 85,
      storageUsed: 120,
      storageTotal: 256,
      signalStrength: 95,
      currentScene: 12,
      currentTake: 3,
      isRecording: true,
      lastActivity: "2 minutes ago",
    },
    {
      id: "cam-b",
      name: "Camera B (Wide)",
      status: "standby",
      location: "Studio A - Set 1",
      operator: "Sarah Johnson",
      batteryLevel: 92,
      storageUsed: 89,
      storageTotal: 256,
      signalStrength: 88,
      currentScene: 12,
      currentTake: 3,
      isRecording: false,
      lastActivity: "5 minutes ago",
    },
    {
      id: "cam-c",
      name: "Camera C (Close)",
      status: "online",
      location: "Studio B - Set 2",
      operator: "Mike Davis",
      batteryLevel: 67,
      storageUsed: 156,
      storageTotal: 256,
      signalStrength: 72,
      isRecording: false,
      lastActivity: "15 minutes ago",
    },
  ]

  // Sample media assets
  const mediaAssets: MediaAsset[] = [
    {
      id: "asset-1",
      filename: "SC012_T003_CAM-A.mov",
      type: "video",
      format: "ProRes 422 HQ",
      size: 2.4 * 1024 * 1024 * 1024, // 2.4GB
      duration: 180,
      resolution: "4K (4096x2160)",
      fps: 24,
      bitrate: 110,
      uploadTime: "2024-03-15T14:30:00Z",
      shootingDay: 1,
      sceneNumber: 12,
      takeNumber: 3,
      camera: "Camera A",
      location: "Studio A - Set 1",
      status: "ready",
      thumbnail: "/placeholder.svg?height=200&width=300",
      proxyUrl: "/proxy/asset-1.mp4",
      originalUrl: "/original/asset-1.mov",
      metadata: {
        colorSpace: "Rec. 709",
        codec: "ProRes 422 HQ",
        timecode: "01:00:00:00",
        lens: "50mm f/1.4",
        iso: 800,
        aperture: "f/2.8",
        shutterSpeed: "1/48",
        whiteBalance: 5600,
      },
      tags: ["master-shot", "dialogue", "interior"],
      notes: "Great performance from both actors. Consider this the hero take.",
      reviews: [
        {
          user: "Director",
          rating: 5,
          comment: "Perfect! This is the one we'll use.",
          timestamp: "2024-03-15T14:45:00Z",
        },
      ],
      aiAnalysis: {
        quality: 94,
        exposure: "optimal",
        focus: "sharp",
        composition: "well-balanced",
        suggestions: ["Consider color grading to enhance mood", "Audio levels are excellent"],
      },
    },
    {
      id: "asset-2",
      filename: "SC012_T002_CAM-B.mov",
      type: "video",
      format: "ProRes 422 HQ",
      size: 1.8 * 1024 * 1024 * 1024,
      duration: 145,
      resolution: "4K (4096x2160)",
      fps: 24,
      bitrate: 110,
      uploadTime: "2024-03-15T14:15:00Z",
      shootingDay: 1,
      sceneNumber: 12,
      takeNumber: 2,
      camera: "Camera B",
      location: "Studio A - Set 1",
      status: "ready",
      thumbnail: "/placeholder.svg?height=200&width=300",
      proxyUrl: "/proxy/asset-2.mp4",
      originalUrl: "/original/asset-2.mov",
      metadata: {
        colorSpace: "Rec. 709",
        codec: "ProRes 422 HQ",
        timecode: "01:00:00:00",
        lens: "24-70mm f/2.8",
        iso: 800,
        aperture: "f/4.0",
        shutterSpeed: "1/48",
        whiteBalance: 5600,
      },
      tags: ["wide-shot", "coverage", "interior"],
      notes: "Good coverage angle. Slight camera shake at 1:20.",
      reviews: [],
      aiAnalysis: {
        quality: 87,
        exposure: "slightly underexposed",
        focus: "sharp",
        composition: "good",
        suggestions: ["Increase exposure by 0.3 stops in post", "Stabilize shake at 1:20"],
      },
    },
    {
      id: "asset-3",
      filename: "BTS_001.jpg",
      type: "image",
      format: "RAW",
      size: 45 * 1024 * 1024,
      uploadTime: "2024-03-15T13:45:00Z",
      shootingDay: 1,
      camera: "Still Camera",
      location: "Studio A - Set 1",
      status: "ready",
      thumbnail: "/placeholder.svg?height=200&width=300",
      originalUrl: "/original/bts-001.raw",
      metadata: {
        lens: "85mm f/1.8",
        iso: 400,
        aperture: "f/2.8",
        shutterSpeed: "1/125",
      },
      tags: ["behind-the-scenes", "cast", "candid"],
      notes: "Great candid shot of the cast between takes.",
      reviews: [],
    },
  ]

  const simulateUpload = () => {
    setIsUploading(true)
    setUploadProgress(0)

    const uploadInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(uploadInterval)
          setIsUploading(false)
          return 100
        }
        return prev + Math.random() * 8
      })
    }, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-400"
      case "recording":
        return "text-red-400"
      case "standby":
        return "text-yellow-400"
      case "offline":
        return "text-gray-400"
      case "ready":
        return "text-green-400"
      case "processing":
        return "text-blue-400"
      case "uploading":
        return "text-yellow-400"
      case "archived":
        return "text-gray-400"
      default:
        return "text-gray-400"
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video":
        return FileVideo
      case "image":
        return FileImage
      case "audio":
        return FileAudio
      default:
        return FileVideo
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const filteredAssets = mediaAssets.filter((asset) => {
    const matchesType = filterType === "all" || asset.type === filterType
    const matchesSearch =
      asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesType && matchesSearch
  })

  const totalStorage = mediaAssets.reduce((sum, asset) => sum + asset.size, 0)
  const readyAssets = mediaAssets.filter((asset) => asset.status === "ready").length
  const activeCameras = cameraFeeds.filter((cam) => cam.status === "online" || cam.status === "recording").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Camera to Cloud</h1>
          <p className="text-white/70">Real-time asset ingestion and collaborative review</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={simulateUpload}
            disabled={isUploading}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload Files"}
          </button>
          <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Camera className="h-4 w-4" />
            Connect Camera
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-5 w-5 text-blue-400" />
            <span className="text-white/70 text-sm">Active Cameras</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {activeCameras}/{cameraFeeds.length}
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-white/70 text-sm">Ready Assets</span>
          </div>
          <div className="text-2xl font-bold text-white">{readyAssets}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="h-5 w-5 text-purple-400" />
            <span className="text-white/70 text-sm">Storage Used</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatFileSize(totalStorage)}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-yellow-400" />
            <span className="text-white/70 text-sm">Upload Speed</span>
          </div>
          <div className="text-2xl font-bold text-white">125 MB/s</div>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 font-medium">Uploading Assets...</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-white/70">
            <span>Uploading SC013_T001_CAM-A.mov</span>
            <span>{uploadProgress.toFixed(0)}% complete</span>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
        {[
          { id: "live", label: "Live Feeds", icon: Camera },
          { id: "assets", label: "Asset Library", icon: Database },
          { id: "review", label: "Review & Approval", icon: Eye },
          { id: "analytics", label: "Analytics", icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeView === tab.id ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 min-h-[600px]">
        {activeView === "live" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Live Camera Feeds</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {cameraFeeds.map((feed) => (
                <div key={feed.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                  <div className="aspect-video bg-black/50 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="h-16 w-16 text-white/30" />
                    </div>
                    {feed.isRecording && (
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        REC
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">{feed.signalStrength}%</div>
                      <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">{feed.batteryLevel}%</div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">{feed.name}</h3>
                      <span className={`text-sm ${getStatusColor(feed.status)}`}>{feed.status.toUpperCase()}</span>
                    </div>

                    <div className="space-y-2 text-sm text-white/70">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {feed.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {feed.operator}
                      </div>
                      {feed.currentScene && (
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Scene {feed.currentScene}, Take {feed.currentTake}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Storage</span>
                        <span>
                          {feed.storageUsed}GB / {feed.storageTotal}GB
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1">
                        <div
                          className="bg-blue-400 h-1 rounded-full"
                          style={{ width: `${(feed.storageUsed / feed.storageTotal) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded text-sm transition-colors">
                        View Live
                      </button>
                      <button className="px-3 bg-white/10 hover:bg-white/20 text-white py-2 rounded transition-colors">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === "assets" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Asset Library</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-white/10 border border-white/20 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                >
                  <option value="all">All Types</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="audio">Audio</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => {
                const FileIcon = getFileIcon(asset.type)
                return (
                  <div
                    key={asset.id}
                    className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="aspect-video bg-black/30 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileIcon className="h-12 w-12 text-white/50" />
                      </div>
                      <div className="absolute top-2 left-2">
                        <span
                          className={`px-2 py-1 rounded text-xs text-white ${
                            asset.status === "ready"
                              ? "bg-green-500"
                              : asset.status === "processing"
                                ? "bg-blue-500"
                                : asset.status === "uploading"
                                  ? "bg-yellow-500"
                                  : "bg-gray-500"
                          }`}
                        >
                          {asset.status}
                        </span>
                      </div>
                      {asset.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          {formatDuration(asset.duration)}
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="text-white font-medium text-sm mb-1 truncate">{asset.filename}</h3>
                      <div className="text-xs text-white/70 space-y-1">
                        <div>{asset.format}</div>
                        <div>{formatFileSize(asset.size)}</div>
                        {asset.resolution && <div>{asset.resolution}</div>}
                      </div>

                      {asset.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {asset.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                          {asset.tags.length > 2 && (
                            <span className="text-white/50 text-xs">+{asset.tags.length - 2}</span>
                          )}
                        </div>
                      )}

                      {asset.aiAnalysis && (
                        <div className="mt-2 flex items-center gap-1">
                          <Brain className="h-3 w-3 text-purple-400" />
                          <span className="text-xs text-purple-400">AI: {asset.aiAnalysis.quality}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeView === "review" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Review & Approval</h2>
            {selectedAsset ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-black rounded-lg aspect-video mb-4 flex items-center justify-center">
                    <Play className="h-16 w-16 text-white/50" />
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                      <SkipBack className="h-4 w-4 text-white" />
                    </button>
                    <button className="p-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
                      <Play className="h-5 w-5 text-white" />
                    </button>
                    <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                      <SkipForward className="h-4 w-4 text-white" />
                    </button>
                    <div className="flex-1 bg-white/20 rounded-full h-1">
                      <div className="bg-blue-400 h-1 rounded-full w-1/3"></div>
                    </div>
                    <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                      <Volume2 className="h-4 w-4 text-white" />
                    </button>
                    <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                      <Maximize className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-2">{selectedAsset.filename}</h3>
                    <div className="space-y-2 text-sm text-white/70">
                      <div>
                        Scene {selectedAsset.sceneNumber}, Take {selectedAsset.takeNumber}
                      </div>
                      <div>
                        {selectedAsset.camera} • {selectedAsset.location}
                      </div>
                      <div>
                        {selectedAsset.format} • {formatFileSize(selectedAsset.size)}
                      </div>
                      {selectedAsset.duration && <div>Duration: {formatDuration(selectedAsset.duration)}</div>}
                    </div>
                  </div>

                  {selectedAsset.aiAnalysis && (
                    <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-purple-400" />
                        <span className="text-purple-400 font-medium text-sm">AI Analysis</span>
                      </div>
                      <div className="space-y-1 text-sm text-white/80">
                        <div>Quality: {selectedAsset.aiAnalysis.quality}%</div>
                        <div>Exposure: {selectedAsset.aiAnalysis.exposure}</div>
                        <div>Focus: {selectedAsset.aiAnalysis.focus}</div>
                        <div>Composition: {selectedAsset.aiAnalysis.composition}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-white font-medium mb-2">Reviews</h4>
                    {selectedAsset.reviews.length > 0 ? (
                      <div className="space-y-2">
                        {selectedAsset.reviews.map((review, i) => (
                          <div key={i} className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm">{review.user}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, j) => (
                                  <Star
                                    key={j}
                                    className={`h-3 w-3 ${j < review.rating ? "text-yellow-400 fill-current" : "text-gray-400"}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-white/80 text-sm">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/50 text-sm">No reviews yet</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors">
                      Approve
                    </button>
                    <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg transition-colors">
                      Request Changes
                    </button>
                    <button className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-white/50 py-12">
                <Eye className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select an Asset to Review</h3>
                <p className="text-sm">Choose an asset from the library to start the review process.</p>
              </div>
            )}
          </div>
        )}

        {activeView === "analytics" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Upload Analytics</h2>
            <div className="text-center text-white/50 py-12">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Analytics Dashboard Coming Soon</h3>
              <p className="text-sm">Detailed upload statistics, bandwidth usage, and performance metrics.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
