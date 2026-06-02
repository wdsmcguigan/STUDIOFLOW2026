"use client"

import { useState, useRef } from "react"
import {
  Sparkles,
  ImageIcon,
  FileText,
  Mic,
  Video,
  Palette,
  Play,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react"

interface AIGenerationRequest {
  id: string
  type: "storyboard" | "moodboard" | "voice" | "contract" | "animatic" | "boardomatic"
  prompt: string
  context: Record<string, any>
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  result?: any
  error?: string
  createdAt: string
  estimatedTime?: number
}

interface AIGenerationContext {
  moduleId: string
  assetId?: string
  sceneId?: string
  projectId?: string
  additionalData?: Record<string, any>
}

interface AIGenerationProps {
  context: AIGenerationContext
  onGenerated?: (result: any) => void
  className?: string
  variant?: "button" | "panel" | "inline"
  availableTypes?: string[]
}

const AI_GENERATION_TYPES = {
  storyboard: {
    icon: ImageIcon,
    label: "Storyboard Panels",
    description: "Generate visual storyboard panels from script or description",
    estimatedTime: 30,
    color: "bg-blue-500",
  },
  moodboard: {
    icon: Palette,
    label: "Moodboard Images",
    description: "Create mood and reference images for visual direction",
    estimatedTime: 45,
    color: "bg-purple-500",
  },
  voice: {
    icon: Mic,
    label: "Voice Generation",
    description: "Generate voice-over from text with emotion and character",
    estimatedTime: 20,
    color: "bg-green-500",
  },
  contract: {
    icon: FileText,
    label: "Legal Document",
    description: "Generate contracts and legal documents from templates",
    estimatedTime: 15,
    color: "bg-orange-500",
  },
  animatic: {
    icon: Play,
    label: "Animatic",
    description: "Create animated sequence from storyboards with timing",
    estimatedTime: 120,
    color: "bg-red-500",
  },
  boardomatic: {
    icon: Video,
    label: "Boardomatic",
    description: "Generate rough animation from storyboard panels",
    estimatedTime: 90,
    color: "bg-indigo-500",
  },
}

export default function AIGenerationSystem({
  context,
  onGenerated,
  className = "",
  variant = "button",
  availableTypes,
}: AIGenerationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [activeRequests, setActiveRequests] = useState<AIGenerationRequest[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [generationHistory, setGenerationHistory] = useState<AIGenerationRequest[]>([])
  const [advancedSettings, setAdvancedSettings] = useState(false)
  const [settings, setSettings] = useState({
    style: "cinematic",
    quality: "high",
    aspectRatio: "16:9",
    voiceModel: "professional",
    emotion: "neutral",
    speed: 1.0,
  })

  const intervalRef = useRef<NodeJS.Timeout>()

  // Get available generation types based on context
  const getAvailableTypes = () => {
    if (availableTypes) {
      return availableTypes.filter((type) => AI_GENERATION_TYPES[type as keyof typeof AI_GENERATION_TYPES])
    }

    // Context-aware type filtering
    const { moduleId } = context
    switch (moduleId) {
      case "storyboard":
        return ["storyboard", "boardomatic", "animatic"]
      case "moodboard":
        return ["moodboard", "storyboard"]
      case "audio":
        return ["voice"]
      case "legal":
        return ["contract"]
      case "script":
        return ["storyboard", "voice"]
      case "vfx":
        return ["storyboard", "animatic"]
      default:
        return Object.keys(AI_GENERATION_TYPES)
    }
  }

  // Generate contextual prompt suggestions
  const getPromptSuggestions = () => {
    const { moduleId, additionalData } = context

    switch (selectedType) {
      case "storyboard":
        return [
          "Wide shot of protagonist entering abandoned warehouse at night",
          "Close-up reaction shot showing fear and determination",
          "Over-the-shoulder shot of character discovering evidence",
          "Dynamic action sequence with camera movement",
        ]
      case "moodboard":
        return [
          "Dark, moody thriller atmosphere with neon lighting",
          "Warm, nostalgic summer vibes with golden hour lighting",
          "Futuristic sci-fi aesthetic with clean lines and blue tones",
          "Gritty urban environment with industrial textures",
        ]
      case "voice":
        return [
          "Professional narrator voice, calm and authoritative",
          "Young adult character, excited and energetic",
          "Wise mentor figure, warm and reassuring",
          "Villain character, menacing but sophisticated",
        ]
      case "contract":
        return [
          "Location agreement for filming in public space",
          "Talent contract for lead actor with SAG rates",
          "Equipment rental agreement with insurance clauses",
          "Music licensing agreement for original composition",
        ]
      default:
        return []
    }
  }

  // Start AI generation
  const startGeneration = async () => {
    if (!selectedType || !prompt.trim()) return

    const request: AIGenerationRequest = {
      id: `gen_${Date.now()}`,
      type: selectedType as any,
      prompt: prompt.trim(),
      context,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
      estimatedTime: AI_GENERATION_TYPES[selectedType as keyof typeof AI_GENERATION_TYPES].estimatedTime,
    }

    setActiveRequests((prev) => [...prev, request])

    // Simulate AI generation process
    simulateGeneration(request)

    // Reset form
    setPrompt("")
    setSelectedType(null)
    setIsOpen(false)
  }

  // Simulate AI generation with realistic progress
  const simulateGeneration = async (request: AIGenerationRequest) => {
    const updateRequest = (updates: Partial<AIGenerationRequest>) => {
      setActiveRequests((prev) => prev.map((req) => (req.id === request.id ? { ...req, ...updates } : req)))
    }

    // Start processing
    updateRequest({ status: "processing", progress: 5 })

    // Simulate progress updates
    const progressSteps = [10, 25, 40, 60, 80, 95]
    for (const progress of progressSteps) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateRequest({ progress })
    }

    // Complete generation
    const result = generateMockResult(request.type, request.prompt)
    updateRequest({
      status: "completed",
      progress: 100,
      result,
    })

    // Move to history after a delay
    setTimeout(() => {
      setActiveRequests((prev) => prev.filter((req) => req.id !== request.id))
      setGenerationHistory((prev) => [...prev, { ...request, status: "completed", progress: 100, result }])

      // Notify parent component
      if (onGenerated) {
        onGenerated(result)
      }
    }, 2000)
  }

  // Generate mock results for different types
  const generateMockResult = (type: string, prompt: string) => {
    switch (type) {
      case "storyboard":
        return {
          panels: [
            {
              id: "panel_1",
              image: "/placeholder.svg?height=300&width=400&text=Storyboard+Panel+1",
              description: prompt,
              shotType: "Wide Shot",
              cameraMovement: "Static",
              duration: 3.5,
            },
            {
              id: "panel_2",
              image: "/placeholder.svg?height=300&width=400&text=Storyboard+Panel+2",
              description: "Follow-up reaction shot",
              shotType: "Close-up",
              cameraMovement: "Push In",
              duration: 2.0,
            },
          ],
          totalDuration: 5.5,
          style: settings.style,
        }
      case "moodboard":
        return {
          images: [
            {
              id: "mood_1",
              url: "/placeholder.svg?height=300&width=400&text=Mood+Image+1",
              tags: ["lighting", "atmosphere"],
            },
            {
              id: "mood_2",
              url: "/placeholder.svg?height=300&width=400&text=Mood+Image+2",
              tags: ["color", "texture"],
            },
            {
              id: "mood_3",
              url: "/placeholder.svg?height=300&width=400&text=Mood+Image+3",
              tags: ["composition", "mood"],
            },
            {
              id: "mood_4",
              url: "/placeholder.svg?height=300&width=400&text=Mood+Image+4",
              tags: ["reference", "style"],
            },
          ],
          palette: ["#1a1a2e", "#16213e", "#0f3460", "#533483"],
          theme: prompt,
        }
      case "voice":
        return {
          audioUrl: "/placeholder-audio.mp3",
          duration: 15.3,
          transcript: prompt,
          voiceModel: settings.voiceModel,
          emotion: settings.emotion,
          waveform: Array.from({ length: 100 }, () => Math.random() * 100),
        }
      case "contract":
        return {
          documentType: "Location Agreement",
          content: `LOCATION AGREEMENT\n\nThis agreement is made between [PRODUCTION COMPANY] and [LOCATION OWNER] for the use of premises located at [ADDRESS] for filming purposes.\n\n${prompt}\n\n[Generated legal content based on prompt...]`,
          clauses: ["Usage Rights", "Insurance Requirements", "Compensation", "Liability"],
          templateUsed: "Standard Location Agreement v2.1",
        }
      case "animatic":
        return {
          videoUrl: "/placeholder-video.mp4",
          duration: 30.0,
          scenes: 4,
          transitions: ["Cut", "Fade", "Dissolve"],
          audioTrack: "Temp music and sound effects",
          frameRate: 24,
        }
      case "boardomatic":
        return {
          videoUrl: "/placeholder-boardomatic.mp4",
          duration: 45.0,
          panels: 6,
          style: "Rough animation with camera moves",
          timing: "Based on script timing",
        }
      default:
        return { content: "Generated content", prompt }
    }
  }

  // Render generation button
  const renderButton = () => (
    <button
      onClick={() => setIsOpen(true)}
      className={`flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-300 ai-glow ${className}`}
    >
      <Sparkles className="h-4 w-4" />
      <span>Generate with AI</span>
    </button>
  )

  // Render inline panel
  const renderPanel = () => (
    <div
      className={`bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/20 rounded-xl p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="text-white font-medium">AI Generation</h3>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="text-white/70 hover:text-white text-sm">
          {showHistory ? "Hide History" : "Show History"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {getAvailableTypes().map((type) => {
          const config = AI_GENERATION_TYPES[type as keyof typeof AI_GENERATION_TYPES]
          return (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type)
                setIsOpen(true)
              }}
              className={`p-3 rounded-lg border border-white/20 hover:border-white/40 transition-colors text-left ${config.color}/20 hover:${config.color}/30`}
            >
              <config.icon className="h-5 w-5 text-white mb-2" />
              <div className="text-white text-sm font-medium">{config.label}</div>
              <div className="text-white/60 text-xs">{config.estimatedTime}s</div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // Render active generations
  const renderActiveGenerations = () => {
    if (activeRequests.length === 0) return null

    return (
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {activeRequests.map((request) => {
          const config = AI_GENERATION_TYPES[request.type]
          return (
            <div key={request.id} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-4 w-80">
              <div className="flex items-center gap-3 mb-3">
                <config.icon className="h-5 w-5 text-white" />
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">{config.label}</div>
                  <div className="text-white/60 text-xs truncate">{request.prompt}</div>
                </div>
                <div className="text-white/70 text-xs">
                  {request.status === "processing" ? `${request.progress}%` : request.status}
                </div>
              </div>

              {request.status === "processing" && (
                <div className="space-y-2">
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${request.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Generating...</span>
                    <span>
                      {request.estimatedTime &&
                        `~${Math.max(0, request.estimatedTime - Math.floor((request.progress / 100) * request.estimatedTime))}s`}
                    </span>
                  </div>
                </div>
              )}

              {request.status === "completed" && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Check className="h-4 w-4" />
                  <span>Generation complete!</span>
                </div>
              )}

              {request.status === "failed" && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Generation failed</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Main generation modal
  const renderModal = () => {
    if (!isOpen) return null

    const availableTypes = getAvailableTypes()
    const suggestions = getPromptSuggestions()

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">AI Generation</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Type Selection */}
            <div className="mb-6">
              <h3 className="text-white font-medium mb-3">What would you like to generate?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableTypes.map((type) => {
                  const config = AI_GENERATION_TYPES[type as keyof typeof AI_GENERATION_TYPES]
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`p-4 rounded-lg border transition-all text-left ${
                        selectedType === type
                          ? "border-purple-400 bg-purple-500/20"
                          : "border-white/20 hover:border-white/40 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <config.icon className="h-5 w-5 text-white" />
                        <span className="text-white font-medium">{config.label}</span>
                      </div>
                      <p className="text-white/60 text-sm">{config.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                        <Clock className="h-3 w-3" />
                        <span>~{config.estimatedTime} seconds</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Prompt Input */}
            {selectedType && (
              <div className="mb-6">
                <h3 className="text-white font-medium mb-3">Describe what you want to generate</h3>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Describe your ${AI_GENERATION_TYPES[selectedType as keyof typeof AI_GENERATION_TYPES].label.toLowerCase()}...`}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 resize-none"
                  rows={4}
                />

                {/* Prompt Suggestions */}
                {suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-white/70 text-sm mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setPrompt(suggestion)}
                          className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-full transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Settings */}
            {selectedType && (
              <div className="mb-6">
                <button
                  onClick={() => setAdvancedSettings(!advancedSettings)}
                  className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-3"
                >
                  <Settings className="h-4 w-4" />
                  <span>Advanced Settings</span>
                  {advancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {advancedSettings && (
                  <div className="bg-white/5 rounded-lg p-4 space-y-4">
                    {(selectedType === "storyboard" || selectedType === "moodboard") && (
                      <>
                        <div>
                          <label className="block text-white/70 text-sm mb-2">Style</label>
                          <select
                            value={settings.style}
                            onChange={(e) => setSettings((prev) => ({ ...prev, style: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                          >
                            <option value="cinematic">Cinematic</option>
                            <option value="realistic">Realistic</option>
                            <option value="stylized">Stylized</option>
                            <option value="sketch">Sketch</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-white/70 text-sm mb-2">Aspect Ratio</label>
                          <select
                            value={settings.aspectRatio}
                            onChange={(e) => setSettings((prev) => ({ ...prev, aspectRatio: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                          >
                            <option value="16:9">16:9 (Widescreen)</option>
                            <option value="4:3">4:3 (Standard)</option>
                            <option value="1:1">1:1 (Square)</option>
                            <option value="9:16">9:16 (Vertical)</option>
                          </select>
                        </div>
                      </>
                    )}

                    {selectedType === "voice" && (
                      <>
                        <div>
                          <label className="block text-white/70 text-sm mb-2">Voice Model</label>
                          <select
                            value={settings.voiceModel}
                            onChange={(e) => setSettings((prev) => ({ ...prev, voiceModel: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                          >
                            <option value="professional">Professional</option>
                            <option value="conversational">Conversational</option>
                            <option value="dramatic">Dramatic</option>
                            <option value="youthful">Youthful</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-white/70 text-sm mb-2">Emotion</label>
                          <select
                            value={settings.emotion}
                            onChange={(e) => setSettings((prev) => ({ ...prev, emotion: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                          >
                            <option value="neutral">Neutral</option>
                            <option value="excited">Excited</option>
                            <option value="calm">Calm</option>
                            <option value="dramatic">Dramatic</option>
                            <option value="mysterious">Mysterious</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-white/70 text-sm mb-2">Quality</label>
                      <select
                        value={settings.quality}
                        onChange={(e) => setSettings((prev) => ({ ...prev, quality: e.target.value }))}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="draft">Draft (Fast)</option>
                        <option value="standard">Standard</option>
                        <option value="high">High Quality</option>
                        <option value="ultra">Ultra (Slow)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={startGeneration}
                disabled={!selectedType || !prompt.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all duration-300 font-medium"
              >
                <Zap className="h-4 w-4 inline mr-2" />
                Generate with AI
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {variant === "button" && renderButton()}
      {variant === "panel" && renderPanel()}
      {variant === "inline" && renderPanel()}

      {renderModal()}
      {renderActiveGenerations()}
    </>
  )
}

// Hook for using AI generation in components
export function useAIGeneration(context: AIGenerationContext) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const generate = async (type: string, prompt: string, settings?: any) => {
    setIsGenerating(true)
    // Implementation would call actual AI services
    // For now, return mock data
    setTimeout(() => {
      setIsGenerating(false)
      // Add result to results array
    }, 2000)
  }

  return {
    generate,
    isGenerating,
    results,
  }
}
