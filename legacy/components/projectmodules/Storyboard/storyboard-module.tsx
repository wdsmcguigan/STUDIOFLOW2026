"use client"

import { useState, useEffect } from "react"
import {
  Camera,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles,
  Wand2,
  ChevronDown,
  X,
  Check,
  ImageIcon,
  RefreshCw,
} from "lucide-react"
import Image from "next/image"

interface StoryboardModuleProps {
  searchQuery?: string
  projectId?: string
}

const MOCK_SHOTS_STORE: Record<string, Shot[]> = {}

interface Shot {
  id: string
  sceneNumber: string
  shotNumber: string
  title: string
  description: string
  cameraAngle: string
  movement: string
  duration: string
  status: "approved" | "review" | "draft" | "revision"
  lastModified: string
  author: string
  notes: string[]
  images: string[]
  aiPrompt?: string
  generatedOptions?: string[]
}

export default function StoryboardModule({ searchQuery = "", projectId = "1" }: StoryboardModuleProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list" | "timeline">("grid")
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null)
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [currentShotForAI, setCurrentShotForAI] = useState<Shot | null>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [showPromptEnhancer, setShowPromptEnhancer] = useState(false)

  const [shots, setShots] = useState<Shot[]>([])

  useEffect(() => {
    if (MOCK_SHOTS_STORE[projectId]) {
      setShots(MOCK_SHOTS_STORE[projectId])
      return
    }

    const initialShots: Shot[] = [
      {
        id: "1",
        sceneNumber: "1",
        shotNumber: "1A",
        title: "Establishing shot of the futuristic city at dawn",
        description: "Camera slowly pans across the cityscape revealing flying cars and holographic advertisements",
        cameraAngle: "Wide",
        movement: "Slow pan left to right",
        duration: "8s",
        status: "approved",
        lastModified: "2 hours ago",
        author: "Sarah Chen",
        notes: ["VFX heavy scene", "Drone shots required"],
        images: ["/placeholder.svg?height=300&width=400"],
      },
      {
        id: "2",
        sceneNumber: "1",
        shotNumber: "1B",
        title: "Close-up of protagonist looking out window",
        description: "Character turns from window, expression shows determination",
        cameraAngle: "Close Up",
        movement: "Static, then slow forward",
        duration: "4s",
        status: "review",
        lastModified: "1 day ago",
        author: "Emma Davis",
        notes: ["Need to establish character motivation", "Add more world-building details"],
        images: ["/placeholder.svg?height=300&width=400"],
      },
      {
        id: "3",
        sceneNumber: "2",
        shotNumber: "2A",
        title: "Medium shot of holographic interface activation",
        description: "Holographic displays come to life around the character",
        cameraAngle: "Medium Shot",
        movement: "Slight dolly forward",
        duration: "3s",
        status: "draft",
        lastModified: "3 hours ago",
        author: "David Kim",
        notes: ["Needs more tension", "Consider adding flashback"],
        images: ["/placeholder.svg?height=300&width=400"],
      },
      {
        id: "4",
        sceneNumber: "2",
        shotNumber: "2B",
        title: "Over-shoulder shot of character reading data",
        description: "Character discovers encrypted information on holographic display",
        cameraAngle: "Over Shoulder",
        movement: "Static",
        duration: "5s",
        status: "revision",
        lastModified: "5 hours ago",
        author: "Lisa Park",
        notes: ["Adjust lighting for better readability", "VFX team needs reference"],
        images: ["/placeholder.svg?height=300&width=400"],
      },
    ]

    if (projectId === "2") {
      initialShots.shift()
      initialShots[0].title = "Urban Legend Opening"
    } else if (projectId === "3") {
      initialShots.pop()
      initialShots[0].title = "Summer Vibes Intro"
    }

    MOCK_SHOTS_STORE[projectId] = initialShots
    setShots(initialShots)
  }, [projectId])

  useEffect(() => {
    if (shots.length > 0 && projectId) {
      MOCK_SHOTS_STORE[projectId] = shots
    }
  }, [shots, projectId])

  const handleAIGeneration = async (shot: Shot) => {
    setCurrentShotForAI(shot)
    setAiPrompt(shot.description)
    setShowAIGenerator(true)
  }

  const generateImages = async () => {
    setIsGenerating(true)

    // Simulate AI image generation
    setTimeout(() => {
      const newImages = [
        `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(aiPrompt + " option 1")}`,
        `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(aiPrompt + " option 2")}`,
        `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(aiPrompt + " option 3")}`,
        `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(aiPrompt + " option 4")}`,
      ]
      setGeneratedImages(newImages)
      setIsGenerating(false)
    }, 3000)
  }

  const enhancePrompt = () => {
    const enhancedPrompt = `${aiPrompt}, cinematic lighting, professional cinematography, detailed storyboard style, high quality concept art, dramatic composition`
    setAiPrompt(enhancedPrompt)
    setShowPromptEnhancer(false)
  }

  const selectGeneratedImage = (imageUrl: string) => {
    if (currentShotForAI) {
      const updatedShots = shots.map((shot) =>
        shot.id === currentShotForAI.id ? { ...shot, images: [...shot.images, imageUrl], aiPrompt } : shot,
      )
      setShots(updatedShots)
      setShowAIGenerator(false)
      setGeneratedImages([])
      setCurrentShotForAI(null)
      setAiPrompt("")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500"
      case "review":
        return "bg-yellow-500"
      case "draft":
        return "bg-blue-500"
      case "revision":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const filteredShots = shots.filter(
    (shot) =>
      shot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shot.cameraAngle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shot.sceneNumber.includes(searchQuery) ||
      shot.shotNumber.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const ShotCard = ({ shot }: { shot: Shot }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
        {/* Compact Header - Always Visible */}
        <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-xs">{shot.shotNumber}</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{shot.title}</h3>
                <p className="text-white/60 text-xs">
                  Scene {shot.sceneNumber} • {shot.cameraAngle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(shot.status)}`}>
                {shot.status.toUpperCase()}
              </span>
              <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>
          </div>

          {/* Image Preview - Always Visible */}
          {shot.images.length > 0 && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
              <Image
                src={shot.images[currentImageIndex] || "/placeholder.svg"}
                alt={shot.title}
                fill
                className="object-cover"
              />
              {shot.images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/50 rounded-full px-2 py-1">
                  <span className="text-white text-xs">
                    {currentImageIndex + 1}/{shot.images.length}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Short Description - Always Visible */}
          <p className="text-white/70 text-sm line-clamp-2">{shot.description}</p>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-white/10">
            <div className="mt-4 space-y-4">
              {/* Image Gallery */}
              {shot.images.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/50 text-xs">Images ({shot.images.length})</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAIGeneration(shot)
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                      >
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        <span className="text-purple-400 text-xs">Generate AI Options</span>
                      </button>
                      <button className="p-1 rounded hover:bg-white/10 transition-colors">
                        <Upload className="h-3 w-3 text-white/70" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {shot.images.map((image, index) => (
                      <div
                        key={index}
                        className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${currentImageIndex === index ? "border-blue-400" : "border-transparent"
                          }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex(index)
                        }}
                      >
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`${shot.title} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shot Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-white/50 text-xs">Camera Movement</span>
                  <p className="text-white text-sm">{shot.movement}</p>
                </div>
                <div>
                  <span className="text-white/50 text-xs">Duration</span>
                  <p className="text-white text-sm">{shot.duration}</p>
                </div>
                <div>
                  <span className="text-white/50 text-xs">Author</span>
                  <p className="text-white text-sm">{shot.author}</p>
                </div>
                <div>
                  <span className="text-white/50 text-xs">Last Modified</span>
                  <p className="text-white text-sm">{shot.lastModified}</p>
                </div>
              </div>

              {/* AI Prompt */}
              {shot.aiPrompt && (
                <div>
                  <span className="text-white/50 text-xs">AI Prompt Used</span>
                  <p className="text-white/70 text-sm bg-white/5 rounded-lg p-2 mt-1">{shot.aiPrompt}</p>
                </div>
              )}

              {/* Notes */}
              {shot.notes.length > 0 && (
                <div>
                  <span className="text-white/50 text-xs">Notes</span>
                  <div className="mt-1 space-y-1">
                    {shot.notes.map((note, i) => (
                      <p key={i} className="text-white/70 text-sm">
                        • {note}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  {shot.images.length === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAIGeneration(shot)
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg transition-all duration-300"
                    >
                      <Brain className="h-3 w-3" />
                      <span className="text-xs">Generate Images</span>
                    </button>
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
          <h1 className="text-3xl font-bold text-white mb-2">Storyboard</h1>
          <p className="text-white/70">Visual planning and shot composition with AI-powered image generation</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-300">
            <Brain className="h-4 w-4" />
            AI Storyboard Generator
          </button>
          <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            Add Shot
          </button>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
            <Upload className="h-4 w-4" />
            Import Images
          </button>
        </div>
      </div>

      {/* Stats Cards - Much Narrower */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="h-4 w-4 text-blue-400" />
            <span className="text-white/70 text-xs">Total Shots</span>
          </div>
          <p className="text-white font-bold text-lg">{shots.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-white/70 text-xs">Approved</span>
          </div>
          <p className="text-white font-bold text-lg">{shots.filter((s) => s.status === "approved").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-white/70 text-xs">Review</span>
          </div>
          <p className="text-white font-bold text-lg">{shots.filter((s) => s.status === "review").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Edit className="h-4 w-4 text-blue-400" />
            <span className="text-white/70 text-xs">Draft</span>
          </div>
          <p className="text-white font-bold text-lg">{shots.filter((s) => s.status === "draft").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="h-4 w-4 text-purple-400" />
            <span className="text-white/70 text-xs">Images</span>
          </div>
          <p className="text-white font-bold text-lg">{shots.reduce((acc, shot) => acc + shot.images.length, 0)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-white/70 text-xs">AI Generated</span>
          </div>
          <p className="text-white font-bold text-lg">{shots.filter((s) => s.aiPrompt).length}</p>
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
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "timeline" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Timeline
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="review">In Review</option>
            <option value="draft">Draft</option>
            <option value="revision">Revision</option>
          </select>
          <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
            <option value="scene">Sort by Scene</option>
            <option value="shot">Shot Number</option>
            <option value="modified">Last Modified</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Shots Grid/List */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
        {filteredShots.map((shot) => (
          <ShotCard key={shot.id} shot={shot} />
        ))}
      </div>

      {/* AI Image Generator Modal */}
      {showAIGenerator && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">AI Image Generator</h3>
                <p className="text-white/70">Generate storyboard images for: {currentShotForAI?.title}</p>
              </div>
              <button
                onClick={() => setShowAIGenerator(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>

            {/* Prompt Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/70 text-sm">Prompt</label>
                <button
                  onClick={() => setShowPromptEnhancer(!showPromptEnhancer)}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                >
                  <Wand2 className="h-3 w-3 text-purple-400" />
                  <span className="text-purple-400 text-xs">Enhance Prompt</span>
                </button>
              </div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/50 resize-none"
                rows={3}
                placeholder="Describe the image you want to generate..."
              />

              {showPromptEnhancer && (
                <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-white/70 text-sm mb-2">AI will enhance your prompt with:</p>
                  <ul className="text-white/60 text-xs space-y-1">
                    <li>• Cinematic lighting and composition</li>
                    <li>• Professional cinematography terms</li>
                    <li>• Storyboard-specific styling</li>
                    <li>• High-quality visual descriptors</li>
                  </ul>
                  <button
                    onClick={enhancePrompt}
                    className="mt-2 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs transition-colors"
                  >
                    Apply Enhancement
                  </button>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="mb-6">
              <button
                onClick={generateImages}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating Images...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate 4 Options
                  </>
                )}
              </button>
            </div>

            {/* Generated Images */}
            {generatedImages.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-4">Generated Options (Click to Select)</h4>
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                      onClick={() => selectGeneratedImage(image)}
                    >
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`Generated option ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 hover:opacity-100 transition-opacity bg-blue-500 rounded-full p-2">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
