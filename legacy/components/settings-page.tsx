"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Settings,
  Keyboard,
  Palette,
  Upload,
  User,
  Folder,
  Save,
  RotateCcw,
  Search,
  Check,
  Trash2,
  Sun,
  Moon,
  Type,
  Plug,
  Archive,
} from "lucide-react"

interface KeyboardShortcut {
  id: string
  action: string
  category: string
  defaultKeys: string[]
  currentKeys: string[]
  description: string
}

interface BackgroundOption {
  id: string
  name: string
  type: "image" | "gradient" | "color"
  value: string
  thumbnail: string
  isCustom?: boolean
}

interface Integration {
  id: string
  name: string
  description: string
  category: string
  status: "connected" | "available" | "coming-soon"
  icon: string
  features: string[]
  pricing?: string
}

interface SettingsPageProps {
  globalSettings: any
  setGlobalSettings: (settings: any) => void
  currentProject: any
  setCurrentProject: (project: any) => void
  projects: any[]
  onAddProject?: (project: any) => void
  onUpdateProject?: (project: any) => void
  onDeleteProject?: (projectId: string) => void
}

export default function SettingsPage({
  globalSettings,
  setGlobalSettings,
  currentProject,
  setCurrentProject,
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<
    "general" | "keyboard" | "appearance" | "projects" | "account" | "integrations"
  >("general")
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [newProjectGenre, setNewProjectGenre] = useState("")
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null)

  const handleAddNewProject = () => {
    if (!newProjectTitle || !onAddProject) return

    const newProject = {
      id: Date.now().toString(),
      title: newProjectTitle,
      status: "development",
      progress: 0,
      budget: 0,
      budgetUsed: 0,
      daysRemaining: 0,
      totalDays: 0,
      director: "Pending",
      producer: "Pending",
      genre: newProjectGenre || "Untitled",
      format: "Feature Film",
      lastActivity: "Just now",
      thumbnail: "/placeholder.svg?height=200&width=300",
      priority: "medium",
      aiInsights: [],
      team: [],
      calendars: [],
      contacts: [],
      backgroundImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
      backgroundType: "image",
    }

    onAddProject(newProject)
    setIsCreatingProject(false)
    setNewProjectTitle("")
    setNewProjectGenre("")
  }

  const handleUpdateExistingProject = (project: any, updates: any) => {
    if (onUpdateProject) {
      onUpdateProject({ ...project, ...updates })
    }
    setEditingProjectId(null)
  }
  const [searchQuery, setSearchQuery] = useState("")
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [recordingKeys, setRecordingKeys] = useState<string[]>([])
  const [selectedBackground, setSelectedBackground] = useState<string>("default")
  const [backgroundScope, setBackgroundScope] = useState<"global" | "project">("global")
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">("dark")
  const [selectedFont, setSelectedFont] = useState<string>("inter")
  const [integrationSearch, setIntegrationSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Font options
  const fontOptions = [
    { id: "inter", name: "Inter", family: "Inter, sans-serif" },
    { id: "roboto", name: "Roboto", family: "Roboto, sans-serif" },
    { id: "open-sans", name: "Open Sans", family: "'Open Sans', sans-serif" },
    { id: "lato", name: "Lato", family: "Lato, sans-serif" },
    { id: "source-sans", name: "Source Sans Pro", family: "'Source Sans Pro', sans-serif" },
    { id: "nunito", name: "Nunito", family: "Nunito, sans-serif" },
    { id: "poppins", name: "Poppins", family: "Poppins, sans-serif" },
    { id: "montserrat", name: "Montserrat", family: "Montserrat, sans-serif" },
  ]

  // Integration data based on the research document
  const integrations: Integration[] = [
    // All-in-One Production Platforms
    {
      id: "studiobinder",
      name: "StudioBinder",
      description: "Cloud-based production hub for script formatting, storyboards, and shot lists",
      category: "Production Management",
      status: "available",
      icon: "📋",
      features: ["Script Breakdown", "Call Sheets", "Shot Lists", "Storyboards", "Team Collaboration"],
      pricing: "Free - $29/month",
    },
    {
      id: "yamdu",
      name: "Yamdu",
      description: "Comprehensive online pre-production platform for collaboration",
      category: "Production Management",
      status: "available",
      icon: "🎬",
      features: ["Script Breakdown", "Scheduling", "Budgeting", "Storyboarding", "Real-time Collaboration"],
      pricing: "$19 - $99/month",
    },
    {
      id: "celtx",
      name: "Celtx",
      description: "All-in-one pre-production suite with screenwriting and scheduling",
      category: "Production Management",
      status: "available",
      icon: "✍️",
      features: ["Screenwriting", "Script Breakdown", "Scheduling", "Budgeting", "Multi-currency Support"],
      pricing: "Free - $20/month",
    },

    // Screenwriting Tools
    {
      id: "final-draft",
      name: "Final Draft",
      description: "Industry-standard screenwriting software",
      category: "Screenwriting",
      status: "available",
      icon: "📝",
      features: ["Industry Formatting", "Collaboration", "Script Notes", "Revision Tracking"],
      pricing: "$249.99 one-time",
    },
    {
      id: "writerduet",
      name: "WriterDuet",
      description: "Real-time collaborative screenwriting platform",
      category: "Screenwriting",
      status: "available",
      icon: "👥",
      features: ["Real-time Collaboration", "Industry Formatting", "Version Control", "Final Draft Import/Export"],
      pricing: "Free - $11.99/month",
    },
    {
      id: "filmustage",
      name: "Filmustage",
      description: "AI-powered script breakdown with 86% accuracy",
      category: "AI Tools",
      status: "available",
      icon: "🤖",
      features: ["AI Script Analysis", "Automatic Element Detection", "Schedule Generation", "Cost Estimation"],
      pricing: "$29 - $99/month",
    },

    // Scheduling & Budgeting
    {
      id: "movie-magic",
      name: "Movie Magic",
      description: "Industry standard scheduling and budgeting software",
      category: "Scheduling",
      status: "available",
      icon: "🎭",
      features: ["Stripboard Interface", "Budget Integration", "Union Rates", "Tax Credits", "Reports"],
      pricing: "$499 - $899 one-time",
    },
    {
      id: "preprocloud",
      name: "PreProCloud",
      description: "Web-based budgeting for line producers",
      category: "Budgeting",
      status: "available",
      icon: "💰",
      features: ["Cloud Budgeting", "Team Collaboration", "Real-time Updates", "Multiple Projects"],
      pricing: "Pay per active project",
    },

    // Storyboarding & Pre-viz
    {
      id: "frameforge",
      name: "FrameForge",
      description: "3D storyboarding and pre-visualization software",
      category: "Pre-visualization",
      status: "available",
      icon: "🎨",
      features: ["3D Storyboarding", "Virtual Cameras", "Lens Simulation", "Set Design", "Character Blocking"],
      pricing: "$399 - $799 one-time",
    },
    {
      id: "shotpro",
      name: "ShotPro",
      description: "3D pre-visualization app for iPad, Mac, and PC",
      category: "Pre-visualization",
      status: "available",
      icon: "📱",
      features: ["3D Pre-viz", "Animated Storyboards", "Asset Library", "AI Features", "Cross-platform"],
      pricing: "$19.99/month",
    },
    {
      id: "boords",
      name: "Boords",
      description: "Web-based collaborative storyboard creator with AI",
      category: "Storyboarding",
      status: "available",
      icon: "🖼️",
      features: [
        "Online Storyboarding",
        "AI Generation",
        "Team Collaboration",
        "Animatics Export",
        "Visual Consistency",
      ],
      pricing: "Free - $35/month",
    },

    // Video Review & Approval
    {
      id: "frame-io",
      name: "Frame.io",
      description: "Cloud-based video review and approval platform",
      category: "Post-Production",
      status: "connected",
      icon: "🎥",
      features: ["Video Comments", "Version Control", "Adobe Integration", "Camera to Cloud", "Mobile Access"],
      pricing: "$15 - $50/month",
    },
    {
      id: "wipster",
      name: "Wipster",
      description: "Video review platform with contextual feedback",
      category: "Post-Production",
      status: "available",
      icon: "📹",
      features: ["Frame Comments", "Approval Workflows", "Version Management", "Team Collaboration"],
      pricing: "$15 - $59/month",
    },

    // AI-Assisted Editing
    {
      id: "descript",
      name: "Descript",
      description: "AI-powered text-based video editing",
      category: "AI Tools",
      status: "available",
      icon: "🎙️",
      features: ["Text-based Editing", "AI Transcription", "Voice Cloning", "Filler Word Removal", "Collaboration"],
      pricing: "Free - $24/month",
    },
    {
      id: "runway-ml",
      name: "Runway ML",
      description: "Creative AI tools for video production",
      category: "AI Tools",
      status: "available",
      icon: "🚀",
      features: ["Background Removal", "AI Inpainting", "Text-to-Video", "Motion Tracking", "Generative Video"],
      pricing: "$12 - $76/month",
    },
    {
      id: "topaz-video-ai",
      name: "Topaz Video AI",
      description: "AI video enhancement and upscaling",
      category: "AI Tools",
      status: "available",
      icon: "⚡",
      features: ["Video Upscaling", "Noise Reduction", "Frame Interpolation", "Restoration", "Stabilization"],
      pricing: "$199 - $299 one-time",
    },

    // Media Asset Management
    {
      id: "iconik",
      name: "Iconik",
      description: "Cloud-based media asset management with AI tagging",
      category: "Asset Management",
      status: "available",
      icon: "🗂️",
      features: ["AI Metadata Tagging", "Face Recognition", "Speech-to-Text", "Custom Fields", "Access Control"],
      pricing: "$10 - $50/month per user",
    },
    {
      id: "axle-ai",
      name: "axle.ai",
      description: "Lightweight media management with AI auto-tagging",
      category: "Asset Management",
      status: "available",
      icon: "🏷️",
      features: ["AI Auto-tagging", "Transcription", "Web Interface", "Search", "B-roll Organization"],
      pricing: "$25 - $100/month",
    },

    // Enterprise Solutions
    {
      id: "shotgrid",
      name: "ShotGrid",
      description: "Autodesk's production tracking and asset management",
      category: "Enterprise",
      status: "available",
      icon: "🏢",
      features: ["Production Tracking", "Asset Management", "Review System", "Pipeline Integration", "Analytics"],
      pricing: "$45/month per user",
    },
    {
      id: "avid-mediacentral",
      name: "Avid MediaCentral",
      description: "Enterprise media management and collaboration",
      category: "Enterprise",
      status: "available",
      icon: "🎛️",
      features: ["Media Management", "Workflow Orchestration", "Asset Sharing", "Version Control", "Integration"],
      pricing: "Contact for pricing",
    },

    // Coming Soon / Emerging
    {
      id: "perforce-helix",
      name: "Perforce Helix Core",
      description: "Enterprise version control for large binary files",
      category: "Version Control",
      status: "coming-soon",
      icon: "🔄",
      features: ["Large File Handling", "Distributed Teams", "Branching", "Unity/Unreal Integration"],
      pricing: "Contact for pricing",
    },
    {
      id: "wonder-studio",
      name: "Wonder Studio",
      description: "Automated CG character animation and compositing",
      category: "AI Tools",
      status: "coming-soon",
      icon: "🎭",
      features: ["Auto CG Characters", "Motion Capture", "Compositing", "VFX Automation"],
      pricing: "TBA",
    },
    // Productivity & Cloud Storage
    {
      id: "google-workspace",
      name: "Google Workspace",
      description: "Complete suite of productivity tools including Drive, Docs, Sheets, and Calendar",
      category: "Productivity",
      status: "available",
      icon: "📊",
      features: [
        "Google Drive Storage",
        "Docs Collaboration",
        "Sheets Integration",
        "Calendar Sync",
        "Gmail Integration",
      ],
      pricing: "$6 - $18/month per user",
    },
    {
      id: "google-drive",
      name: "Google Drive",
      description: "Cloud storage and file sharing with real-time collaboration",
      category: "Cloud Storage",
      status: "connected",
      icon: "💾",
      features: ["15GB Free Storage", "Real-time Sync", "File Sharing", "Version History", "Offline Access"],
      pricing: "Free - $9.99/month",
    },
    {
      id: "dropbox",
      name: "Dropbox",
      description: "Secure cloud storage with advanced sharing and collaboration features",
      category: "Cloud Storage",
      status: "available",
      icon: "📦",
      features: ["File Sync", "Smart Sync", "Team Folders", "Version History", "Advanced Sharing"],
      pricing: "Free - $20/month per user",
    },
    {
      id: "onedrive",
      name: "Microsoft OneDrive",
      description: "Cloud storage integrated with Microsoft Office suite",
      category: "Cloud Storage",
      status: "available",
      icon: "☁️",
      features: [
        "Office Integration",
        "Real-time Collaboration",
        "File Sharing",
        "Version Control",
        "Teams Integration",
      ],
      pricing: "$1.99 - $12.50/month",
    },
    {
      id: "notion",
      name: "Notion",
      description: "All-in-one workspace for notes, docs, wikis, and project management",
      category: "Productivity",
      status: "available",
      icon: "📝",
      features: ["Database Management", "Template Library", "Team Collaboration", "API Integration", "Custom Views"],
      pricing: "Free - $10/month per user",
    },
    {
      id: "evernote",
      name: "Evernote",
      description: "Note-taking and organization app with powerful search capabilities",
      category: "Productivity",
      status: "available",
      icon: "🗒️",
      features: ["Web Clipper", "Document Scanning", "Powerful Search", "Cross-platform Sync", "Template Gallery"],
      pricing: "Free - $14.99/month",
    },
    {
      id: "slack",
      name: "Slack",
      description: "Team communication and collaboration platform",
      category: "Communication",
      status: "connected",
      icon: "💬",
      features: ["Channels", "Direct Messages", "File Sharing", "App Integrations", "Video Calls"],
      pricing: "Free - $12.50/month per user",
    },
    {
      id: "microsoft-teams",
      name: "Microsoft Teams",
      description: "Unified communication and collaboration platform",
      category: "Communication",
      status: "available",
      icon: "👥",
      features: ["Video Conferencing", "Chat", "File Collaboration", "App Integration", "Phone System"],
      pricing: "Free - $22/month per user",
    },
    {
      id: "zoom",
      name: "Zoom",
      description: "Video conferencing and webinar platform",
      category: "Communication",
      status: "available",
      icon: "📹",
      features: ["HD Video", "Screen Sharing", "Recording", "Breakout Rooms", "Webinars"],
      pricing: "Free - $19.99/month",
    },
    {
      id: "trello",
      name: "Trello",
      description: "Visual project management with boards, lists, and cards",
      category: "Project Management",
      status: "available",
      icon: "📋",
      features: ["Kanban Boards", "Team Collaboration", "Power-Ups", "Automation", "Templates"],
      pricing: "Free - $17.50/month per user",
    },
    {
      id: "asana",
      name: "Asana",
      description: "Work management platform for teams to organize and track work",
      category: "Project Management",
      status: "available",
      icon: "✅",
      features: ["Task Management", "Timeline View", "Custom Fields", "Reporting", "Goal Tracking"],
      pricing: "Free - $24.99/month per user",
    },
    {
      id: "monday",
      name: "Monday.com",
      description: "Work operating system for managing projects and workflows",
      category: "Project Management",
      status: "available",
      icon: "🎯",
      features: ["Custom Workflows", "Automation", "Time Tracking", "Reporting", "Integrations"],
      pricing: "$8 - $24/month per user",
    },
    {
      id: "airtable",
      name: "Airtable",
      description: "Spreadsheet-database hybrid for organizing and collaborating",
      category: "Database",
      status: "available",
      icon: "🗃️",
      features: ["Flexible Database", "Rich Field Types", "Views", "Automation", "API Access"],
      pricing: "Free - $24/month per user",
    },
    {
      id: "figma",
      name: "Figma",
      description: "Collaborative design tool for UI/UX and prototyping",
      category: "Design",
      status: "available",
      icon: "🎨",
      features: ["Real-time Collaboration", "Prototyping", "Design Systems", "Developer Handoff", "Version History"],
      pricing: "Free - $15/month per user",
    },
    {
      id: "adobe-creative-cloud",
      name: "Adobe Creative Cloud",
      description: "Complete suite of creative applications",
      category: "Design",
      status: "available",
      icon: "🎭",
      features: ["Photoshop", "Illustrator", "After Effects", "Premiere Pro", "Cloud Storage"],
      pricing: "$20.99 - $79.49/month",
    },
    {
      id: "box",
      name: "Box",
      description: "Enterprise cloud content management and collaboration",
      category: "Cloud Storage",
      status: "available",
      icon: "📁",
      features: ["Enterprise Security", "Workflow Automation", "Content Management", "API Integration", "Compliance"],
      pricing: "$5 - $35/month per user",
    },
    {
      id: "github",
      name: "GitHub",
      description: "Version control and collaboration platform for developers",
      category: "Version Control",
      status: "available",
      icon: "🐙",
      features: ["Git Repositories", "Issue Tracking", "Pull Requests", "Actions", "Project Management"],
      pricing: "Free - $21/month per user",
    },
    {
      id: "jira",
      name: "Jira",
      description: "Issue tracking and project management for software teams",
      category: "Project Management",
      status: "available",
      icon: "🔧",
      features: ["Issue Tracking", "Agile Boards", "Reporting", "Workflow Automation", "Integration Hub"],
      pricing: "$7.16 - $14.50/month per user",
    },
    {
      id: "confluence",
      name: "Confluence",
      description: "Team workspace for knowledge management and collaboration",
      category: "Documentation",
      status: "available",
      icon: "📚",
      features: ["Page Creation", "Team Spaces", "Templates", "Real-time Editing", "Knowledge Base"],
      pricing: "$5.75 - $11/month per user",
    },
    {
      id: "zapier",
      name: "Zapier",
      description: "Automation platform connecting apps and services",
      category: "Automation",
      status: "available",
      icon: "⚡",
      features: [
        "App Integrations",
        "Workflow Automation",
        "Triggers & Actions",
        "Multi-step Zaps",
        "Team Collaboration",
      ],
      pricing: "Free - $599/month",
    },
  ]

  // Apply live theme changes
  useEffect(() => {
    const root = document.documentElement
    if (themeMode === "light") {
      root.classList.add("light-mode")
      root.classList.remove("dark-mode")
    } else if (themeMode === "dark") {
      root.classList.add("dark-mode")
      root.classList.remove("light-mode")
    } else {
      // Auto mode - detect system preference
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      if (mediaQuery.matches) {
        root.classList.add("dark-mode")
        root.classList.remove("light-mode")
      } else {
        root.classList.add("light-mode")
        root.classList.remove("dark-mode")
      }
    }
  }, [themeMode])

  // Apply live font changes
  useEffect(() => {
    const selectedFontOption = fontOptions.find((f) => f.id === selectedFont)
    if (selectedFontOption) {
      document.documentElement.style.setProperty("--font-family", selectedFontOption.family)
    }
  }, [selectedFont])

  // Sample keyboard shortcuts
  const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcut[]>([
    {
      id: "new-project",
      action: "New Project",
      category: "Project",
      defaultKeys: ["Ctrl", "N"],
      currentKeys: ["Ctrl", "N"],
      description: "Create a new project",
    },
    {
      id: "save-project",
      action: "Save Project",
      category: "Project",
      defaultKeys: ["Ctrl", "S"],
      currentKeys: ["Ctrl", "S"],
      description: "Save current project",
    },
    {
      id: "open-calendar",
      action: "Open Calendar",
      category: "Navigation",
      defaultKeys: ["Ctrl", "K"],
      currentKeys: ["Ctrl", "K"],
      description: "Switch to calendar view",
    },
    {
      id: "open-contacts",
      action: "Open Contacts",
      category: "Navigation",
      defaultKeys: ["Ctrl", "P"],
      currentKeys: ["Ctrl", "P"],
      description: "Switch to contacts view",
    },
    {
      id: "search",
      action: "Global Search",
      category: "General",
      defaultKeys: ["Ctrl", "/"],
      currentKeys: ["Ctrl", "/"],
      description: "Open global search",
    },
    {
      id: "ai-assistant",
      action: "AI Assistant",
      category: "General",
      defaultKeys: ["Ctrl", "Space"],
      currentKeys: ["Ctrl", "Space"],
      description: "Toggle AI assistant",
    },
    {
      id: "settings",
      action: "Settings",
      category: "General",
      defaultKeys: ["Ctrl", ","],
      currentKeys: ["Ctrl", ","],
      description: "Open settings",
    },
    {
      id: "new-event",
      action: "New Calendar Event",
      category: "Calendar",
      defaultKeys: ["Ctrl", "E"],
      currentKeys: ["Ctrl", "E"],
      description: "Create new calendar event",
    },
    {
      id: "toggle-sidebar",
      action: "Toggle Sidebar",
      category: "Interface",
      defaultKeys: ["Ctrl", "B"],
      currentKeys: ["Ctrl", "B"],
      description: "Show/hide sidebar",
    },
    {
      id: "quick-actions",
      action: "Quick Actions",
      category: "General",
      defaultKeys: ["Ctrl", "Shift", "P"],
      currentKeys: ["Ctrl", "Shift", "P"],
      description: "Open quick actions menu",
    },
  ])

  // Background options
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOption[]>([
    {
      id: "default",
      name: "Mountain Landscape",
      type: "image",
      value: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: "forest",
      name: "Forest Path",
      type: "image",
      value: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2070&auto=format&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: "ocean",
      name: "Ocean Waves",
      type: "image",
      value: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=2070&auto=format&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: "city",
      name: "City Skyline",
      type: "image",
      value: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: "gradient-1",
      name: "Purple Blue",
      type: "gradient",
      value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      thumbnail: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      id: "gradient-2",
      name: "Sunset",
      type: "gradient",
      value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      thumbnail: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      id: "gradient-3",
      name: "Ocean",
      type: "gradient",
      value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      thumbnail: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
    {
      id: "color-dark",
      name: "Dark Blue",
      type: "color",
      value: "#1e293b",
      thumbnail: "#1e293b",
    },
    {
      id: "color-black",
      name: "Pure Black",
      type: "color",
      value: "#000000",
      thumbnail: "#000000",
    },
    {
      id: "color-gray",
      name: "Charcoal",
      type: "color",
      value: "#374151",
      thumbnail: "#374151",
    },
  ])

  const filteredShortcuts = keyboardShortcuts.filter(
    (shortcut) =>
      shortcut.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const shortcutCategories = Array.from(new Set(keyboardShortcuts.map((s) => s.category)))

  const integrationCategories = Array.from(new Set(integrations.map((i) => i.category)))
  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(integrationSearch.toLowerCase()) ||
      integration.description.toLowerCase().includes(integrationSearch.toLowerCase())
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleKeyRecord = (e: KeyboardEvent) => {
    e.preventDefault()
    const keys = []
    if (e.ctrlKey) keys.push("Ctrl")
    if (e.altKey) keys.push("Alt")
    if (e.shiftKey) keys.push("Shift")
    if (e.metaKey) keys.push("Cmd")

    if (e.key !== "Control" && e.key !== "Alt" && e.key !== "Shift" && e.key !== "Meta") {
      keys.push(e.key.toUpperCase())
    }

    setRecordingKeys(keys)
  }

  const startRecording = (shortcutId: string) => {
    setEditingShortcut(shortcutId)
    setRecordingKeys([])
    document.addEventListener("keydown", handleKeyRecord)
  }

  const stopRecording = () => {
    document.removeEventListener("keydown", handleKeyRecord)
    if (editingShortcut && recordingKeys.length > 0) {
      setKeyboardShortcuts((prev) =>
        prev.map((shortcut) =>
          shortcut.id === editingShortcut ? { ...shortcut, currentKeys: recordingKeys } : shortcut,
        ),
      )
    }
    setEditingShortcut(null)
    setRecordingKeys([])
  }

  const resetShortcut = (shortcutId: string) => {
    setKeyboardShortcuts((prev) =>
      prev.map((shortcut) =>
        shortcut.id === shortcutId ? { ...shortcut, currentKeys: [...shortcut.defaultKeys] } : shortcut,
      ),
    )
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        const newBackground: BackgroundOption = {
          id: `custom-${Date.now()}`,
          name: file.name,
          type: "image",
          value: imageUrl,
          thumbnail: imageUrl,
          isCustom: true,
        }
        setBackgroundOptions((prev) => [...prev, newBackground])
        setSelectedBackground(newBackground.id)
      }
      reader.readAsDataURL(file)
    }
  }

  const applyBackground = () => {
    const background = backgroundOptions.find((bg) => bg.id === selectedBackground)
    if (!background) return

    if (backgroundScope === "global") {
      setGlobalSettings({
        ...globalSettings,
        backgroundImage: background.value,
        backgroundType: background.type,
        backgroundColor: background.value,
      })
    } else if (currentProject) {
      setCurrentProject({
        ...currentProject,
        backgroundImage: background.type === "image" ? background.value : undefined,
        backgroundType: background.type,
        backgroundColor: background.value,
      })
    }
  }

  const deleteCustomBackground = (backgroundId: string) => {
    setBackgroundOptions((prev) => prev.filter((bg) => bg.id !== backgroundId))
    if (selectedBackground === backgroundId) {
      setSelectedBackground("default")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-500"
      case "available":
        return "bg-blue-500"
      case "coming-soon":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected"
      case "available":
        return "Available"
      case "coming-soon":
        return "Coming Soon"
      default:
        return "Unknown"
    }
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">General Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium">Auto-save Projects</h4>
              <p className="text-white/70 text-sm">Automatically save project changes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium">AI Suggestions</h4>
              <p className="text-white/70 text-sm">Enable AI-powered recommendations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium">Real-time Collaboration</h4>
              <p className="text-white/70 text-sm">Show live cursors and edits from team members</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-white font-medium mb-2">Default Project Template</h4>
            <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
              <option value="feature-film">Feature Film</option>
              <option value="short-film">Short Film</option>
              <option value="documentary">Documentary</option>
              <option value="commercial">Commercial</option>
              <option value="music-video">Music Video</option>
              <option value="series">TV Series</option>
            </select>
          </div>

          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-white font-medium mb-2">Time Zone</h4>
            <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
              <option value="utc">UTC</option>
              <option value="est">Eastern Time (EST)</option>
              <option value="pst">Pacific Time (PST)</option>
              <option value="cst">Central Time (CST)</option>
              <option value="mst">Mountain Time (MST)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  const renderKeyboardSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setKeyboardShortcuts(keyboardShortcuts.map((s) => ({ ...s, currentKeys: [...s.defaultKeys] })))
            }
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <input
          type="text"
          placeholder="Search shortcuts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        />
      </div>

      <div className="space-y-4">
        {shortcutCategories.map((category) => (
          <div key={category} className="space-y-2">
            <h4 className="text-white/70 font-medium text-sm uppercase tracking-wider">{category}</h4>
            <div className="space-y-1">
              {filteredShortcuts
                .filter((shortcut) => shortcut.category === category)
                .map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{shortcut.action}</div>
                      <div className="text-white/70 text-sm">{shortcut.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {(editingShortcut === shortcut.id ? recordingKeys : shortcut.currentKeys).map((key, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-white/20 text-white text-xs rounded border border-white/30 font-mono"
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                      {editingShortcut === shortcut.id ? (
                        <button
                          onClick={stopRecording}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                        >
                          Save
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startRecording(shortcut.id)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => resetShortcut(shortcut.id)}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {editingShortcut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-semibold mb-4">Recording Shortcut</h3>
            <p className="text-white/70 mb-4">Press the key combination you want to use:</p>
            <div className="flex gap-2 mb-4 min-h-[40px] items-center">
              {recordingKeys.map((key, i) => (
                <span key={i} className="px-3 py-2 bg-blue-500 text-white rounded border border-blue-400 font-mono">
                  {key}
                </span>
              ))}
              {recordingKeys.length === 0 && <span className="text-white/50 italic">Press keys...</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={stopRecording}
                disabled={recordingKeys.length === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingShortcut(null)
                  setRecordingKeys([])
                  document.removeEventListener("keydown", handleKeyRecord)
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      {/* Theme Mode */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light", label: "Light", icon: Sun },
            { id: "dark", label: "Dark", icon: Moon },
            { id: "auto", label: "Auto", icon: Settings },
          ].map((theme) => (
            <button
              key={theme.id}
              onClick={() => setThemeMode(theme.id as any)}
              className={`p-4 rounded-lg border-2 transition-all ${themeMode === theme.id
                ? "border-blue-400 bg-blue-500/20"
                : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
            >
              <theme.icon className="h-6 w-6 text-white mx-auto mb-2" />
              <span className="text-white text-sm font-medium">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Selection */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Typography</h3>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Type className="h-4 w-4" />
            App Font
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {fontOptions.map((font) => (
              <button
                key={font.id}
                onClick={() => setSelectedFont(font.id)}
                className={`p-3 rounded-lg border transition-all text-left ${selectedFont === font.id
                  ? "border-blue-400 bg-blue-500/20"
                  : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                style={{ fontFamily: font.family }}
              >
                <div className="text-white font-medium">{font.name}</div>
                <div className="text-white/70 text-sm">The quick brown fox</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Background Settings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Background Settings</h3>

        <div className="mb-4">
          <div className="flex gap-2 p-1 bg-white/10 rounded-lg">
            <button
              onClick={() => setBackgroundScope("global")}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${backgroundScope === "global" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Global
            </button>
            <button
              onClick={() => setBackgroundScope("project")}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${backgroundScope === "project" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Current Project
            </button>
          </div>
          <p className="text-white/70 text-sm mt-2">
            {backgroundScope === "global"
              ? "Apply background to all projects"
              : `Apply background to "${currentProject?.title}" only`}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {backgroundOptions.map((bg) => (
            <div
              key={bg.id}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedBackground === bg.id ? "border-blue-400" : "border-white/20 hover:border-white/40"
                }`}
              onClick={() => setSelectedBackground(bg.id)}
            >
              <div className="aspect-video relative">
                {bg.type === "image" ? (
                  <img src={bg.thumbnail || "/placeholder.svg"} alt={bg.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: bg.thumbnail }} />
                )}
                {selectedBackground === bg.id && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                )}
                {bg.isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteCustomBackground(bg.id)
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="p-2">
                <p className="text-white text-xs font-medium truncate">{bg.name}</p>
                <p className="text-white/50 text-xs capitalize">{bg.type}</p>
              </div>
            </div>
          ))}

          {/* Upload Button */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video border-2 border-dashed border-white/40 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/60 hover:bg-white/5 transition-all"
          >
            <Upload className="h-6 w-6 text-white/70 mb-2" />
            <span className="text-white/70 text-xs">Upload Image</span>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

        <div className="flex gap-3">
          <button
            onClick={applyBackground}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            Apply Background
          </button>
          <button
            onClick={() => setSelectedBackground("default")}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Interface Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium">Sidebar Auto-collapse</h4>
              <p className="text-white/70 text-sm">Automatically collapse sidebar on small screens</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium">Animations</h4>
              <p className="text-white/70 text-sm">Enable smooth transitions and animations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-white font-medium mb-2">UI Scale</h4>
            <div className="flex items-center gap-4">
              <span className="text-white/70 text-sm">Small</span>
              <input
                type="range"
                min="80"
                max="120"
                defaultValue="100"
                className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-white/70 text-sm">Large</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderProjectSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Project Management</h3>
        <button
          onClick={() => setIsCreatingProject(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Folder className="h-4 w-4" />
          Create New Project
        </button>
      </div>

      {isCreatingProject && (
        <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
          <h4 className="text-white font-medium">New Project Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Project Title"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Genre"
              value={newProjectGenre}
              onChange={(e) => setNewProjectGenre(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCreatingProject(false)}
              className="px-4 py-2 text-white/70 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNewProject}
              disabled={!newProjectTitle}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
            >
              Create Project
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {project.title.charAt(0)}
                </div>
                <div>
                  {editingProjectId === project.id ? (
                    <input
                      type="text"
                      defaultValue={project.title}
                      onBlur={(e) => handleUpdateExistingProject(project, { title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateExistingProject(project, { title: e.currentTarget.value })
                      }}
                      autoFocus
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    />
                  ) : (
                    <h4 className="text-white font-medium">{project.title}</h4>
                  )}
                  <p className="text-white/70 text-sm">{project.status} • {project.genre}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentProject(project)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
                  title="Switch to this project"
                >
                  <Check className={`h-4 w-4 ${currentProject.id === project.id ? 'text-green-400' : ''}`} />
                </button>
                <button
                  onClick={() => setEditingProjectId(project.id)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
                  title="Rename"
                >
                  <Type className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleUpdateExistingProject(project, { status: project.status === 'archived' ? 'development' : 'archived' })}
                  className={`p-2 rounded-lg ${project.status === 'archived' ? 'text-yellow-400 bg-yellow-400/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  title={project.status === 'archived' ? "Unarchive" : "Archive"}
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmationId(project.id)}
                  className="p-2 text-white/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-white font-semibold mb-2">Delete Project?</h3>
            <p className="text-white/70 text-sm mb-4">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmationId(null)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDeleteProject && deleteConfirmationId) {
                    onDeleteProject(deleteConfirmationId)
                    setDeleteConfirmationId(null)
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
              SF
            </div>
            <div className="flex-1">
              <input
                type="text"
                defaultValue="Studio Flow User"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mb-2"
                placeholder="Display Name"
              />
              <input
                type="email"
                defaultValue="user@studioflow.com"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                placeholder="Email Address"
              />
            </div>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              Update
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium">Email Notifications</h4>
              <p className="text-white/70 text-sm">Receive updates about your projects via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium">Push Notifications</h4>
              <p className="text-white/70 text-sm">Get notified about important updates in real-time</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium">Weekly Reports</h4>
              <p className="text-white/70 text-sm">Receive weekly project progress summaries</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Security</h3>
        <div className="space-y-4">
          <button className="w-full p-4 bg-white/5 rounded-lg border border-white/10 text-left hover:bg-white/10 transition-colors">
            <h4 className="text-white font-medium">Change Password</h4>
            <p className="text-white/70 text-sm">Update your account password</p>
          </button>

          <button className="w-full p-4 bg-white/5 rounded-lg border border-white/10 text-left hover:bg-white/10 transition-colors">
            <h4 className="text-white font-medium">Two-Factor Authentication</h4>
            <p className="text-white/70 text-sm">Add an extra layer of security to your account</p>
          </button>

          <button className="w-full p-4 bg-white/5 rounded-lg border border-white/10 text-left hover:bg-white/10 transition-colors">
            <h4 className="text-white font-medium">Active Sessions</h4>
            <p className="text-white/70 text-sm">Manage devices signed into your account</p>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Data & Privacy</h3>
        <div className="space-y-4">
          <button className="w-full p-4 bg-white/5 rounded-lg border border-white/10 text-left hover:bg-white/10 transition-colors">
            <h4 className="text-white font-medium">Export Data</h4>
            <p className="text-white/70 text-sm">Download a copy of your data</p>
          </button>

          <button className="w-full p-4 bg-red-500/10 rounded-lg border border-red-400/20 text-left hover:bg-red-500/20 transition-colors">
            <h4 className="text-red-400 font-medium">Delete Account</h4>
            <p className="text-red-400/70 text-sm">Permanently delete your account and all data</p>
          </button>
        </div>
      </div>
    </div>
  )

  const renderIntegrationsSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Integrations</h3>
          <p className="text-white/70 text-sm">Connect StudioFlow with your favorite filmmaking tools</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">{filteredIntegrations.length} available</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={integrationSearch}
            onChange={(e) => setIntegrationSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        >
          <option value="all">All Categories</option>
          {integrationCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Integration Categories */}
      <div className="space-y-6">
        {integrationCategories.map((category) => {
          const categoryIntegrations = filteredIntegrations.filter((i) => i.category === category)
          if (categoryIntegrations.length === 0) return null

          return (
            <div key={category}>
              <h4 className="text-white/70 font-medium text-sm uppercase tracking-wider mb-3">{category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{integration.icon}</div>
                        <div>
                          <h5 className="text-white font-medium">{integration.name}</h5>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(integration.status)}`}
                          >
                            {getStatusText(integration.status)}
                          </span>
                        </div>
                      </div>
                      {integration.status === "connected" ? (
                        <button className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors">
                          Disconnect
                        </button>
                      ) : integration.status === "available" ? (
                        <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors">
                          Connect
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1 bg-white/10 text-white/50 text-xs rounded cursor-not-allowed"
                        >
                          Coming Soon
                        </button>
                      )}
                    </div>

                    <p className="text-white/70 text-sm mb-3">{integration.description}</p>

                    <div className="mb-3">
                      <h6 className="text-white/80 text-xs font-medium mb-1">Features:</h6>
                      <div className="flex flex-wrap gap-1">
                        {integration.features.slice(0, 3).map((feature, i) => (
                          <span key={i} className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded">
                            {feature}
                          </span>
                        ))}
                        {integration.features.length > 3 && (
                          <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded">
                            +{integration.features.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {integration.pricing && (
                      <div className="text-white/60 text-xs">
                        <span className="font-medium">Pricing:</span> {integration.pricing}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Connected Integrations Summary */}
      <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Plug className="h-5 w-5 text-blue-400" />
          <h4 className="text-white font-medium">Connected Integrations</h4>
        </div>
        <p className="text-white/70 text-sm mb-3">
          You have {integrations.filter((i) => i.status === "connected").length} active integration
          {integrations.filter((i) => i.status === "connected").length !== 1 ? "s" : ""}.
        </p>
        <div className="flex flex-wrap gap-2">
          {integrations
            .filter((i) => i.status === "connected")
            .map((integration) => (
              <div key={integration.id} className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full">
                <span className="text-sm">{integration.icon}</span>
                <span className="text-white text-sm">{integration.name}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "keyboard", label: "Keyboard", icon: Keyboard },
    { id: "projects", label: "Projects", icon: Folder },
    { id: "integrations", label: "Integrations", icon: Plug },
    { id: "account", label: "Account", icon: User },
  ]

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
      <div className="flex h-[600px]">
        {/* Settings Sidebar */}
        <div className="w-64 bg-white/5 border-r border-white/10 p-4">
          <h2 className="text-xl font-bold text-white mb-6">Settings</h2>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === tab.id ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "general" && renderGeneralSettings()}
          {activeTab === "keyboard" && renderKeyboardSettings()}
          {activeTab === "appearance" && renderAppearanceSettings()}
          {activeTab === "projects" && renderProjectSettings()}
          {activeTab === "account" && renderAccountSettings()}
          {activeTab === "integrations" && renderIntegrationsSettings()}
        </div>
      </div>
    </div>
  )
}
