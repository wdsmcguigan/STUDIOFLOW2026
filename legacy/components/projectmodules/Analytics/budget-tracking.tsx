"use client"

import { useState } from "react"
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  FileText,
  Users,
  Camera,
  Music,
  Palette,
  Zap,
  MapPin,
  Car,
  Home,
  Utensils,
  Shirt,
  X,
  Brain,
  Target,
  PieChart,
  BarChart3,
  Filter,
  Grid3X3,
  ChevronDown,
  Lightbulb,
} from "lucide-react"

interface BudgetItem {
  id: string
  category: string
  department: string
  item: string
  budgeted: number
  actual: number
  remaining: number
  status: "on-budget" | "over-budget" | "under-budget" | "pending"
  priority: "high" | "medium" | "low"
  vendor?: string
  approvedBy?: string
  notes: string
  dueDate?: string
  lastUpdated: string
}

interface BudgetSummary {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  percentSpent: number
  percentRemaining: number
  overBudgetItems: number
  pendingApprovals: number
}

interface AIInsight {
  type: "optimization" | "alert" | "suggestion" | "prediction"
  title: string
  description: string
  impact: "high" | "medium" | "low"
  savings?: number
  action?: string
}

export default function BudgetTracking({ searchQuery = "" }: { searchQuery?: string }) {
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<"detailed" | "summary" | "categories">("detailed")
  const [gridSize, setGridSize] = useState(3)
  const [showAIInsights, setShowAIInsights] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  // Sample budget data
  const budgetItems: BudgetItem[] = [
    {
      id: "1",
      category: "N", // Talent
      department: "Talent",
      item: "Lead Actor - Emma Stone",
      budgeted: 2000000,
      actual: 2000000,
      remaining: 0,
      status: "on-budget",
      priority: "high",
      vendor: "CAA Talent Agency",
      approvedBy: "Michael Torres",
      notes: "Contract signed. Payment schedule: 50% upfront, 50% on completion.",
      dueDate: "2024-02-01",
      lastUpdated: "2024-01-15",
    },
    {
      id: "2",
      category: "N", // Talent
      department: "Talent",
      item: "Lead Actor - Michael Chen",
      budgeted: 1500000,
      actual: 1500000,
      remaining: 0,
      status: "on-budget",
      priority: "high",
      vendor: "WME Talent",
      approvedBy: "Michael Torres",
      notes: "Contract finalized. All payments processed.",
      lastUpdated: "2024-01-12",
    },
    {
      id: "3",
      category: "I", // Equipment
      department: "Camera",
      item: "Camera Equipment Rental",
      budgeted: 150000,
      actual: 165000,
      remaining: -15000,
      status: "over-budget",
      priority: "high",
      vendor: "Panavision",
      approvedBy: "Sarah Chen",
      notes: "Additional lenses required for night scenes. Approved overage.",
      dueDate: "2024-01-30",
      lastUpdated: "2024-01-18",
    },
    {
      id: "4",
      category: "D", // Location
      department: "Locations",
      item: "Downtown Loft Studio",
      budgeted: 75000,
      actual: 60000,
      remaining: 15000,
      status: "under-budget",
      priority: "medium",
      vendor: "Metro Studios LLC",
      approvedBy: "Location Manager",
      notes: "Negotiated better rate for extended booking.",
      lastUpdated: "2024-01-10",
    },
    {
      id: "5",
      category: "B", // Shooe/Crew
      department: "Crew",
      item: "Director of Photography",
      budgeted: 200000,
      actual: 180000,
      remaining: 20000,
      status: "under-budget",
      priority: "high",
      vendor: "Freelance",
      approvedBy: "Sarah Chen",
      notes: "Experienced DP agreed to reduced rate for creative control.",
      lastUpdated: "2024-01-08",
    },
    {
      id: "6",
      category: "K", // Misc/Post
      department: "Editorial",
      item: "Post-Production Suite",
      budgeted: 120000,
      actual: 0,
      remaining: 120000,
      status: "pending",
      priority: "medium",
      vendor: "Post House LA",
      notes: "Awaiting final quote and contract approval.",
      dueDate: "2024-03-01",
      lastUpdated: "2024-01-20",
    },
    {
      id: "7",
      category: "D", // Location/Travel
      department: "Transportation",
      item: "Vehicle Rentals",
      budgeted: 45000,
      actual: 52000,
      remaining: -7000,
      status: "over-budget",
      priority: "low",
      vendor: "Enterprise Rent-A-Car",
      approvedBy: "AD",
      notes: "Additional vehicles needed for cast transportation.",
      lastUpdated: "2024-01-16",
    },
    {
      id: "8",
      category: "B", // Production - catering is technically craft service often in B or meals in C/N
      department: "Catering",
      item: "Craft Services",
      budgeted: 35000,
      actual: 28000,
      remaining: 7000,
      status: "under-budget",
      priority: "low",
      vendor: "Film Catering Co",
      notes: "Efficient meal planning reduced costs.",
      lastUpdated: "2024-01-14",
    },
  ]

  // AI Insights
  const aiInsights: AIInsight[] = [
    {
      type: "optimization",
      title: "Equipment Rental Optimization",
      description:
        "AI identified 3 overlapping equipment rentals. Consolidating vendors could save 12% on camera department budget.",
      impact: "high",
      savings: 18000,
      action: "Consolidate rentals",
    },
    {
      type: "alert",
      title: "Budget Variance Alert",
      description: "Camera department is 10% over budget. Recommend immediate cost review and approval for overages.",
      impact: "high",
      action: "Review overages",
    },
    {
      type: "suggestion",
      title: "Location Cost Savings",
      description:
        "Similar locations available at 25% lower cost. Quality analysis shows minimal impact on production value.",
      impact: "medium",
      savings: 12500,
      action: "Review alternatives",
    },
    {
      type: "prediction",
      title: "Post-Production Budget Forecast",
      description: "Based on current spending patterns, post-production likely to finish 8% under budget.",
      impact: "low",
      savings: 9600,
      action: "Reallocate funds",
    },
  ]

  const calculateSummary = (): BudgetSummary => {
    const totalBudget = budgetItems.reduce((sum, item) => sum + item.budgeted, 0)
    const totalSpent = budgetItems.reduce((sum, item) => sum + item.actual, 0)
    const totalRemaining = totalBudget - totalSpent
    const percentSpent = (totalSpent / totalBudget) * 100
    const percentRemaining = (totalRemaining / totalBudget) * 100
    const overBudgetItems = budgetItems.filter((item) => item.status === "over-budget").length
    const pendingApprovals = budgetItems.filter((item) => item.status === "pending").length

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      percentSpent,
      percentRemaining,
      overBudgetItems,
      pendingApprovals,
    }
  }

  const summary = calculateSummary()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-budget":
        return "bg-green-500"
      case "under-budget":
        return "bg-blue-500"
      case "over-budget":
        return "bg-red-500"
      case "pending":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "on-budget":
        return <CheckCircle className="h-4 w-4" />
      case "under-budget":
        return <TrendingDown className="h-4 w-4" />
      case "over-budget":
        return <AlertTriangle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getDepartmentIcon = (department: string) => {
    switch (department.toLowerCase()) {
      case "talent":
        return <Users className="h-4 w-4" />
      case "camera":
        return <Camera className="h-4 w-4" />
      case "locations":
        return <MapPin className="h-4 w-4" />
      case "crew":
        return <Users className="h-4 w-4" />
      case "editorial":
        return <Edit className="h-4 w-4" />
      case "transportation":
        return <Car className="h-4 w-4" />
      case "catering":
        return <Utensils className="h-4 w-4" />
      case "wardrobe":
        return <Shirt className="h-4 w-4" />
      case "makeup":
        return <Palette className="h-4 w-4" />
      case "sound":
        return <Music className="h-4 w-4" />
      case "lighting":
        return <Zap className="h-4 w-4" />
      case "props":
        return <Home className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "border-red-400 bg-red-500/10"
      case "medium":
        return "border-yellow-400 bg-yellow-500/10"
      case "low":
        return "border-green-400 bg-green-500/10"
      default:
        return "border-gray-400 bg-gray-500/10"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const filteredItems = budgetItems.filter((item) => {
    const matchesSearch =
      item.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.vendor && item.vendor.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = filterCategory === "all" || item.category === filterCategory
    const matchesStatus = filterStatus === "all" || item.status === filterStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  const renderBudgetCard = (item: BudgetItem, isExpanded: boolean) => (
    <div
      key={item.id}
      className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 ${isExpanded ? "row-span-2" : ""
        }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">{getDepartmentIcon(item.department)}</div>
            <div>
              <h3 className="text-white font-semibold text-sm">{item.item}</h3>
              <p className="text-white/70 text-xs">{item.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(item.status)}`}>
              {getStatusIcon(item.status)}
            </span>
            <button
              onClick={() => setExpandedCard(isExpanded ? null : item.id)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Budgeted:</span>
            <span className="text-white">{formatCurrency(item.budgeted)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Actual:</span>
            <span className="text-white">{formatCurrency(item.actual)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Remaining:</span>
            <span
              className={`font-medium ${item.remaining < 0 ? "text-red-400" : item.remaining > 0 ? "text-green-400" : "text-white"
                }`}
            >
              {formatCurrency(item.remaining)}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/20 space-y-3">
            <div>
              <h4 className="text-white font-medium mb-2 text-sm">Details</h4>
              <div className="space-y-1 text-xs">
                {item.vendor && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Vendor:</span>
                    <span className="text-white">{item.vendor}</span>
                  </div>
                )}
                {item.approvedBy && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Approved By:</span>
                    <span className="text-white">{item.approvedBy}</span>
                  </div>
                )}
                {item.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Due Date:</span>
                    <span className="text-white">{new Date(item.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            {item.notes && (
              <div>
                <h4 className="text-white font-medium mb-1 text-sm">Notes</h4>
                <p className="text-white/70 text-xs">{item.notes}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-xs transition-colors">
                Edit
              </button>
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-xs transition-colors">
                Approve
              </button>
            </div>
          </div>
        )}

        {!isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs">{item.lastUpdated}</span>
              <div className="flex gap-1">
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <Edit className="h-3 w-3 text-white/70" />
                </button>
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <Eye className="h-3 w-3 text-white/70" />
                </button>
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <FileText className="h-3 w-3 text-white/70" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Budget Tracking</h1>
          <p className="text-white/70">Monitor expenses and financial performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Budget Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-white/70">Total Budget</span>
          </div>
          <p className="text-white font-medium text-sm">{formatCurrency(summary.totalBudget)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-red-400" />
            <span className="text-xs text-white/70">Total Spent</span>
          </div>
          <p className="text-white font-medium text-sm">{formatCurrency(summary.totalSpent)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-green-400" />
            <span className="text-xs text-white/70">Remaining</span>
          </div>
          <p className="text-white font-medium text-sm">{formatCurrency(summary.totalRemaining)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-white/70">Over Budget</span>
          </div>
          <p className="text-white font-medium text-sm">{summary.overBudgetItems}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white/70">Pending</span>
          </div>
          <p className="text-white font-medium text-sm">{summary.pendingApprovals}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-green-400" />
            <span className="text-xs text-white/70">Efficiency</span>
          </div>
          <p className="text-white font-medium text-sm">{summary.percentSpent.toFixed(1)}%</p>
        </div>
      </div>

      {/* AI Insights */}
      {showAIInsights && (
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">AI Budget Intelligence</h2>
            </div>
            <button
              onClick={() => setShowAIInsights(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiInsights.map((insight, i) => (
              <div key={i} className={`p-3 rounded-lg border ${getImpactColor(insight.impact)}`}>
                <div className="flex items-center gap-2 mb-2">
                  {insight.type === "optimization" && <Lightbulb className="h-4 w-4 text-green-400" />}
                  {insight.type === "alert" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                  {insight.type === "suggestion" && <Target className="h-4 w-4 text-blue-400" />}
                  {insight.type === "prediction" && <Brain className="h-4 w-4 text-purple-400" />}
                  <h3 className="text-white font-medium text-sm">{insight.title}</h3>
                </div>
                <p className="text-white/70 text-xs mb-2">{insight.description}</p>
                <div className="flex items-center justify-between">
                  {insight.savings && (
                    <span className="text-green-400 text-xs font-medium">Save: {formatCurrency(insight.savings)}</span>
                  )}
                  {insight.action && (
                    <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs transition-colors">
                      {insight.action}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/70" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              <option value="all">All Categories</option>
              {Array.from(new Set(budgetItems.map(i => i.category))).sort().map(cat => (
                <option key={cat} value={cat}>Section {cat}</option>
              ))}
            </select>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          >
            <option value="all">All Status</option>
            <option value="on-budget">On Budget</option>
            <option value="under-budget">Under Budget</option>
            <option value="over-budget">Over Budget</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20">
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "detailed" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("summary")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "summary" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("categories")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "categories" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <PieChart className="h-4 w-4" />
            </button>
          </div>

          {viewMode === "detailed" && (
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20">
              {[2, 3, 4, 5].map((size) => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${gridSize === size ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                    }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === "detailed" && (
        <div
          className={`grid gap-4 ${gridSize === 2 ? "grid-cols-2" : gridSize === 3 ? "grid-cols-3" : gridSize === 4 ? "grid-cols-4" : "grid-cols-5"}`}
        >
          {filteredItems.map((item) => renderBudgetCard(item, expandedCard === item.id))}
        </div>
      )}

      {viewMode === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Category */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-medium mb-4">Budget by Category</h3>
            <div className="space-y-4">
              {Array.from(new Set(budgetItems.map(i => i.category))).sort().map((category) => {
                const categoryItems = budgetItems.filter((item) => item.category === category)
                const categoryBudget = categoryItems.reduce((sum, item) => sum + item.budgeted, 0)
                const categorySpent = categoryItems.reduce((sum, item) => sum + item.actual, 0)
                const categoryPercent = categoryBudget > 0 ? (categorySpent / categoryBudget) * 100 : 0

                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white capitalize">Section {category}</span>
                      <span className="text-white/70 text-sm">{categoryPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${categoryPercent > 100 ? "bg-red-500" : categoryPercent > 80 ? "bg-yellow-500" : "bg-green-500"
                          }`}
                        style={{ width: `${Math.min(categoryPercent, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-white/60 mt-1">
                      <span>{formatCurrency(categorySpent)}</span>
                      <span>{formatCurrency(categoryBudget)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* By Department */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-medium mb-4">Top Spending Departments</h3>
            <div className="space-y-3">
              {Array.from(new Set(budgetItems.map((item) => item.department)))
                .map((department) => {
                  const deptItems = budgetItems.filter((item) => item.department === department)
                  const deptSpent = deptItems.reduce((sum, item) => sum + item.actual, 0)
                  return { department, spent: deptSpent }
                })
                .sort((a, b) => b.spent - a.spent)
                .slice(0, 6)
                .map(({ department, spent }) => (
                  <div key={department} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDepartmentIcon(department)}
                      <span className="text-white">{department}</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(spent)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from(new Set(budgetItems.map(i => i.category))).sort().map((category) => {
            const categoryItems = budgetItems.filter((item) => item.category === category)
            const categoryBudget = categoryItems.reduce((sum, item) => sum + item.budgeted, 0)
            const categorySpent = categoryItems.reduce((sum, item) => sum + item.actual, 0)
            const categoryPercent = categoryBudget > 0 ? (categorySpent / categoryBudget) * 100 : 0

            return (
              <div key={category} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-white font-semibold mb-4 capitalize">Section {category}</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{formatCurrency(categorySpent)}</div>
                    <div className="text-white/70 text-sm">of {formatCurrency(categoryBudget)}</div>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${categoryPercent > 100 ? "bg-red-500" : categoryPercent > 80 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                      style={{ width: `${Math.min(categoryPercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-center">
                    <span className="text-white font-medium">{categoryPercent.toFixed(1)}% spent</span>
                  </div>
                  <div className="space-y-2">
                    {categoryItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-white/70 truncate">{item.item}</span>
                        <span className="text-white">{formatCurrency(item.actual)}</span>
                      </div>
                    ))}
                    {categoryItems.length > 3 && (
                      <div className="text-center text-white/60 text-xs">+{categoryItems.length - 3} more items</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
