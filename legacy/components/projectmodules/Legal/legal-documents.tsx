"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Plus,
  Filter,
  Download,
  Eye,
  Edit3,
  Clock,
  Users,
  MapPin,
  Camera,
  Music,
  Zap,
  Building,
  Shield,
  Star,
  BookOpen,
  ChevronDown,
  X,
  Check,
  Brain,
  AlertTriangle,
  TrendingUp,
  Target,
  Grid3X3,
  List,
  Lightbulb,
} from "lucide-react"

interface LegalDocument {
  id: string
  title: string
  type: string
  category: "production" | "post-production"
  status: "draft" | "pending" | "signed" | "expired" | "rejected"
  priority: "high" | "medium" | "low"
  dueDate: string
  signedDate?: string
  expiryDate?: string
  parties: string[]
  amount?: number
  description: string
  tags: string[]
  attachments: string[]
  template?: boolean
  lastModified: string
  assignedTo: string
  progress: number
}

interface DocumentTemplate {
  id: string
  name: string
  category: "production" | "post-production"
  type: string
  description: string
  fields: string[]
  icon: any
  popular: boolean
}

interface AIInsight {
  type: "optimization" | "alert" | "suggestion" | "prediction"
  title: string
  description: string
  impact: "high" | "medium" | "low"
  action?: string
}

const MOCK_DOCS_STORE: Record<string, LegalDocument[]> = {}

