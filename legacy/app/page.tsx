"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Plus,
  Search,
  Settings,
  Menu,
  Clock,
  MapPin,
  Users,
  Calendar,
  X,
  Film,
  FileText,
  Camera,
  Palette,
  Play,
  Zap,
  BarChart3,
  Brain,
  Target,
  TrendingUp,
  PlayCircle,
  Edit3,
  Layers,
  Video,
  Music,
  Download,
  Upload,
  Bell,
  Archive,
  Cloud,
  ChevronRight,
  ChevronDown,
  Check,
  DollarSign,
  Megaphone,
  Globe,
  Filter,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Folder, // Added Folder icon
  RefreshCw, // Added
} from "lucide-react"
import AppSidebar from "../components/layout/app-sidebar"
import ScriptModule from "../components/projectmodules/Script/script-module"
import ScheduleModule from "../components/projectmodules/Schedule/schedule-module"
import CameraToCloudModule from "../components/projectmodules/Dailies/camera-to-cloud-module"
import OriginalCalendar from "../components/globalmodules/original-calendar"
import ContactsManager from "../components/globalmodules/contacts"
import SettingsPage from "../components/settings-page"
import CastManagement from "../components/projectmodules/Cast/cast-management"
import LocationScouting from "../components/projectmodules/Locations/location-scouting"
import BudgetTracking from "../components/projectmodules/Analytics/budget-tracking"
import BudgetModule from "../components/projectmodules/Budget/budget-module"
import VFXPipeline from "../components/projectmodules/VFX/vfx-pipeline"
import TeamCollaborationHub from "../components/projectmodules/Team/team-collaboration-hub"
import GearManagement from "../components/projectmodules/Gear/gear-management"
import StoryboardModule from "../components/projectmodules/Storyboard/storyboard-module"
import AudioModule from "../components/projectmodules/Audio/audio-module"
import MoodboardModule from "../components/projectmodules/Moodboard/moodboard-module"
import LegalDocuments from "../components/projectmodules/Legal/legal-documents"
import CallSheets from "../components/projectmodules/CallSheets/call-sheets"
import AnalyticsDashboard from "../components/projectmodules/Analytics/analytics-dashboard"
import UserManagement from "../components/projectmodules/Users/user-management"
import DailiesReviewModule from "../components/projectmodules/Dailies/dailies-review-module"
import PostProductionTimeline from "../components/projectmodules/PostProduction/post-production-timeline"
import AIGenerationSystem from "../components/creation-flow/ai-generation-system"
import GlobalSettings from "../components/globalmodules/Settings/global-settings"
import ProjectSettings from "../components/projectmodules/Settings/project-settings"
import AssetManagement from "../components/projectmodules/Assets/asset-management"
import ContentFlow from "../components/creation-flow/content-flow"
import { useProjectActions } from "../components/hooks/useProjectActions"
import { useLiveQuery } from "dexie-react-hooks"
import { db, seedMockData, DEFAULT_FOLDERS, type Project } from "../lib/db"

// Types for production data
// Types are now imported from lib/db


interface ProductionModule {
  id: string
  name: string
  icon: any
  status: "active" | "pending" | "completed" | "blocked"
  progress: number
  lastUpdated: string
  assignedTo: string[]
  aiSuggestions?: string[]
}

interface SearchMode {
  global: boolean
  moduleSpecific: boolean
  dynamicFollow: boolean
}

interface ModuleFilters {
  [key: string]: {
    name: string
    options: { value: string; label: string }[]
    value: string
  }[]
}

