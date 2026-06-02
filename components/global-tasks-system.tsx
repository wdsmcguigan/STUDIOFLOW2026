"use client"

import { useState, useEffect } from "react"
import {
  CheckSquare,
  Square,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  ExternalLink,
  MessageSquare,
  X,
  Target,
  Zap,
  Brain,
  Users,
  FileText,
  Video,
  Palette,
  Music,
  MapPin,
  Camera,
  DollarSign,
} from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string
  status: "todo" | "in-progress" | "review" | "completed" | "blocked"
  priority: "low" | "medium" | "high" | "urgent"
  assignedTo: string[]
  createdBy: string
  dueDate?: string
  completedDate?: string
  estimatedHours?: number
  actualHours?: number
  tags: string[]
  moduleId: string
  assetId?: string
  projectId: string
  dependencies: string[]
  subtasks: SubTask[]
  comments: TaskComment[]
  createdAt: string
  updatedAt: string
  aiGenerated?: boolean
  aiSuggestion?: string
}

interface SubTask {
  id: string
  title: string
  completed: boolean
  assignedTo?: string
  dueDate?: string
}

interface TaskComment {
  id: string
  content: string
  author: string
  createdAt: string
  type: "comment" | "status_change" | "assignment"
}

interface GlobalTasksProps {
  currentProject?: any
  currentModule?: string
  onTaskClick?: (task: Task) => void
  variant?: "overlay" | "sidebar" | "panel"
  className?: string
}

const MODULE_ICONS = {
  script: FileText,
  storyboard: Palette,
  schedule: Calendar,
  cast: Users,
  locations: MapPin,
  gear: Camera,
  budget: DollarSign,
  vfx: Zap,
  audio: Music,
  dailies: Video,
  "post-timeline": Video,
  "dailies-review": Video,
  legal: FileText,
  moodboard: Palette,
}

const PRIORITY_COLORS = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  urgent: "text-red-400",
}

const STATUS_COLORS = {
  todo: "bg-gray-500",
  "in-progress": "bg-blue-500",
  review: "bg-yellow-500",
  completed: "bg-green-500",
  blocked: "bg-red-500",
}