export default function LegalDocuments({ searchQuery = "", projectId = "1" }: { searchQuery?: string; projectId?: string }) {
  const [activeTab, setActiveTab] = useState<"production" | "post-production">("production")
  const [viewMode, setViewMode] = useState<"list" | "grid" | "templates">("grid")
  const [gridSize, setGridSize] = useState(3)
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [showGuidancePanel, setShowGuidancePanel] = useState(false)
  const [expandedGuidance, setExpandedGuidance] = useState<string | null>(null)
  const [showAIInsights, setShowAIInsights] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [documents, setDocuments] = useState<LegalDocument[]>([])

  // Sample documents data
  useEffect(() => {
    if (MOCK_DOCS_STORE[projectId]) {
      setDocuments(MOCK_DOCS_STORE[projectId])
      return
    }

    const initialDocuments: LegalDocument[] = [
      {
        id: "1",
        title: "Location Agreement - Central Park",
        type: "Location Agreement",
        category: "production",
        status: "signed",
        priority: "high",
        dueDate: "2024-01-15",
        signedDate: "2024-01-10",
        expiryDate: "2024-06-15",
        parties: ["NYC Parks Department", "Midnight Productions"],
        amount: 15000,
        description: "Filming permit and location agreement for Central Park scenes",
        tags: ["location", "permit", "nyc"],
        attachments: ["central-park-agreement.pdf", "insurance-cert.pdf"],
        lastModified: "2 hours ago",
        assignedTo: "Location Manager",
        progress: 100,
      },
      {
        id: "2",
        title: "Actor Contract - Sarah Chen",
        type: "Talent Agreement",
        category: "production",
        status: "pending",
        priority: "high",
        dueDate: "2024-01-20",
        parties: ["Sarah Chen", "Midnight Productions"],
        amount: 250000,
        description: "Lead actor contract with performance clauses",
        tags: ["talent", "lead", "contract"],
        attachments: ["sarah-chen-contract-draft.pdf"],
        lastModified: "1 day ago",
        assignedTo: "Producer",
        progress: 75,
      },
      {
        id: "3",
        title: "Equipment Rental - RED Camera Package",
        type: "Equipment Rental",
        category: "production",
        status: "signed",
        priority: "medium",
        dueDate: "2024-01-25",
        signedDate: "2024-01-12",
        parties: ["Camera House Rentals", "Midnight Productions"],
        amount: 45000,
        description: "RED camera package rental for 6-week shoot",
        tags: ["equipment", "camera", "rental"],
        attachments: ["red-camera-rental.pdf"],
        lastModified: "3 days ago",
        assignedTo: "DP",
        progress: 100,
      },
      {
        id: "4",
        title: "Music Licensing - Score Rights",
        type: "Music License",
        category: "post-production",
        status: "draft",
        priority: "medium",
        dueDate: "2024-03-01",
        parties: ["Composer John Smith", "Midnight Productions"],
        amount: 75000,
        description: "Original score composition and licensing agreement",
        tags: ["music", "score", "licensing"],
        attachments: [],
        lastModified: "5 hours ago",
        assignedTo: "Music Supervisor",
        progress: 30,
      },
      {
        id: "5",
        title: "VFX Services Agreement",
        type: "Service Agreement",
        category: "post-production",
        status: "pending",
        priority: "high",
        dueDate: "2024-02-15",
        parties: ["Digital Dreams VFX", "Midnight Productions"],
        amount: 180000,
        description: "Visual effects services for 45 shots",
        tags: ["vfx", "services", "post"],
        attachments: ["vfx-proposal.pdf", "shot-breakdown.xlsx"],
        lastModified: "1 hour ago",
        assignedTo: "VFX Producer",
        progress: 60,
      },
    ]

    if (projectId === "2") {
      initialDocuments.shift();
      initialDocuments[0].title = "Location Agreement - Time Square";
      initialDocuments[0].amount = 50000;
    } else if (projectId === "3") {
      initialDocuments.pop();
      initialDocuments[0].status = "draft";
    }

    MOCK_DOCS_STORE[projectId] = initialDocuments;
    setDocuments(initialDocuments);
  }, [projectId])

  useEffect(() => {
    if (documents.length > 0 && projectId) {
      MOCK_DOCS_STORE[projectId] = documents;
    }
  }, [documents, projectId])

  // Document templates
  const documentTemplates: DocumentTemplate[] = [
    {
      id: "location-agreement",
      name: "Location Agreement",
      category: "production",
      type: "Location Agreement",
      description: "Standard location filming agreement with permits",
      fields: ["Location Address", "Filming Dates", "Fee", "Insurance Requirements"],
      icon: MapPin,
      popular: true,
    },
    {
      id: "talent-contract",
      name: "Talent Contract",
      category: "production",
      type: "Talent Agreement",
      description: "Actor/performer contract with SAG compliance",
      fields: ["Performer Name", "Role", "Compensation", "Schedule", "Usage Rights"],
      icon: Users,
      popular: true,
    },
    {
      id: "crew-agreement",
      name: "Crew Agreement",
      category: "production",
      type: "Crew Agreement",
      description: "Standard crew member employment contract",
      fields: ["Crew Member", "Position", "Rate", "Schedule", "Equipment"],
      icon: Users,
      popular: false,
    },
    {
      id: "equipment-rental",
      name: "Equipment Rental",
      category: "production",
      type: "Equipment Rental",
      description: "Camera, lighting, and equipment rental agreement",
      fields: ["Equipment List", "Rental Period", "Rate", "Insurance", "Damage Policy"],
      icon: Camera,
      popular: true,
    },
    {
      id: "insurance-policy",
      name: "Production Insurance",
      category: "production",
      type: "Insurance Policy",
      description: "Comprehensive production insurance coverage",
      fields: ["Coverage Type", "Policy Limits", "Premium", "Deductible"],
      icon: Shield,
      popular: false,
    },
    {
      id: "music-license",
      name: "Music License",
      category: "post-production",
      type: "Music License",
      description: "Music licensing and synchronization rights",
      fields: ["Track Title", "Artist", "Usage Rights", "Territory", "Fee"],
      icon: Music,
      popular: true,
    },
    {
      id: "vfx-agreement",
      name: "VFX Services Agreement",
      category: "post-production",
      type: "Service Agreement",
      description: "Visual effects services and deliverables contract",
      fields: ["VFX Company", "Shot Count", "Deliverables", "Timeline", "Budget"],
      icon: Zap,
      popular: true,
    },
    {
      id: "post-facility",
      name: "Post Facility Agreement",
      category: "post-production",
      type: "Facility Agreement",
      description: "Post-production facility rental and services",
      fields: ["Facility Name", "Services", "Rate", "Schedule", "Equipment"],
      icon: Building,
      popular: false,
    },
  ]

  // AI Insights
  const aiInsights: AIInsight[] = [
    {
      type: "alert",
      title: "Contract Expiration Warning",
      description: "3 contracts expire within 30 days. Schedule renewals to avoid production delays.",
      impact: "high",
      action: "Review expirations",
    },
    {
      type: "optimization",
      title: "Template Standardization",
      description:
        "AI detected 5 similar contracts with different terms. Standardizing could reduce legal review time by 40%.",
      impact: "medium",
      action: "Standardize templates",
    },
    {
      type: "suggestion",
      title: "Bulk Processing Opportunity",
      description: "4 crew agreements pending. Process together for efficiency and consistent terms.",
      impact: "medium",
      action: "Batch process",
    },
    {
      type: "prediction",
      title: "Compliance Risk Assessment",
      description: "Union contract terms may conflict with current schedule. Review required before filming starts.",
      impact: "high",
      action: "Review compliance",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "draft":
        return "bg-blue-500"
      case "expired":
        return "bg-red-500"
      case "rejected":
        return "bg-red-600"
      default:
        return "bg-gray-500"
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

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.category === activeTab &&
      (doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (filterStatus === "all" || doc.status === filterStatus),
  )

  const filteredTemplates = documentTemplates.filter((template) => template.category === activeTab)

  const renderDocumentCard = (doc: LegalDocument, isExpanded: boolean) => (
    <div
      key={doc.id}
      className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer ${isExpanded ? "row-span-2" : ""
        }`}
      onClick={() => setSelectedDocument(doc)}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{doc.title}</h3>
              <p className="text-white/70 text-xs">{doc.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(doc.status)}`}>
              {doc.status.toUpperCase()}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpandedCard(isExpanded ? null : doc.id)
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Due Date:</span>
            <span className="text-white">{doc.dueDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Assigned:</span>
            <span className="text-white">{doc.assignedTo}</span>
          </div>
          {doc.amount && (
            <div className="flex justify-between">
              <span className="text-white/70">Amount:</span>
              <span className="text-white">${doc.amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-white/70">Progress:</span>
            <span className="text-white">{doc.progress}%</span>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/20 space-y-3">
            <div>
              <h4 className="text-white font-medium mb-2 text-sm">Description</h4>
              <p className="text-white/70 text-xs">{doc.description}</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2 text-sm">Parties</h4>
              <div className="space-y-1">
                {doc.parties.map((party, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Users className="h-3 w-3 text-blue-400" />
                    <span className="text-white/80">{party}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2 text-sm">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {doc.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-xs transition-colors">
                Edit
              </button>
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-xs transition-colors">
                Sign
              </button>
            </div>
          </div>
        )}

        {!isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs">{doc.lastModified}</span>
              <div className="flex gap-1">
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <Eye className="h-3 w-3 text-white/70" />
                </button>
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <Edit3 className="h-3 w-3 text-white/70" />
                </button>
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <Download className="h-3 w-3 text-white/70" />
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
          <h1 className="text-3xl font-bold text-white mb-2">Legal Documents</h1>
          <p className="text-white/70">Manage contracts, agreements, licenses, and permits</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuidancePanel(true)}
            className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg transition-colors border border-blue-400/20"
          >
            <BookOpen className="h-4 w-4" />
            Documentation Guide
          </button>
          <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            New Document
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-white/70">Total Docs</span>
          </div>
          <p className="text-white font-medium text-sm">{documents.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Check className="h-4 w-4 text-green-400" />
            <span className="text-xs text-white/70">Signed</span>
          </div>
          <p className="text-white font-medium text-sm">{documents.filter((d) => d.status === "signed").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-white/70">Pending</span>
          </div>
          <p className="text-white font-medium text-sm">{documents.filter((d) => d.status === "pending").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Edit3 className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-white/70">Drafts</span>
          </div>
          <p className="text-white font-medium text-sm">{documents.filter((d) => d.status === "draft").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs text-white/70">Expiring</span>
          </div>
          <p className="text-white font-medium text-sm">2</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white/70">Compliance</span>
          </div>
          <p className="text-white font-medium text-sm">98%</p>
        </div>
      </div>

      {/* AI Insights */}
      {showAIInsights && (
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">AI Legal Intelligence</h2>
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
                  {insight.type === "optimization" && <Lightbulb className="h-4 w-4 text-blue-400" />}
                  {insight.type === "alert" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                  {insight.type === "suggestion" && <TrendingUp className="h-4 w-4 text-green-400" />}
                  {insight.type === "prediction" && <Brain className="h-4 w-4 text-purple-400" />}
                  <h3 className="text-white font-medium text-sm">{insight.title}</h3>
                </div>
                <p className="text-white/70 text-xs mb-2">{insight.description}</p>
                {insight.action && (
                  <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs transition-colors">
                    {insight.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20 w-fit">
        <button
          onClick={() => setActiveTab("production")}
          className={`px-6 py-3 rounded-md transition-all duration-200 ${activeTab === "production" ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
        >
          Production
        </button>
        <button
          onClick={() => setActiveTab("post-production")}
          className={`px-6 py-3 rounded-md transition-all duration-200 ${activeTab === "post-production"
            ? "bg-white/20 text-white"
            : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
        >
          Post-Production
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/70" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
              <option value="expired">Expired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("templates")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "templates" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <Star className="h-4 w-4" />
            </button>
          </div>

          {viewMode === "grid" && (
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
      {viewMode === "grid" && (
        <div
          className={`grid gap-4 ${gridSize === 2 ? "grid-cols-2" : gridSize === 3 ? "grid-cols-3" : gridSize === 4 ? "grid-cols-4" : "grid-cols-5"}`}
        >
          {filteredDocuments.map((doc) => renderDocumentCard(doc, expandedCard === doc.id))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedDocument(doc)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{doc.title}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(doc.status)}`}
                    >
                      {doc.status.toUpperCase()}
                    </span>
                    <span className={`text-sm ${getPriorityColor(doc.priority)}`}>
                      {doc.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <p className="text-white/70 text-sm mb-2">{doc.description}</p>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span>Type: {doc.type}</span>
                    <span>Due: {doc.dueDate}</span>
                    <span>Assigned: {doc.assignedTo}</span>
                    {doc.amount && <span>Amount: ${doc.amount.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Eye className="h-4 w-4 text-white/70" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Edit3 className="h-4 w-4 text-white/70" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Download className="h-4 w-4 text-white/70" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-wrap gap-2">
                  {doc.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/70">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Clock className="h-4 w-4" />
                  <span>{doc.lastModified}</span>
                </div>
              </div>

              {doc.progress < 100 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-white/70 mb-1">
                    <span>Progress</span>
                    <span>{doc.progress}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${doc.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 cursor-pointer relative"
              onClick={() => {
                setSelectedTemplate(template)
                setShowTemplateModal(true)
              }}
            >
              {template.popular && (
                <div className="absolute top-3 right-3">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <template.icon className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                  <p className="text-white/70 text-sm">{template.type}</p>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-4">{template.description}</p>
              <div className="space-y-2">
                <h4 className="text-white font-medium text-sm">Key Fields:</h4>
                <div className="flex flex-wrap gap-1">
                  {template.fields.slice(0, 3).map((field, i) => (
                    <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">
                      {field}
                    </span>
                  ))}
                  {template.fields.length > 3 && (
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">
                      +{template.fields.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