export default function StudioFlowDashboard() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [showAIDropdown, setShowAIDropdown] = useState(false)
  const [aiAssistantCollapsed, setAiAssistantCollapsed] = useState(false)
  const [typedText, setTypedText] = useState("")
  const [currentView, setCurrentView] = useState("dashboard")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [headerView, setHeaderView] = useState<"dashboard" | "calendar" | "contacts">("dashboard")
  const [showAIInsights, setShowAIInsights] = useState(true)
  const [globalSettings, setGlobalSettings] = useState({
    backgroundImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
    backgroundType: "image" as "image" | "gradient" | "color",
    backgroundColor: "#1e293b",
  })

  // Enhanced search state
  const [searchQuery, setSearchQuery] = useState("")

  const { isExporting, exportProject } = useProjectActions()

  const [searchMode, setSearchMode] = useState<SearchMode>({
    global: true,
    moduleSpecific: false,
    dynamicFollow: false,
  })
  const [showSearchOptions, setShowSearchOptions] = useState(false)
  const [selectedSearchModule, setSelectedSearchModule] = useState("global")
  const [moduleFilters, setModuleFilters] = useState<{ [key: string]: string }>({})

  // AI Generation state
  const [activeGenerations, setActiveGenerations] = useState<any[]>([])
  const [generationHistory, setGenerationHistory] = useState<any[]>([])
  const [showAIGenerationPanel, setShowAIGenerationPanel] = useState(false)
  const [showContentFlow, setShowContentFlow] = useState(false)

  // Sample project data replaced with live query
  const projects = useLiveQuery(() => db.projects.toArray()) || []

  useEffect(() => {
    seedMockData()
  }, [])


  // Define all module filter configurations
  const moduleFilterConfigs: ModuleFilters = {
    cast: [
      {
        name: "role",
        options: [
          { value: "all", label: "All Roles" },
          { value: "lead", label: "Lead" },
          { value: "supporting", label: "Supporting" },
          { value: "background", label: "Background" },
          { value: "stunt", label: "Stunt" },
        ],
        value: "all",
      },
      {
        name: "status",
        options: [
          { value: "all", label: "All Status" },
          { value: "confirmed", label: "Confirmed" },
          { value: "pending", label: "Pending" },
          { value: "declined", label: "Declined" },
          { value: "backup", label: "Backup" },
        ],
        value: "all",
      },
      {
        name: "availability",
        options: [
          { value: "all", label: "All Availability" },
          { value: "available", label: "Available" },
          { value: "busy", label: "Busy" },
          { value: "unavailable", label: "Unavailable" },
        ],
        value: "all",
      },
    ],
    moodboard: [
      {
        name: "category",
        options: [
          { value: "all", label: "All Categories" },
          { value: "Environment", label: "Environment" },
          { value: "Character", label: "Character" },
          { value: "Color", label: "Color" },
          { value: "VFX", label: "VFX" },
          { value: "Lighting", label: "Lighting" },
          { value: "Typography", label: "Typography" },
        ],
        value: "all",
      },
      {
        name: "type",
        options: [
          { value: "all", label: "All Types" },
          { value: "image", label: "Images" },
          { value: "video", label: "Videos" },
          { value: "color", label: "Colors" },
          { value: "text", label: "Text" },
          { value: "link", label: "Links" },
        ],
        value: "all",
      },
    ],
    audio: [
      {
        name: "type",
        options: [
          { value: "all", label: "All Types" },
          { value: "dialogue", label: "Dialogue" },
          { value: "sfx", label: "SFX" },
          { value: "music", label: "Music" },
          { value: "ambient", label: "Ambient" },
          { value: "foley", label: "Foley" },
        ],
        value: "all",
      },
      {
        name: "status",
        options: [
          { value: "all", label: "All Status" },
          { value: "recording", label: "Recording" },
          { value: "editing", label: "Editing" },
          { value: "mixing", label: "Mixing" },
          { value: "mastered", label: "Mastered" },
          { value: "approved", label: "Approved" },
        ],
        value: "all",
      },
    ],
    vfx: [
      {
        name: "status",
        options: [
          { value: "all", label: "All Status" },
          { value: "planning", label: "Planning" },
          { value: "in-progress", label: "In Progress" },
          { value: "review", label: "Review" },
          { value: "approved", label: "Approved" },
          { value: "final", label: "Final" },
          { value: "delivered", label: "Delivered" },
        ],
        value: "all",
      },
      {
        name: "priority",
        options: [
          { value: "all", label: "All Priority" },
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
        ],
        value: "all",
      },
    ],
    "user-management": [
      {
        name: "department",
        options: [
          { value: "all", label: "All Departments" },
          { value: "Creative", label: "Creative" },
          { value: "Production", label: "Production" },
          { value: "Post-Production", label: "Post-Production" },
          { value: "Camera", label: "Camera" },
          { value: "VFX", label: "VFX" },
          { value: "Audio", label: "Audio" },
          { value: "Art", label: "Art" },
        ],
        value: "all",
      },
      {
        name: "status",
        options: [
          { value: "all", label: "All Status" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "pending", label: "Pending" },
        ],
        value: "all",
      },
    ],
    "call-sheets": [
      {
        name: "status",
        options: [
          { value: "all", label: "All Status" },
          { value: "draft", label: "Draft" },
          { value: "sent", label: "Sent" },
          { value: "confirmed", label: "Confirmed" },
        ],
        value: "all",
      },
    ],
    locations: [
      {
        name: "type",
        options: [
          { value: "all", label: "All Types" },
          { value: "interior", label: "Interior" },
          { value: "exterior", label: "Exterior" },
          { value: "studio", label: "Studio" },
          { value: "practical", label: "Practical" },
        ],
        value: "all",
      },
      {
        name: "status",
        options: [
          { value: "all", label: "All Status" },
          { value: "scouting", label: "Scouting" },
          { value: "contacted", label: "Contacted" },
          { value: "confirmed", label: "Confirmed" },
          { value: "rejected", label: "Rejected" },
        ],
        value: "all",
      },
    ],
    gear: [
      {
        name: "category",
        options: [
          { value: "all", label: "All Categories" },
          { value: "Camera", label: "Camera" },
          { value: "Lighting", label: "Lighting" },
          { value: "Audio", label: "Audio" },
          { value: "Grip", label: "Grip" },
          { value: "Electrical", label: "Electrical" },
        ],
        value: "all",
      },
      {
        name: "status",
        options: [
          { value: "all", label: "All Status" },
          { value: "available", label: "Available" },
          { value: "rented", label: "Rented" },
          { value: "maintenance", label: "Maintenance" },
          { value: "reserved", label: "Reserved" },
        ],
        value: "all",
      },
    ],
  }

  // Get all available modules for search scope
  const getAllModules = () => {
    const allModules = [
      ...productionModules,
      ...workflowModules,
      ...creativeModules,
      { id: "dashboard", name: "Dashboard", icon: BarChart3 },
      { id: "calendar", name: "Calendar", icon: Calendar },
      { id: "contacts", name: "Contacts", icon: Users },
    ]
    return allModules.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Update search mode when dynamic follow is enabled
  useEffect(() => {
    if (searchMode.dynamicFollow) {
      const currentModuleName = getCurrentModuleName()
      if (currentModuleName !== "Dashboard") {
        setSelectedSearchModule(currentView)
        setSearchMode((prev) => ({ ...prev, moduleSpecific: true, global: false }))
      } else {
        setSelectedSearchModule("global")
        setSearchMode((prev) => ({ ...prev, moduleSpecific: false, global: true }))
      }
    }
  }, [currentView, searchMode.dynamicFollow])

  // Initialize module filters
  useEffect(() => {
    const initialFilters: { [key: string]: string } = {}
    Object.keys(moduleFilterConfigs).forEach((moduleId) => {
      moduleFilterConfigs[moduleId].forEach((filter) => {
        initialFilters[`${moduleId}_${filter.name}`] = filter.value
      })
    })
    setModuleFilters(initialFilters)
  }, [])

  useEffect(() => {
    setIsLoaded(true)
    if (projects && projects.length > 0 && !currentProject) {
      setCurrentProject(projects[0])
    }
  }, [projects, currentProject])

  useEffect(() => {
    localStorage.setItem("aiAssistantPosition", JSON.stringify({ x: 0, y: 0 }))
  }, [])

  const handleSidebarNavigation = (moduleId: string) => {
    setCurrentView(moduleId)
    setHeaderView("dashboard")
  }

  const getCurrentModuleName = () => {
    const moduleMap: { [key: string]: string } = {
      script: "Script",
      schedule: "Schedule",
      storyboard: "Storyboard",
      gear: "Gear Management",
      budget: "Budget",
      "budget-module": "Budget Module",
      legal: "Legal Documents",
      audio: "Audio",
      moodboard: "Moodboard",
      vfx: "VFX Pipeline",
      crew: "Crew",
      cast: "Cast",
      locations: "Locations",
      "call-sheets": "Call Sheets",
      "user-management": "User Management",
      analytics: "Analytics",
      "dailies-review": "Dailies Review",
      "post-timeline": "Post Timeline",
    }
    return moduleMap[currentView] || "Dashboard"
  }

  const getSearchPlaceholder = () => {
    if (searchMode.global) {
      return "Search projects, assets, people..."
    } else if (selectedSearchModule && selectedSearchModule !== "global") {
      const moduleName = getAllModules().find((m) => m.id === selectedSearchModule)?.name || "Module"
      return `Search in ${moduleName}...`
    }
    return "Search..."
  }

  const getCurrentModuleFilters = () => {
    if (!searchMode.moduleSpecific || selectedSearchModule === "global") {
      return []
    }
    return moduleFilterConfigs[selectedSearchModule] || []
  }

  const handleFilterChange = (filterName: string, value: string) => {
    const filterKey = `${selectedSearchModule}_${filterName}`
    setModuleFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }))
  }

  const getFilterValue = (filterName: string) => {
    const filterKey = `${selectedSearchModule}_${filterName}`
    return moduleFilters[filterKey] || "all"
  }

  // AI Generation Integration
  const getAIGenerationContext = () => {
    return {
      moduleId: currentView,
      projectId: currentProject?.id,
      assetId: undefined,
      sceneId: undefined,
      additionalData: {
        projectTitle: currentProject?.title,
        projectStatus: currentProject?.status,
        currentModule: getCurrentModuleName(),
      },
    }
  }

  const handleAIGeneration = (type: string, customPrompt?: string) => {
    const context = getAIGenerationContext()
    const suggestions = getContextualAIPrompts(type)
    const prompt = customPrompt || suggestions[0] || `Generate ${type} for ${currentProject?.title}`

    // Create generation request
    const request = {
      id: `gen_${Date.now()}`,
      type,
      prompt,
      context,
      status: "pending" as const,
      progress: 0,
      createdAt: new Date().toISOString(),
    }

    setActiveGenerations((prev) => [...prev, request])

    // Simulate generation process
    simulateAIGeneration(request)
  }

  const simulateAIGeneration = async (request: any) => {
    const updateRequest = (updates: any) => {
      setActiveGenerations((prev) => prev.map((req) => (req.id === request.id ? { ...req, ...updates } : req)))
    }

    // Start processing
    updateRequest({ status: "processing", progress: 10 })

    // Simulate progress
    const progressSteps = [25, 50, 75, 90, 100]
    for (const progress of progressSteps) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      updateRequest({ progress })
    }

    // Complete generation
    const result = generateMockAIResult(request.type, request.prompt)
    updateRequest({ status: "completed", progress: 100, result })

    // Move to history after delay
    setTimeout(() => {
      setActiveGenerations((prev) => prev.filter((req) => req.id !== request.id))
      setGenerationHistory((prev) => [...prev, { ...request, status: "completed", result }])
    }, 2000)
  }

  const generateMockAIResult = (type: string, prompt: string) => {
    switch (type) {
      case "schedule":
        return {
          optimizedDays: 3,
          costSavings: 45000,
          suggestedChanges: ["Combine location shoots", "Optimize crew scheduling", "Weather contingency planning"],
          newSchedule: "Updated stripboard generated",
        }
      case "budget":
        return {
          analysis: "Budget optimization complete",
          savings: 127000,
          recommendations: ["Equipment rental optimization", "Location cost reduction", "Crew efficiency improvements"],
          riskFactors: ["Weather delays", "Equipment availability", "Permit delays"],
        }
      case "assets":
        return {
          generated: ["Storyboard panels", "Concept art", "Location references"],
          count: 12,
          ready: true,
        }
      case "risk":
        return {
          riskLevel: "Medium",
          criticalFactors: ["Budget overrun", "Weather delays", "Equipment availability"],
          mitigation: ["Contingency planning", "Alternative locations", "Backup equipment"],
          timeline: "Risk assessment complete",
        }
      default:
        return { content: "Generated successfully", type }
    }
  }

  const getContextualAIPrompts = (type: string) => {
    const moduleName = getCurrentModuleName()
    const projectTitle = currentProject?.title || "Current Project"

    switch (type) {
      case "schedule":
        return [
          `Optimize shooting schedule for ${projectTitle} to reduce costs`,
          `Generate weather-contingent schedule for exterior scenes`,
          `Create efficient crew scheduling for ${moduleName.toLowerCase()}`,
        ]
      case "budget":
        return [
          `Analyze budget efficiency for ${projectTitle}`,
          `Identify cost-saving opportunities in ${moduleName.toLowerCase()}`,
          `Generate budget forecast with risk factors`,
        ]
      case "assets":
        if (currentView === "storyboard") {
          return [
            `Generate storyboard panels for ${projectTitle}`,
            "Create shot compositions",
            "Design camera movements",
          ]
        } else if (currentView === "moodboard") {
          return [`Create mood references for ${projectTitle}`, "Generate color palettes", "Design visual concepts"]
        } else if (currentView === "audio") {
          return [
            `Generate audio concepts for ${projectTitle}`,
            "Create sound design references",
            "Generate music themes",
          ]
        }
        return [`Generate creative assets for ${projectTitle}`, `Create ${moduleName.toLowerCase()} content`]
      case "risk":
        return [
          `Analyze production risks for ${projectTitle}`,
          `Identify potential delays and mitigation strategies`,
          `Generate contingency plans for ${moduleName.toLowerCase()}`,
        ]
      default:
        return [`Generate content for ${projectTitle}`]
    }
  }

  const getAvailableGenerationTypes = () => {
    switch (currentView) {
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
        return ["storyboard", "moodboard", "voice", "contract"]
    }
  }

  // Project management handlers
  const handleAddProject = async (newProject: Project) => {
    await db.projects.add(newProject)
    setCurrentProject(newProject)
  }

  const handleUpdateProject = async (updatedProject: Project) => {
    await db.projects.put(updatedProject)
    if (currentProject?.id === updatedProject.id) {
      setCurrentProject(updatedProject)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    await db.projects.delete(projectId)
    if (currentProject?.id === projectId) {
      const nextProject = projects.find((p) => p.id !== projectId)
      setCurrentProject(nextProject || null)
    }
  }



  // Sample project data


  // Production modules for sidebar - Updated to include budget module
  const productionModules: ProductionModule[] = [
    {
      id: "budget-module",
      name: "Budget",
      icon: DollarSign,
      status: "active",
      progress: 85,
      lastUpdated: "30 min ago",
      assignedTo: ["Producer", "Accountant"],
      aiSuggestions: ["AI budget optimization available", "Cost-saving opportunities identified"],
    },
    {
      id: "script",
      name: "Script",
      icon: FileText,
      status: "active",
      progress: 90,
      lastUpdated: "2 hours ago",
      assignedTo: ["Writer", "Director"],
    },
    {
      id: "schedule",
      name: "Schedule",
      icon: Calendar,
      status: "active",
      progress: 75,
      lastUpdated: "1 hour ago",
      assignedTo: ["AD", "Producer"],
    },
    {
      id: "storyboard",
      name: "Storyboard",
      icon: Layers,
      status: "pending",
      progress: 45,
      lastUpdated: "1 day ago",
      assignedTo: ["Director", "Artist"],
    },
    {
      id: "previs",
      name: "Previs",
      icon: Play,
      status: "pending",
      progress: 30,
      lastUpdated: "2 days ago",
      assignedTo: ["VFX", "Director"],
    },
    {
      id: "cast",
      name: "Cast",
      icon: Users,
      status: "completed",
      progress: 100,
      lastUpdated: "3 days ago",
      assignedTo: ["Casting", "Producer"],
    },
    {
      id: "locations",
      name: "Locations",
      icon: MapPin,
      status: "active",
      progress: 80,
      lastUpdated: "4 hours ago",
      assignedTo: ["Location Manager"],
    },
    {
      id: "gear",
      name: "Gear",
      icon: Camera,
      status: "active",
      progress: 85,
      lastUpdated: "6 hours ago",
      assignedTo: ["Gaffer", "Sound"],
    },
    {
      id: "crew",
      name: "Crew",
      icon: Users,
      status: "completed",
      progress: 95,
      lastUpdated: "1 day ago",
      assignedTo: ["Producer", "AD"],
    },
    {
      id: "legal",
      name: "Legal Docs",
      icon: FileText,
      status: "active",
      progress: 85,
      lastUpdated: "2 hours ago",
      assignedTo: ["Legal", "Producer"],
    },
    {
      id: "call-sheets",
      name: "Call Sheets",
      icon: Megaphone,
      status: "active",
      progress: 90,
      lastUpdated: "30 min ago",
      assignedTo: ["AD", "Producer"],
    },
    {
      id: "analytics",
      name: "Analytics",
      icon: BarChart3,
      status: "active",
      progress: 95,
      lastUpdated: "1 hour ago",
      assignedTo: ["Producer", "Director"],
    },
    {
      id: "user-management",
      name: "User Management",
      icon: Users,
      status: "active",
      progress: 100,
      lastUpdated: "30 min ago",
      assignedTo: ["Admin", "Producer"],
    },
    {
      id: "dailies-review",
      name: "Dailies Review",
      icon: PlayCircle,
      status: "active",
      progress: 70,
      lastUpdated: "1 hour ago",
      assignedTo: ["Director", "Editor", "Producer"],
      aiSuggestions: ["3 shots flagged for quality review", "Automated sync completed"],
    },
    {
      id: "post-timeline",
      name: "Post Timeline",
      icon: Layers,
      status: "active",
      progress: 60,
      lastUpdated: "30 min ago",
      assignedTo: ["Editor", "Director", "Colorist"],
      aiSuggestions: ["Auto-assembly ready", "3 versions pending review"],
    },
  ]

  const workflowModules: ProductionModule[] = [
    {
      id: "dailies",
      name: "Dailies",
      icon: Video,
      status: "active",
      progress: 60,
      lastUpdated: "30 min ago",
      assignedTo: ["Editor", "Director"],
    },
    {
      id: "assemblies",
      name: "Assemblies",
      icon: Edit3,
      status: "pending",
      progress: 25,
      lastUpdated: "2 hours ago",
      assignedTo: ["Editor"],
    },
    {
      id: "rough-edits",
      name: "Rough Edits",
      icon: PlayCircle,
      status: "pending",
      progress: 15,
      lastUpdated: "1 day ago",
      assignedTo: ["Editor", "Director"],
    },
    {
      id: "offline",
      name: "Offline",
      icon: Archive,
      status: "blocked",
      progress: 0,
      lastUpdated: "3 days ago",
      assignedTo: ["Editor"],
    },
    {
      id: "online",
      name: "Online",
      icon: Cloud,
      status: "blocked",
      progress: 0,
      lastUpdated: "1 week ago",
      assignedTo: ["Colorist", "Audio"],
    },
  ]

  const creativeModules: ProductionModule[] = [
    {
      id: "moodboard",
      name: "Moodboard",
      icon: Palette,
      status: "completed",
      progress: 100,
      lastUpdated: "1 week ago",
      assignedTo: ["Director", "Designer"],
    },
    {
      id: "audio",
      name: "Audio",
      icon: Music,
      status: "active",
      progress: 70,
      lastUpdated: "2 hours ago",
      assignedTo: ["Sound Designer"],
    },
    {
      id: "vfx",
      name: "VFX",
      icon: Zap,
      status: "active",
      progress: 55,
      lastUpdated: "4 hours ago",
      assignedTo: ["VFX Supervisor"],
    },
    {
      id: "specs",
      name: "Specs",
      icon: FileText,
      status: "completed",
      progress: 100,
      lastUpdated: "2 weeks ago",
      assignedTo: ["Producer"],
    },
    {
      id: "deliverables",
      name: "Deliverables",
      icon: Download,
      status: "pending",
      progress: 20,
      lastUpdated: "1 day ago",
      assignedTo: ["Post Supervisor"],
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "development":
        return "bg-gray-500"
      case "pre-production":
        return "bg-yellow-500"
      case "production":
        return "bg-blue-500"
      case "post-production":
        return "bg-purple-500"
      case "completed":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getModuleStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "status-active"
      case "pending":
        return "status-warning"
      case "completed":
        return "status-active"
      case "blocked":
        return "status-error"
      default:
        return "status-warning"
    }
  }

  const getCurrentBackground = () => {
    if (currentProject?.backgroundType === "image" && currentProject?.backgroundImage) {
      return currentProject.backgroundImage
    }
    if (currentProject?.backgroundType === "gradient" && currentProject?.backgroundColor) {
      return currentProject.backgroundColor
    }
    if (currentProject?.backgroundType === "color" && currentProject?.backgroundColor) {
      return currentProject.backgroundColor
    }
    return globalSettings.backgroundImage
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* AI Insights Banner - Made Much Narrower */}
      {showAIInsights && (
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">AI Production Intelligence</h2>
            </div>
            <button
              onClick={() => setShowAIInsights(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-xs text-white/70">Budget</span>
              </div>
              <p className="text-white font-medium text-sm">$127K saved</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-white/70">Schedule</span>
              </div>
              <p className="text-white font-medium text-sm">18% faster</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-white/70">Quality</span>
              </div>
              <p className="text-white font-medium text-sm">94% satisfaction</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-white/70">Team</span>
              </div>
              <p className="text-white font-medium text-sm">12 active</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Video className="h-4 w-4 text-red-400" />
                <span className="text-xs text-white/70">Dailies</span>
              </div>
              <p className="text-white font-medium text-sm">24 reviewed</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-white/70">AI Tasks</span>
              </div>
              <p className="text-white font-medium text-sm">8 completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Show AI Insights Button when collapsed */}
      {!showAIInsights && (
        <button
          onClick={() => setShowAIInsights(true)}
          className="w-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-xl p-4 text-left hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">Show AI Production Intelligence</span>
            <ChevronRight className="h-4 w-4 text-white/50 ml-auto" />
          </div>
        </button>
      )}

      {/* User Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Your Projects</h2>
          <button
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg hover:shadow-blue-500/25"
            onClick={createNewProject}
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => {
                setSelectedProject(project)
                setCurrentProject(project)
              }}
            >
              <div className="relative h-48">
                {project.backgroundType === 'gradient' ? (
                  <div
                    className="w-full h-full"
                    style={{ background: project.backgroundImage || project.thumbnail }}
                  />
                ) : (
                  <Image
                    src={project.backgroundImage || project.thumbnail || "/placeholder.svg"}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                {/* Status Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <div className="bg-black/40 backdrop-blur-md rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-white/10" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors"
                      title="Project Settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(project);
                        handleSidebarNavigation("project-settings");
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors"
                      title="Export Project"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportProject(project);
                      }}
                    >
                      {isExporting === project.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </button>
                    <button
                      className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-red-400 transition-colors"
                      title="Archive Project"
                      onClick={(e) => {
                        e.stopPropagation();
                        // In a real app we'd trigger a state update here
                        alert("Project archived (mock)");
                      }}
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium text-white backdrop-blur-md shadow-lg ${getStatusColor(project.status)}`}
                  >
                    {project.status.replace("-", " ").toUpperCase()}
                  </span>
                </div>

                <div className="absolute top-3 left-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-md shadow-lg ${project.priority === "high"
                      ? "bg-red-500/80 border border-red-400/30"
                      : project.priority === "medium"
                        ? "bg-yellow-500/80 border border-yellow-400/30"
                        : "bg-green-500/80 border border-green-400/30"
                      } text-white`}
                  >
                    {(project.priority || "medium").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
                <p className="text-white/70 text-sm mb-3">
                  {project.genre || "General"} • {project.format || "Standard"}
                </p>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-white/70 mb-1">
                      <span>Progress</span>
                      <span>{project.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="progress-bar h-2 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Budget</span>
                    <span className="text-white">
                      ${((project.budgetUsed || 0) / 1000000).toFixed(1)}M / ${((project.budget || 0) / 1000000).toFixed(1)}M
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Days Remaining</span>
                    <span className="text-white">
                      {project.daysRemaining || 0} of {project.totalDays || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex -space-x-2">
                      {(project.team || []).slice(0, 3).map((member, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white/20"
                        >
                          {member.avatar}
                        </div>
                      ))}
                      {(project.team || []).length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-medium border-2 border-white/20">
                          +{(project.team || []).length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-white/70 text-xs ml-2">{project.lastActivity}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: FileText, label: "New Script", color: "bg-blue-500" },
            { icon: Calendar, label: "Schedule Meeting", color: "bg-green-500" },
            { icon: Upload, label: "Upload Dailies", color: "bg-purple-500" },
            { icon: Users, label: "Invite Team", color: "bg-orange-500" },
          ].map((action, i) => (
            <button
              key={i}
              className={`${action.color} hover:opacity-90 text-white p-6 rounded-xl transition-all duration-300 hover:scale-105`}
            >
              <action.icon className="h-8 w-8 mx-auto mb-2" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderModuleList = (modules: ProductionModule[], title: string) => (
    <div className="mb-6">
      <h3 className="text-white/70 text-sm font-medium mb-3 uppercase tracking-wider">{title}</h3>
      <div className="space-y-1">
        {modules.map((module) => (
          <button
            key={module.id}
            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 hover:bg-white/10 ${currentView === module.id && headerView === "dashboard" ? "bg-white/20" : ""
              }`}
            onClick={() => handleSidebarNavigation(module.id)}
          >
            <div className={`status-indicator ${getModuleStatusColor(module.status)}`}>
              <module.icon className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <>
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
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // Project Creation Logic
  // Project Creation Logic
  const createNewProject = async () => {
    const newProject: Project = {
      id: Date.now().toString(),
      title: "New Untitled Project",
      status: "development",
      type: "Film",
      progress: 0,
      budget: 0,
      budgetUsed: 0,
      daysRemaining: 0,
      totalDays: 0,
      genre: "Unspecified",
      format: "Standard",
      lastActivity: "Just now",
      thumbnail: "/placeholder.svg",
      priority: "medium",
      team: [],
      description: "A new project ready for development.",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      folders: DEFAULT_FOLDERS
    }

    await db.projects.add(newProject)
    // Optionally navigate to settings immediately
    setSelectedProject(newProject)
    setCurrentProject(newProject)
    setCurrentView("project-settings")
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Dynamic Background */}
      {currentProject?.backgroundType === "image" ? (
        <Image
          src={getCurrentBackground() || "/placeholder.svg"}
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      ) : currentProject?.backgroundType === "gradient" ? (
        <div className="absolute inset-0" style={{ background: getCurrentBackground() }} />
      ) : currentProject?.backgroundType === "color" ? (
        <div className="absolute inset-0" style={{ backgroundColor: getCurrentBackground() }} />
      ) : (
        <Image
          src={globalSettings.backgroundImage || "/placeholder.svg"}
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      )}

      {/* Navigation Header */}
      <header
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6 opacity-0 ${isLoaded ? "animate-fade-in" : ""}`}
        style={{ animationDelay: "0.2s" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu className="h-6 w-6 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <Image
              src="/download (13)2.png"
              alt="StudioFlow Logo"
              width={500}
              height={60}
              className="drop-shadow-lg object-contain h-5 w-auto"
              priority
            />
            <span className="text-2xl font-bold text-white drop-shadow-lg">v4</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Enhanced Search Bar with Module Filters */}
          <div className="flex items-center gap-2">
            {/* Module-specific filter dropdowns */}
            {getCurrentModuleFilters().map((filter, index) => (
              <select
                key={filter.name}
                value={getFilterValue(filter.name)}
                onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}

            {/* Main Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              <input
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full bg-white/10 backdrop-blur-sm pl-10 pr-12 py-2 text-white placeholder:text-white/70 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 w-80"
              />
              <button
                onClick={() => setShowSearchOptions(!showSearchOptions)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
              >
                <Filter className="h-4 w-4 text-white/70" />
              </button>

              {/* Enhanced Search Options Dropdown */}
              {showSearchOptions && (
                <div className="absolute top-full right-0 mt-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl z-50 min-w-[300px]">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-medium text-sm">Search Scope</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-white/70 text-xs">Auto-follow</span>
                        <button
                          onClick={() => setSearchMode((prev) => ({ ...prev, dynamicFollow: !prev.dynamicFollow }))}
                          className="transition-colors"
                        >
                          {searchMode.dynamicFollow ? (
                            <ToggleRight className="h-5 w-5 text-blue-400" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-white/50" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5">
                        <input
                          type="radio"
                          name="searchScope"
                          checked={selectedSearchModule === "global"}
                          onChange={() => {
                            setSelectedSearchModule("global")
                            setSearchMode((prev) => ({ ...prev, global: true, moduleSpecific: false }))
                          }}
                          className="text-blue-500"
                        />
                        <Globe className="h-4 w-4 text-blue-400" />
                        <span className="text-white text-sm">Global Search</span>
                      </label>

                      {getAllModules().map((module) => (
                        <label
                          key={module.id}
                          className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5"
                        >
                          <input
                            type="radio"
                            name="searchScope"
                            checked={selectedSearchModule === module.id}
                            onChange={() => {
                              setSelectedSearchModule(module.id)
                              setSearchMode((prev) => ({ ...prev, global: false, moduleSpecific: true }))
                            }}
                            className="text-blue-500"
                          />
                          <module.icon className="h-4 w-4 text-purple-400" />
                          <span className="text-white text-sm">{module.name}</span>
                        </label>
                      ))}
                    </div>

                    {searchMode.moduleSpecific && selectedSearchModule !== "global" && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-white/60 text-xs">
                          Search within {getAllModules().find((m) => m.id === selectedSearchModule)?.name} content and
                          apply module-specific filters
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Header Navigation Tabs */}
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
            <button
              onClick={() => setHeaderView("dashboard")}
              className={`px-4 py-2 rounded-md transition-all duration-200 ${headerView === "dashboard"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setHeaderView("calendar")}
              className={`px-4 py-2 rounded-md transition-all duration-200 ${headerView === "calendar"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setHeaderView("contacts")}
              className={`px-4 py-2 rounded-md transition-all duration-200 ${headerView === "contacts"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
            >
              Contacts
            </button>
          </div>

          <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Bell className="h-6 w-6 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowAIDropdown(!showAIDropdown)}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors group"
              title="AI Production Assistant"
            >
              <Brain className="h-6 w-6 text-white group-hover:text-purple-400 transition-colors" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            </button>

            {showAIDropdown && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-400" />
                      <span className="text-white font-medium text-sm">AI Production Assistant</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowAIGenerationPanel(!showAIGenerationPanel)}
                        className="p-1 rounded hover:bg-white/20 transition-colors"
                        title="Toggle AI Generation Panel"
                      >
                        <Sparkles className="h-4 w-4 text-purple-400" />
                      </button>
                      <button
                        onClick={() => setShowAIDropdown(false)}
                        className="p-1 rounded hover:bg-white/20 transition-colors"
                      >
                        <X className="h-4 w-4 text-white/70" />
                      </button>
                    </div>
                  </div>

                  {/* Active Generations Status */}
                  {activeGenerations.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <h4 className="text-white/70 text-xs font-medium uppercase tracking-wider">Active Generations</h4>
                      {activeGenerations.map((gen) => (
                        <div key={gen.id} className="bg-white/5 rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-xs font-medium capitalize">{gen.type}</span>
                            <span className="text-white/60 text-xs">{gen.progress}%</span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-1">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${gen.progress}%` }}
                            />
                          </div>
                          <p className="text-white/70 text-xs mt-1 truncate">{gen.prompt}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white/5 rounded-lg p-3 mb-4">
                    <p className="text-white text-sm leading-relaxed">
                      I've analyzed your current projects and noticed 'Midnight Chronicles' is 15% over budget. I can
                      optimize your shooting schedule to reduce location costs by $45K. Would you like me to generate an
                      updated stripboard?
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAIGeneration("schedule")}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Calendar className="h-3 w-3" />
                        Generate Schedule
                      </button>
                      <button
                        onClick={() => handleAIGeneration("budget")}
                        className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <BarChart3 className="h-3 w-3" />
                        Analyze Budget
                      </button>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <h4 className="text-white/70 text-xs font-medium mb-2 uppercase tracking-wider">
                        Context-Aware Actions
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAIGeneration("assets")}
                          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                        >
                          <Sparkles className="h-3 w-3" />
                          Generate{" "}
                          {currentView === "storyboard"
                            ? "Panels"
                            : currentView === "moodboard"
                              ? "Concepts"
                              : currentView === "audio"
                                ? "Audio"
                                : "Assets"}
                        </button>
                        <button
                          onClick={() => handleAIGeneration("risk")}
                          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                        >
                          <Target className="h-3 w-3" />
                          Risk Analysis
                        </button>
                        <button
                          onClick={() => setShowAIGenerationPanel(true)}
                          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                        >
                          <Zap className="h-3 w-3" />
                          Advanced AI
                        </button>
                        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-2 rounded-lg transition-colors">
                          <Brain className="h-3 w-3" />
                          AI Chat
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <h4 className="text-white/70 text-xs font-medium mb-2 uppercase tracking-wider">
                        Recent Insights
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0"></div>
                          <span className="text-white/80">Weather delays predicted for next week's exterior shots</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0"></div>
                          <span className="text-white/80">VFX shots ready for director review</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                          <span className="text-white/80">Audio sync completed for yesterday's dailies</span>
                        </div>
                        {generationHistory.length > 0 && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0"></div>
                            <span className="text-white/80">
                              AI generated {generationHistory[generationHistory.length - 1].type} - Ready for review
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Generation History */}
                    {generationHistory.length > 0 && (
                      <div className="border-t border-white/10 pt-3">
                        <h4 className="text-white/70 text-xs font-medium mb-2 uppercase tracking-wider">
                          Recent Generations
                        </h4>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {generationHistory.slice(-3).map((gen) => (
                            <div key={gen.id} className="flex items-center justify-between text-xs">
                              <span className="text-white/80 capitalize">{gen.type}</span>
                              <span className="text-green-400">✓ Complete</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content Flow Tool - Context Aware Generator */}
          <button
            onClick={() => setShowContentFlow(!showContentFlow)}
            className={`p-2 rounded-lg transition-colors group relative ${showContentFlow ? 'bg-white/20' : 'hover:bg-white/10'}`}
            title="Content Flow (Gemini/Veo)"
          >
            <Sparkles className={`h-6 w-6 transition-colors ${showContentFlow ? 'text-indigo-400' : 'text-white'}`} />
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10 group-hover:ring-indigo-400/50 pointer-events-none" />
          </button>

          <button
            onClick={() => handleSidebarNavigation("settings")}
            className="h-6 w-6 text-white drop-shadow-md cursor-pointer hover:text-blue-400 transition-colors"
          >
            <Settings className="h-6 w-6" />
          </button>

          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:scale-105 transition-transform">
            SF
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative h-screen w-full pt-20 flex">
        {/* Enhanced Sidebar - Show on all tabs */}
        <AppSidebar
          collapsed={sidebarCollapsed}
          currentView={currentView}
          headerView={headerView}
          currentProject={currentProject}
          projects={projects || []}
          onNavigate={handleSidebarNavigation}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onProjectSelect={(project) => {
            setCurrentProject(project)
            setShowProjectDropdown(false)
          }}
          onHeaderViewChange={setHeaderView}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col opacity-0 ${isLoaded ? "animate-fade-in" : ""} overflow-hidden`}
          style={{ animationDelay: "0.6s" }}
        >
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-full mx-auto">
              {headerView === "calendar" ? (
                <OriginalCalendar currentProject={currentProject} />
              ) : headerView === "contacts" ? (
                <ContactsManager currentProject={currentProject} />
              ) : currentView === "dashboard" ? (
                renderDashboard()
              ) : currentView === "budget-module" ? (
                <BudgetModule
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "budget-module" ? searchQuery : ""}
                />
              ) : currentView === "script" ? (
                <ScriptModule
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "script" ? searchQuery : ""}
                />
              ) : currentView === "schedule" ? (
                <ScheduleModule
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "schedule" ? searchQuery : ""}
                />
              ) : currentView === "cast" ? (
                <CastManagement
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "cast" ? searchQuery : ""}
                  filters={{
                    role: getFilterValue("role"),
                    status: getFilterValue("status"),
                    availability: getFilterValue("availability"),
                  }}
                />
              ) : currentView === "locations" ? (
                <LocationScouting
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "locations" ? searchQuery : ""}
                  filters={{
                    type: getFilterValue("type"),
                    status: getFilterValue("status"),
                  }}
                />
              ) : currentView === "dailies" ? (
                <CameraToCloudModule />
              ) : currentView === "vfx" ? (
                <VFXPipeline
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "vfx" ? searchQuery : ""}
                  filters={{
                    status: getFilterValue("status"),
                    priority: getFilterValue("priority"),
                  }}
                />
              ) : currentView === "crew" ? (
                <TeamCollaborationHub projectId={currentProject?.id} />
              ) : currentView === "gear" ? (
                <GearManagement
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "gear" ? searchQuery : ""}
                  filters={{
                    category: getFilterValue("category"),
                    status: getFilterValue("status"),
                    department: getFilterValue("department"),
                  }}
                />
              ) : currentView === "storyboard" ? (
                <StoryboardModule
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "storyboard" ? searchQuery : ""}
                />
              ) : currentView === "audio" ? (
                <AudioModule
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "audio" ? searchQuery : ""}
                  filters={{
                    type: getFilterValue("type"),
                    status: getFilterValue("status"),
                  }}
                />
              ) : currentView === "moodboard" ? (
                <MoodboardModule
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "moodboard" ? searchQuery : ""}
                  filters={{
                    category: getFilterValue("category"),
                    type: getFilterValue("type"),
                  }}
                />
              ) : currentView === "budget" ? (
                <BudgetTracking />
              ) : currentView === "legal" ? (
                <LegalDocuments projectId={currentProject?.id} />
              ) : currentView === "call-sheets" ? (
                <CallSheets
                  projectId={currentProject?.id}
                  searchQuery={searchMode.moduleSpecific && selectedSearchModule === "call-sheets" ? searchQuery : ""}
                  filters={{
                    status: getFilterValue("status"),
                  }}
                />
              ) : currentView === "analytics" ? (
                <AnalyticsDashboard projectId={currentProject?.id} />
              ) : currentView === "user-management" ? (
                <UserManagement
                  projectId={currentProject?.id}
                  searchQuery={
                    searchMode.moduleSpecific && selectedSearchModule === "user-management" ? searchQuery : ""
                  }
                  filters={{
                    department: getFilterValue("department"),
                    status: getFilterValue("status"),
                  }}
                />
              ) : currentView === "dailies-review" ? (
                <DailiesReviewModule projectId={currentProject?.id} />
              ) : currentView === "post-timeline" ? (
                <PostProductionTimeline projectId={currentProject?.id} />
              ) : currentView === "settings" ? (
                <GlobalSettings
                  onNavigateToProject={(projectId) => {
                    const project = projects.find(p => p.id === projectId)
                    if (project) {
                      setSelectedProject(project)
                      setCurrentProject(project)
                      setCurrentView("project-settings")
                      setSidebarCollapsed(false)
                    }
                  }}
                  onCreateProject={createNewProject}
                />
              ) : currentView === "assets" ? (
                <AssetManagement projectId={currentProject?.id} />
              ) : currentView === "project-settings" ? (
                <ProjectSettings
                  currentProject={currentProject}
                  onUpdateProject={async (project, updates) => {
                    const updated = { ...project, ...updates }
                    setCurrentProject(updated)
                    await db.projects.put(updated)
                  }}
                  onOpenContentFlow={() => setShowContentFlow(true)}
                />
              ) : (
                renderDashboard()
              )}
            </div>
          </div>
        </div>

        {/* AI Generation Panel */}
        {
          showAIGenerationPanel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-6 w-6 text-purple-400" />
                      <h2 className="text-xl font-semibold text-white">AI Generation Studio</h2>
                      <span className="text-sm text-white/60">Context: {getCurrentModuleName()}</span>
                    </div>
                    <button
                      onClick={() => setShowAIGenerationPanel(false)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>

                  <AIGenerationSystem
                    context={getAIGenerationContext()}
                    onGenerated={(result) => {
                      console.log("AI Generation completed:", result)
                      // Handle the generated result
                    }}
                    variant="panel"
                    availableTypes={getAvailableGenerationTypes()}
                  />
                </div>
              </div>
            </div>

          )
        }

        {/* Content Flow Context Window */}
        {showContentFlow && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <ContentFlow
              onClose={() => setShowContentFlow(false)}
              projectId={currentProject?.id}
              onNavigateToAssets={() => {
                setShowContentFlow(false);
                handleSidebarNavigation("assets"); // Assuming 'assets' is the ID for AssetManagement
              }}
            />
          </div>
        )}
      </main >
    </div >
  )
}