export default function GlobalTasksSystem({
  currentProject,
  currentModule,
  onTaskClick,
  variant = "overlay",
  className = "",
}: GlobalTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterAssignee, setFilterAssignee] = useState<string>("all")
  const [showCompleted, setShowCompleted] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskModule, setNewTaskModule] = useState(currentModule || "")

  // Sample tasks data
  useEffect(() => {
    const sampleTasks: Task[] = [
      {
        id: "task_1",
        title: "Review VFX Shot #12",
        description: "Review hologram effect and provide feedback for final iteration",
        status: "in-progress",
        priority: "high",
        assignedTo: ["Sarah Chen", "VFX Supervisor"],
        createdBy: "Director",
        dueDate: "2024-03-20T15:00:00Z",
        estimatedHours: 2,
        actualHours: 1.5,
        tags: ["vfx", "review", "hologram"],
        moduleId: "vfx",
        assetId: "vfx_shot_12",
        projectId: "project_1",
        dependencies: [],
        subtasks: [
          { id: "sub_1", title: "Check lighting integration", completed: true },
          { id: "sub_2", title: "Verify particle effects", completed: false },
          { id: "sub_3", title: "Test different angles", completed: false },
        ],
        comments: [
          {
            id: "comment_1",
            content: "Hologram looks great but needs more transparency in the edges",
            author: "Sarah Chen",
            createdAt: "2024-03-19T14:30:00Z",
            type: "comment",
          },
        ],
        createdAt: "2024-03-18T10:00:00Z",
        updatedAt: "2024-03-19T14:30:00Z",
        aiGenerated: false,
      },
      {
        id: "task_2",
        title: "Sync dailies with st oryboard",
        description: "Compare Scene 12 dailies against original storyboard panels",
        status: "todo",
        priority: "medium",
        assignedTo: ["Editor"],
        createdBy: "AI Assistant",
        dueDate: "2024-03-21T12:00:00Z",
        estimatedHours: 1,
        tags: ["dailies", "storyboard", "comparison"],
        moduleId: "dailies-review",
        projectId: "project_1",
        dependencies: ["task_1"],
        subtasks: [],
        comments: [],
        createdAt: "2024-03-19T09:00:00Z",
        updatedAt: "2024-03-19T09:00:00Z",
        aiGenerated: true,
        aiSuggestion: "AI detected discrepancies between storyboard and dailies that need review",
      },
      {
        id: "task_3",
        title: "Update character theme music",
        description: "Incorporate feedback from director meeting and adjust tempo",
        status: "review",
        priority: "medium",
        assignedTo: ["Composer"],
        createdBy: "Music Supervisor",
        dueDate: "2024-03-22T17:00:00Z",
        estimatedHours: 3,
        actualHours: 2.5,
        tags: ["music", "character", "revision"],
        moduleId: "audio",
        assetId: "character_theme",
        projectId: "project_1",
        dependencies: [],
        subtasks: [
          { id: "sub_4", title: "Adjust tempo to 110 BPM", completed: true },
          { id: "sub_5", title: "Add string section", completed: true },
          { id: "sub_6", title: "Master final version", completed: false },
        ],
        comments: [],
        createdAt: "2024-03-17T16:00:00Z",
        updatedAt: "2024-03-19T11:00:00Z",
        aiGenerated: false,
      },
      {
        id: "task_4",
        title: "Generate mood reference for night scenes",
        description: "Create moodboard for all night exterior scenes using AI generation",
        status: "completed",
        priority: "low",
        assignedTo: ["Art Director"],
        createdBy: "AI Assistant",
        dueDate: "2024-03-19T10:00:00Z",
        completedDate: "2024-03-19T09:30:00Z",
        estimatedHours: 0.5,
        actualHours: 0.3,
        tags: ["moodboard", "night", "ai-generated"],
        moduleId: "moodboard",
        projectId: "project_1",
        dependencies: [],
        subtasks: [],
        comments: [],
        createdAt: "2024-03-18T15:00:00Z",
        updatedAt: "2024-03-19T09:30:00Z",
        aiGenerated: true,
        aiSuggestion: "AI can generate atmospheric night scene references based on script analysis",
      },
      {
        id: "task_5",
        title: "Schedule pickup shots",
        description: "Coordinate with cast and crew for additional coverage needed",
        status: "blocked",
        priority: "urgent",
        assignedTo: ["1st AD", "Producer"],
        createdBy: "Director",
        dueDate: "2024-03-20T09:00:00Z",
        estimatedHours: 4,
        tags: ["schedule", "pickup", "coordination"],
        moduleId: "schedule",
        projectId: "project_1",
        dependencies: ["task_1"],
        subtasks: [
          { id: "sub_7", title: "Check actor availability", completed: false },
          { id: "sub_8", title: "Book equipment", completed: false },
          { id: "sub_9", title: "Confirm location", completed: false },
        ],
        comments: [
          {
            id: "comment_2",
            content: "Waiting for VFX review completion before scheduling",
            author: "1st AD",
            createdAt: "2024-03-19T13:00:00Z",
            type: "comment",
          },
        ],
        createdAt: "2024-03-18T14:00:00Z",
        updatedAt: "2024-03-19T13:00:00Z",
        aiGenerated: false,
      },
    ]

    setTasks(sampleTasks)
  }, [])

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = filterStatus === "all" || task.status === filterStatus
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority
    const matchesAssignee = filterAssignee === "all" || task.assignedTo.includes(filterAssignee)
    const matchesCompleted = showCompleted || task.status !== "completed"

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesCompleted
  })

  // Get task statistics
  const getTaskStats = () => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "completed").length
    const inProgress = tasks.filter((t) => t.status === "in-progress").length
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed",
    ).length
    const aiGenerated = tasks.filter((t) => t.aiGenerated).length

    return { total, completed, inProgress, overdue, aiGenerated }
  }

  // Create new task
  const createTask = () => {
    if (!newTaskTitle.trim()) return

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      status: "todo",
      priority: "medium",
      assignedTo: [],
      createdBy: "Current User",
      tags: [],
      moduleId: newTaskModule,
      projectId: currentProject?.id || "project_1",
      dependencies: [],
      subtasks: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTasks((prev) => [newTask, ...prev])
    setNewTaskTitle("")
    setShowTaskModal(false)
  }

  // Update task status
  const updateTaskStatus = (taskId: string, status: Task["status"]) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              updatedAt: new Date().toISOString(),
              completedDate: status === "completed" ? new Date().toISOString() : undefined,
            }
          : task,
      ),
    )
  }

  // Toggle subtask
  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
              ),
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    )
  }

  // Get AI task suggestions
  const getAISuggestions = () => {
    // Mock AI suggestions based on current context
    const suggestions = [
      {
        title: "Generate storyboard for Scene 15",
        description: "AI detected missing storyboard panels for upcoming shoot",
        moduleId: "storyboard",
        priority: "medium" as const,
        estimatedHours: 1,
      },
      {
        title: "Review color grading consistency",
        description: "AI analysis shows color temperature variations across dailies",
        moduleId: "dailies-review",
        priority: "low" as const,
        estimatedHours: 2,
      },
      {
        title: "Update budget tracking",
        description: "Recent expenses need to be logged and categorized",
        moduleId: "budget",
        priority: "medium" as const,
        estimatedHours: 0.5,
      },
    ]

    return suggestions
  }

  // Render task card
  const renderTaskCard = (task: Task) => {
    const ModuleIcon = MODULE_ICONS[task.moduleId as keyof typeof MODULE_ICONS] || Target
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed"
    const completedSubtasks = task.subtasks.filter((st) => st.completed).length

    return (
      <div
        className={`bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors cursor-pointer ${
          isOverdue ? "border-red-400/30 bg-red-500/5" : ""
        }`}
        onClick={() => {
          setSelectedTask(task)
          onTaskClick?.(task)
        }}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateTaskStatus(task.id, task.status === "completed" ? "todo" : "completed")
            }}
            className="mt-1"
          >
            {task.status === "completed" ? (
              <CheckSquare className="h-5 w-5 text-green-400" />
            ) : (
              <Square className="h-5 w-5 text-white/50 hover:text-white" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4
                className={`font-medium text-sm ${
                  task.status === "completed" ? "text-white/60 line-through" : "text-white"
                }`}
              >
                {task.title}
              </h4>

              {task.aiGenerated && <Brain className="h-4 w-4 text-purple-400" title="AI Generated" />}

              {isOverdue && <AlertTriangle className="h-4 w-4 text-red-400" title="Overdue" />}
            </div>

            {task.description && <p className="text-white/60 text-xs mb-2 line-clamp-2">{task.description}</p>}

            <div className="flex items-center gap-3 text-xs text-white/50 mb-2">
              <div className="flex items-center gap-1">
                <ModuleIcon className="h-3 w-3" />
                <span className="capitalize">{task.moduleId.replace("-", " ")}</span>
              </div>

              <div className={`px-2 py-1 rounded ${STATUS_COLORS[task.status]} text-white text-xs`}>
                {task.status.replace("-", " ")}
              </div>

              <span className={`${PRIORITY_COLORS[task.priority]} font-medium`}>{task.priority}</span>

              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {task.subtasks.length > 0 && (
              <div className="text-xs text-white/60 mb-2">
                Subtasks: {completedSubtasks}/{task.subtasks.length} completed
              </div>
            )}

            {task.assignedTo.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-white/60">
                <User className="h-3 w-3" />
                <span>{task.assignedTo.join(", ")}</span>
              </div>
            )}

            {task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded">
                    {tag}
                  </span>
                ))}
                {task.tags.length > 3 && <span className="text-white/50 text-xs">+{task.tags.length - 3}</span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {task.comments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-white/50">
                <MessageSquare className="h-3 w-3" />
                <span>{task.comments.length}</span>
              </div>
            )}
            <ExternalLink className="h-4 w-4 text-white/30" />
          </div>
        </div>
      </div>
    )
  }

  // Render AI suggestions
  const renderAISuggestions = () => {
    if (!showAISuggestions) return null

    const suggestions = getAISuggestions()

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <h3 className="text-white font-medium">AI Suggestions</h3>
          </div>
          <button onClick={() => setShowAISuggestions(false)} className="text-white/50 hover:text-white text-sm">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div key={index} className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm mb-1">{suggestion.title}</h4>
                  <p className="text-white/60 text-xs mb-2">{suggestion.description}</p>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span className="capitalize">{suggestion.moduleId.replace("-", " ")}</span>
                    <span>•</span>
                    <span className={PRIORITY_COLORS[suggestion.priority]}>{suggestion.priority}</span>
                    <span>•</span>
                    <span>~{suggestion.estimatedHours}h</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNewTaskTitle(suggestion.title)
                    setNewTaskModule(suggestion.moduleId)
                    setShowTaskModal(true)
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  Create Task
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render task filters
  const renderFilters = () => (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="flex-1 min-w-0 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        />
      </div>

      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
      >
        <option value="all">All Status</option>
        <option value="todo">To Do</option>
        <option value="in-progress">In Progress</option>
        <option value="review">Review</option>
        <option value="completed">Completed</option>
        <option value="blocked">Blocked</option>
      </select>

      <select
        value={filterPriority}
        onChange={(e) => setFilterPriority(e.target.value)}
        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
      >
        <option value="all">All Priority</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <button
        onClick={() => setShowCompleted(!showCompleted)}
        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
          showCompleted
            ? "bg-green-500/20 text-green-400 border border-green-400/30"
            : "bg-white/10 text-white/70 border border-white/20"
        }`}
      >
        {showCompleted ? "Hide" : "Show"} Completed
      </button>
    </div>
  )

  // Render task statistics
  const renderStats = () => {
    const stats = getTaskStats()

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-white/60">Total Tasks</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-xs text-white/60">Completed</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
          <div className="text-xs text-white/60">In Progress</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
          <div className="text-xs text-white/60">Overdue</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{stats.aiGenerated}</div>
          <div className="text-xs text-white/60">AI Generated</div>
        </div>
      </div>
    )
  }

  // Render main content
  const renderContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Global Tasks</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTaskModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            New Task
          </button>
        </div>
      </div>

      {renderStats()}
      {renderAISuggestions()}
      {renderFilters()}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 text-white/30 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-2">No Tasks Found</h3>
            <p className="text-white/60 text-sm">
              {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                ? "Try adjusting your filters or search query."
                : "Create your first task to get started."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => <div key={task.id}>{renderTaskCard(task)}</div>)
        )}
      </div>
    </div>
  )

  // Render new task modal
  const renderTaskModal = () => {
    if (!showTaskModal) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Create New Task</h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Task Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Module</label>
                <select
                  value={newTaskModule}
                  onChange={(e) => setNewTaskModule(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">Select Module</option>
                  {Object.keys(MODULE_ICONS).map((moduleId) => (
                    <option key={moduleId} value={moduleId}>
                      {moduleId.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createTask}
                disabled={!newTaskTitle.trim() || !newTaskModule}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium"
              >
                Create Task
              </button>
              <button
                onClick={() => setShowTaskModal(false)}
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

  // Render based on variant
  if (variant === "overlay") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed top-4 right-4 z-40 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-3 hover:bg-white/20 transition-colors ${className}`}
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-white" />
            <span className="text-white font-medium">Tasks</span>
            {getTaskStats().inProgress > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">{getTaskStats().inProgress}</span>
            )}
          </div>
        </button>

        {isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Global Tasks</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
                {renderContent()}
              </div>
            </div>
          </div>
        )}

        {renderTaskModal()}
      </>
    )
  }

  if (variant === "sidebar") {
    return (
      <div className={`w-80 bg-white/10 backdrop-blur-lg border-l border-white/20 p-4 ${className}`}>
        {renderContent()}
        {renderTaskModal()}
      </div>
    )
  }

  return (
    <div className={`bg-white/5 rounded-lg border border-white/10 p-6 ${className}`}>
      {renderContent()}
      {renderTaskModal()}
    </div>
  )
}

// Hook for managing tasks
export function useGlobalTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  const createTask = async (taskData: Partial<Task>) => {
    setLoading(true)
    // Implementation would call API
    setLoading(false)
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    setLoading(true)
    // Implementation would call API
    setLoading(false)
  }

  const deleteTask = async (taskId: string) => {
    setLoading(true)
    // Implementation would call API
    setLoading(false)
  }

  const getTasksByModule = (moduleId: string) => {
    return tasks.filter((task) => task.moduleId === moduleId)
  }

  const getOverdueTasks = () => {
    return tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed")
  }

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    getTasksByModule,
    getOverdueTasks,
  }
}
