"use client"

import { useState, useEffect, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type BudgetLineItemWithProject } from "../../../lib/db"
import {
  DollarSign,
  Plus,
  Download,
  Upload,
  Calculator,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Edit,
  Save,
  X,
  FileText,
  BarChart3,
  Users,
  Camera,
  MapPin,
  Palette,
  Settings,
  Sparkles,
  Target,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react"

import { BUDGET_PRESETS } from "./budget-presets"

interface BudgetLineItem {
  id: string
  lineNumber: number
  category: string
  subcategory: string
  description: string
  crew?: number
  days?: number
  rate?: number
  overtime?: number
  estimatedTotal: number
  actualTotal: number
  notes: string
  aiGenerated: boolean
  lastUpdated: string
  source?: string // Which module provided data
  isMock?: boolean
}

interface BudgetCategory {
  id: string
  name: string
  code: string
  estimatedTotal: number
  actualTotal: number
  variance: number
  variancePercent: number
  items: BudgetLineItem[]
  color: string
  icon: any
}

interface AIBudgetSuggestion {
  type: "estimate" | "optimization" | "alert" | "comparison"
  title: string
  description: string
  impact: "high" | "medium" | "low"
  estimatedSavings?: number
  confidence: number
  action?: string
  lineItems?: string[]
}

// MOCK_STORE removed in favor of Dexie DB

export default function BudgetModule({ searchQuery = "", projectId = "1" }: { searchQuery?: string; projectId?: string }) {
  const dbItems = useLiveQuery(
    () => db.budgetItems.where("projectId").equals(projectId).toArray(),
    [projectId]
  ) || []

  // Placeholder for budgetData - will be replaced by derived state
  // CONSTANTS needed for derivation are defined below, we will move them up in next step or use them here if hoisting works (it doesn't for const)
  // so we will temporarily keep budgetData as empty to avoid break, and fix in next step.
  // actually, let's just comment it out and define it properly after constants move.
  // BUT existing code uses budgetData immediately. 
  // Let's rely on the fact that I will move constants in the SAME turn or next tool call.
  // Actually, I can use a 'var' or just 'const' if I move the constants up NOW.

  // Let's try to define the constants HERE in this replacement, effectively moving them? 
  // No, that duplicates code if I don't delete the old one.

  // Strategy: Just add the hook for now, leave budgetData as [] to be fixed in next step.
  // const budgetData: BudgetCategory[] = [] 
  // No, that breaks the app logic.

  // Let's replace the whole top block including constants if possible. 
  // But constants are at line 134.

  // Let's just Add the hooks.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AIBudgetSuggestion[]>([])
  const [viewMode, setViewMode] = useState<"detailed" | "summary" | "comparison">("detailed")
  const [filterCategory, setFilterCategory] = useState("all")
  const [showVarianceOnly, setShowVarianceOnly] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showZeroRows, setShowZeroRows] = useState<Set<string>>(new Set())
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGeneratingEstimates, setIsGeneratingEstimates] = useState(false)
  const [isAiSuggestionsCollapsed, setIsAiSuggestionsCollapsed] = useState(true)

  const [showMockData, setShowMockData] = useState(true)

  // Recalculate category totals based on line items
  const recalculateCategory = (category: BudgetCategory): BudgetCategory => {
    const estimatedTotal = category.items.reduce((sum, item) => sum + item.estimatedTotal, 0)
    const actualTotal = category.items.reduce((sum, item) => sum + item.actualTotal, 0)
    const variance = actualTotal - estimatedTotal
    const variancePercent = estimatedTotal > 0 ? (variance / estimatedTotal) * 100 : 0

    return {
      ...category,
      estimatedTotal,
      actualTotal,
      variance,
      variancePercent,
    }
  }

  // Effect to handle global mock data setting
  useEffect(() => {
    const loadSettings = () => {
      const stored = localStorage.getItem("studio_flow_show_mock_data")
      if (stored !== null) {
        setShowMockData(JSON.parse(stored))
      }
    }

    loadSettings()

    const handleSettingsChange = () => {
      loadSettings()
    }

    window.addEventListener("studio_flow_settings_change", handleSettingsChange)
    return () => window.removeEventListener("studio_flow_settings_change", handleSettingsChange)
  }, [])

  const initialBudgetDataConstants: BudgetCategory[] = [
    {
      id: "A",
      name: "Pre-Production & Wrap",
      code: "A",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-blue-500",
      icon: FileText,
      items: [],
    },
    {
      id: "B",
      name: "Shoot / Production Crew",
      code: "B",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-green-500",
      icon: Camera,
      items: [],
    },
    {
      id: "C",
      name: "Casting",
      code: "C",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-purple-500",
      icon: Users,
      items: [],
    },
    {
      id: "D",
      name: "Location & Travel",
      code: "D",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-yellow-500",
      icon: MapPin,
      items: [],
    },
    {
      id: "E",
      name: "Props, Wardrobe, Animals",
      code: "E",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-red-500",
      icon: Palette,
      items: [],
    },
    {
      id: "F",
      name: "Studio & Set Construction",
      code: "F",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-orange-500",
      icon: Settings,
      items: [],
    },
    {
      id: "G",
      name: "Special Effects",
      code: "G",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-red-600",
      icon: Sparkles,
      items: [],
    },
    {
      id: "H",
      name: "Art Department",
      code: "H",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-pink-500",
      icon: Palette,
      items: [],
    },
    {
      id: "I",
      name: "Equipment Rental",
      code: "I",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-indigo-500",
      icon: Camera,
      items: [],
    },
    {
      id: "J",
      name: "Film Stock & Lab",
      code: "J",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-cyan-500",
      icon: FileText,
      items: [],
    },
    {
      id: "K",
      name: "Miscellaneous & Editorial",
      code: "K",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-gray-500",
      icon: Settings,
      items: [],
    },
    {
      id: "L",
      name: "Director / Creative Fees",
      code: "L",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-emerald-500",
      icon: Users,
      items: [],
    },
    {
      id: "M",
      name: "Insurance",
      code: "M",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-blue-600",
      icon: FileText,
      items: [],
    },
    {
      id: "N",
      name: "Talent",
      code: "N",
      estimatedTotal: 0,
      actualTotal: 0,
      variance: 0,
      variancePercent: 0,
      color: "bg-rose-500",
      icon: Users,
      items: [],
    },
  ]

  // Initialize/Seed budget data from DB
  useEffect(() => {
    const seedData = async () => {
      if (!projectId) return

      // Check if data exists for this project
      const count = await db.budgetItems.where("projectId").equals(projectId).count()

      if (count > 0) {
        // Data exists
        if (expandedCategories.size === 0) {
          setExpandedCategories(new Set(["A", "B"]))
        }
        return
      }

      // Check if project is mock before seeding
      const project = await db.projects.get(projectId)
      if (!project?.isMock) {
        // Do not auto-populate non-mock projects
        return
      }

      // Helper to generate realistic data based on project type
      // Project 1: Standard, Project 2: Indie (lower), Project 3: Micro (lowest)
      const multiplier = projectId === "1" ? 1 : projectId === "2" ? 0.7 : 0.3
      const newItems: BudgetLineItemWithProject[] = []

      // Create items
      initialBudgetDataConstants.forEach(category => {
        const presets = BUDGET_PRESETS[category.id] || []

        if (presets.length > 0) {
          presets.forEach((preset, index) => {
            // Determine if this item should have data
            // Randomly populate ~40% of items to make it look realistic but not overwhelming
            // Always populate the first 2 items of each section to ensure coverage so users see *something*
            const shouldPopulate = index < 2 || Math.random() > 0.6

            if (!shouldPopulate) {
              newItems.push({
                id: `line_${category.id}_${index}_${projectId}`,
                lineNumber: index + 1,
                category: category.id,
                subcategory: preset.subcategory,
                description: preset.description,
                rate: preset.suggestedRate,
                estimatedTotal: 0,
                actualTotal: 0,
                notes: "",
                aiGenerated: false,
                lastUpdated: new Date().toISOString(),
                isMock: true,
                projectId: projectId
              })
              return
            }

            // Generate values
            const baseRate = preset.suggestedRate || Math.floor(Math.random() * 500) + 100
            const rate = Math.round(baseRate * multiplier)
            const days = Math.floor(Math.random() * 10) + 1
            const crew = Math.floor(Math.random() * 3) + 1
            const estimated = Math.round(rate * days * crew)

            // Random actuals
            const varianceFactor = 0.8 + Math.random() * 0.4
            const actual = Math.random() > 0.3 ? Math.round(estimated * varianceFactor) : 0

            newItems.push({
              id: `line_${category.id}_${index}_${projectId}`,
              lineNumber: index + 1,
              category: category.id,
              subcategory: preset.subcategory,
              description: preset.description,
              rate: rate,
              days: days,
              crew: crew,
              estimatedTotal: estimated,
              actualTotal: actual,
              notes: "",
              aiGenerated: false,
              lastUpdated: new Date().toISOString(),
              isMock: true,
              projectId: projectId
            })
          })
        }
      })

      if (newItems.length > 0) {
        // Use bulkPut instead of bulkAdd to verify idempotency and handle potential race conditions (e.g. React.StrictMode double mount)
        await db.budgetItems.bulkPut(newItems)
        setExpandedCategories(new Set(["A", "B"]))
      }
    }

    seedData()
  }, [projectId])

  // Derive consolidated BudgetData from DB items
  const budgetData = useMemo(() => {
    return initialBudgetDataConstants.map(catConst => {
      const items = dbItems.filter(i => i.category === catConst.id).sort((a, b) => a.lineNumber - b.lineNumber)

      // Calculate totals
      const estimatedTotal = items.reduce((sum, item) => sum + item.estimatedTotal, 0)
      const actualTotal = items.reduce((sum, item) => sum + item.actualTotal, 0)
      const variance = actualTotal - estimatedTotal
      const variancePercent = estimatedTotal > 0 ? (variance / estimatedTotal) * 100 : 0

      return {
        ...catConst,
        items,
        estimatedTotal,
        actualTotal,
        variance,
        variancePercent
      }
    })
  }, [dbItems])

  // Trigger AI suggestions once data is loaded
  useEffect(() => {
    if (budgetData.length > 0 && aiSuggestions.length === 0) {
      generateAISuggestions(budgetData)
    }
  }, [budgetData.length])

  // Add this useEffect after the existing useEffect for initializing budget data
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const clickedRow = target.closest("tr")
      const clickedRowId = clickedRow?.getAttribute("data-row-id")

      // If we are editing, and we clicked something that is NOT the current row, exit edit mode
      // This allows clicking inputs/tools within the row without closing it
      if (editingItem && clickedRowId !== editingItem) {
        setEditingItem(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [editingItem])

  // Generate AI suggestions based on budget data and other modules
  const generateAISuggestions = (data: BudgetCategory[]) => {
    const suggestions: AIBudgetSuggestion[] = [
      {
        type: "optimization",
        title: "Equipment Rental Optimization",
        description: "Based on gear management data, consolidating camera rentals could save 15% on equipment costs.",
        impact: "high",
        estimatedSavings: 7200,
        confidence: 85,
        action: "Review gear consolidation",
        lineItems: ["line_193"],
      },
      {
        type: "estimate",
        title: "Crew Rate Analysis",
        description: "Current crew rates are 12% below industry standard. Consider adjusting for competitive hiring.",
        impact: "medium",
        confidence: 78,
        action: "Review crew rates",
        lineItems: ["line_1", "line_51"],
      },
      {
        type: "alert",
        title: "Location Budget Risk",
        description:
          "Location expenses represent 13% of total budget. Weather delays could impact costs significantly.",
        impact: "high",
        confidence: 92,
        action: "Add contingency",
        lineItems: ["line_114", "line_115"],
      },
      {
        type: "comparison",
        title: "Talent Cost Benchmark",
        description: "Talent costs are within 5% of similar productions. Cast management data suggests good value.",
        impact: "low",
        confidence: 88,
        lineItems: ["line_234", "line_235"],
      },
    ]

    setAiSuggestions(suggestions)
  }



  // Update line item
  const updateLineItem = async (categoryId: string, itemId: string, updates: Partial<BudgetLineItem>) => {
    const itemToUpdate = dbItems.find(i => i.id === itemId);
    if (!itemToUpdate) return;

    const finalUpdates: any = { ...updates, lastUpdated: new Date().toISOString() };

    if (updates.rate !== undefined || updates.days !== undefined || updates.crew !== undefined) {
      if (updates.estimatedTotal === undefined) {
        const crew = updates.crew ?? itemToUpdate.crew ?? 1
        const days = updates.days ?? itemToUpdate.days ?? 1
        const rate = updates.rate ?? itemToUpdate.rate ?? 0
        finalUpdates.estimatedTotal = crew * days * rate
      }
    }

    await db.budgetItems.update(itemId, finalUpdates);
  }

  // Add new line item
  const addLineItem = async (categoryId: string) => {
    const categoryItems = dbItems.filter(i => i.category === categoryId)
    const maxLine = Math.max(0, ...categoryItems.map(i => i.lineNumber))

    const newItem: BudgetLineItemWithProject = {
      id: `line_${Date.now()}`,
      lineNumber: maxLine + 1,
      category: categoryId,
      subcategory: "misc",
      description: "New Line Item",
      estimatedTotal: 0,
      actualTotal: 0,
      notes: "",
      aiGenerated: false,
      lastUpdated: new Date().toISOString(),
      projectId: projectId || "1"
    }

    await db.budgetItems.add(newItem)

    // Ensure we can see the new item
    const newShowZero = new Set(showZeroRows)
    newShowZero.add(categoryId)
    setShowZeroRows(newShowZero)
  }

  const [originalItem, setOriginalItem] = useState<BudgetLineItem | null>(null)

  // Start editing a line item
  const startEditing = (item: BudgetLineItem) => {
    setOriginalItem(item)
    setEditingItem(item.id)
  }

  // Cancel editing - revert changes
  const cancelEditing = async () => {
    if (originalItem && editingItem) {
      await db.budgetItems.put({
        ...originalItem,
        projectId: projectId || "1"
      } as BudgetLineItemWithProject)
    }
    setEditingItem(null)
    setOriginalItem(null)
  }

  // Save editing - keep changes
  const saveEditing = () => {
    setEditingItem(null)
    setOriginalItem(null)
  }

  // Delete line item
  const deleteLineItem = async (categoryId: string, itemId: string) => {
    await db.budgetItems.delete(itemId)

    // Ensure we can see the new item
    const newShowZero = new Set(showZeroRows)
    newShowZero.add(categoryId)
    setShowZeroRows(newShowZero)
  }

  // Generate AI estimates
  const generateAIEstimates = async (prompt: string) => {
    setIsGeneratingEstimates(true)

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock AI response - in real implementation, this would call an AI service
    const aiEstimates = [
      {
        categoryId: "equipment-rental",
        itemId: "line_193",
        estimatedTotal: 42000,
        notes: "AI suggests 12% reduction based on current market rates and bulk rental discounts",
        confidence: 87,
      },
      {
        categoryId: "location-expenses",
        itemId: "line_114",
        estimatedTotal: 22000,
        notes: "AI analysis of similar locations suggests 12% savings possible",
        confidence: 82,
      },
    ]

    // Apply AI estimates
    for (const est of aiEstimates) {
      // Fix category mapping from AI mock strings to our IDs
      const catId = est.categoryId === "equipment-rental" ? "I" : est.categoryId === "location-expenses" ? "D" : "A";

      let targetId = est.itemId;
      // Check if item exists (simple check, or just try to find fallback)
      const exists = await db.budgetItems.get(targetId);

      if (!exists) {
        // Find any item in category
        const item = await db.budgetItems.where({ projectId: projectId || "1", category: catId }).first();
        if (item) targetId = item.id;
      }

      if (targetId) {
        await updateLineItem(catId, targetId, {
          estimatedTotal: est.estimatedTotal,
          notes: `${est.notes} (AI Generated)`,
          aiGenerated: true,
        });
      }
    }

    setIsGeneratingEstimates(false)
    setAiPrompt("")
  }

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleZeroRows = (categoryId: string) => {
    const newShowZero = new Set(showZeroRows)
    if (newShowZero.has(categoryId)) {
      newShowZero.delete(categoryId)
    } else {
      newShowZero.add(categoryId)
    }
    setShowZeroRows(newShowZero)
  }

  const getEffectiveBudgetData = () => {
    if (showMockData) return budgetData

    return budgetData.map(cat => {
      const items = cat.items.filter(i => !i.isMock)
      return recalculateCategory({
        ...cat,
        items
      })
    })
  }

  const effectiveBudgetData = getEffectiveBudgetData()

  // Calculate totals
  const calculateTotals = () => {
    const totalEstimated = effectiveBudgetData.reduce((sum, category) => sum + category.estimatedTotal, 0)
    const totalActual = effectiveBudgetData.reduce((sum, category) => sum + category.actualTotal, 0)
    const totalVariance = totalActual - totalEstimated
    const variancePercent = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0

    return { totalEstimated, totalActual, totalVariance, variancePercent }
  }

  // Filter budget items
  const getFilteredCategories = () => {
    let filtered = effectiveBudgetData

    if (filterCategory !== "all") {
      filtered = filtered.filter((category) => category.id === filterCategory)
    }

    if (showVarianceOnly) {
      filtered = filtered.filter((category) => Math.abs(category.variance) > 0)
    }

    if (searchQuery) {
      filtered = filtered.map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.subcategory.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
    }

    return filtered
  }

  const totals = calculateTotals()
  const filteredCategories = getFilteredCategories()

  // Render line item row
  const renderLineItem = (item: BudgetLineItem, categoryId: string) => {
    const isEditing = editingItem === item.id
    const variance = item.actualTotal - item.estimatedTotal
    const variancePercent = item.estimatedTotal > 0 ? (variance / item.estimatedTotal) * 100 : 0

    return (
      <tr
        key={item.id}
        data-row-id={item.id}
        className={`border-b border-white/10 hover:bg-white/5 cursor-pointer ${item.aiGenerated ? "bg-purple-500/10" : ""}`}
        onClick={() => startEditing(item)}
      >
        <td className="px-4 py-3 text-white/70 text-sm">{item.lineNumber}</td>
        <td className="px-4 py-3">
          {isEditing ? (
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateLineItem(categoryId, item.id, { description: e.target.value })}
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-full"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">{item.description}</span>
              {item.aiGenerated && (
                <span title="AI Generated">
                  <Brain className="h-4 w-4 text-purple-400" />
                </span>
              )}
              {item.source && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  {item.source.replace("-", " ")}
                </span>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {isEditing ? (
            <input
              type="number"
              value={item.crew || ""}
              onChange={(e) =>
                updateLineItem(categoryId, item.id, { crew: Number.parseInt(e.target.value) || undefined })
              }
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-16"
            />
          ) : (
            <span className="text-white/70 text-sm">{item.crew || "-"}</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {isEditing ? (
            <input
              type="number"
              value={item.days || ""}
              onChange={(e) =>
                updateLineItem(categoryId, item.id, { days: Number.parseInt(e.target.value) || undefined })
              }
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-16"
            />
          ) : (
            <span className="text-white/70 text-sm">{item.days || "-"}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {isEditing ? (
            <input
              type="number"
              value={item.rate || ""}
              onChange={(e) =>
                updateLineItem(categoryId, item.id, { rate: Number.parseInt(e.target.value) || undefined })
              }
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-20"
            />
          ) : (
            <span className="text-white/70 text-sm">{item.rate ? `$${item.rate.toLocaleString()}` : "-"}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {isEditing ? (
            <input
              type="number"
              value={item.estimatedTotal}
              onChange={(e) =>
                updateLineItem(categoryId, item.id, { estimatedTotal: Number.parseInt(e.target.value) || 0 })
              }
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-24"
            />
          ) : (
            <span className="text-white font-medium">${item.estimatedTotal.toLocaleString()}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {isEditing ? (
            <input
              type="number"
              value={item.actualTotal}
              onChange={(e) =>
                updateLineItem(categoryId, item.id, { actualTotal: Number.parseInt(e.target.value) || 0 })
              }
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-24"
            />
          ) : (
            <span className="text-white font-medium">${item.actualTotal.toLocaleString()}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <span
              className={`font-medium ${variance > 0 ? "text-red-400" : variance < 0 ? "text-green-400" : "text-white/70"}`}
            >
              {variance !== 0 ? `$${Math.abs(variance).toLocaleString()}` : "-"}
            </span>
            {variance !== 0 && <span className="text-xs text-white/50">({variancePercent.toFixed(1)}%)</span>}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    saveEditing()
                  }}
                  className="p-1 rounded hover:bg-green-500/20 transition-colors"
                >
                  <Save className="h-4 w-4 text-green-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    cancelEditing()
                  }}
                  className="p-1 rounded hover:bg-red-500/20 transition-colors"
                >
                  <X className="h-4 w-4 text-red-400" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startEditing(item)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Edit className="h-4 w-4 text-white/70" />
                </button>
                <button
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Copy className="h-4 w-4 text-white/70" />
                </button>
                <button
                  className="p-1 rounded hover:bg-red-500/20 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteLineItem(categoryId, item.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    )
  }

  // Render Summary View (Top Sheet)
  const renderSummary = () => {
    const totalEst = budgetData.reduce((sum, cat) => sum + cat.estimatedTotal, 0)
    const totalAct = budgetData.reduce((sum, cat) => sum + cat.actualTotal, 0)
    const totalVar = totalAct - totalEst
    const totalVarPercent = totalEst > 0 ? (totalVar / totalEst) * 100 : 0

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Summary of Estimated Production Costs</h2>
            <div className="text-right">
              <p className="text-sm text-white/60">Grand Total Estimated</p>
              <p className="text-2xl font-bold text-white">${totalEst.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-white/70 text-sm font-medium">Account</th>
                <th className="px-6 py-4 text-left text-white/70 text-sm font-medium">Category Description</th>
                <th className="px-6 py-4 text-right text-white/70 text-sm font-medium">Estimated</th>
                <th className="px-6 py-4 text-right text-white/70 text-sm font-medium">Actual</th>
                <th className="px-6 py-4 text-right text-white/70 text-sm font-medium">Variance</th>
                <th className="px-6 py-4 text-right text-white/70 text-sm font-medium">Var %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {budgetData.map((category) => (
                <tr key={category.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{category.code}</td>
                  <td className="px-6 py-4 text-white font-medium">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center opacity-80`}>
                        <category.icon className="h-4 w-4 text-white" />
                      </div>
                      {category.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-white font-mono">${category.estimatedTotal.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-white font-mono">${category.actualTotal.toLocaleString()}</td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${category.variance >= 0 ? "text-red-400" : "text-green-400"}`}>
                    {category.variance >= 0 ? "+" : ""}${category.variance.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono text-sm ${category.variancePercent > 0 ? "text-red-400" : "text-green-400"}`}>
                    {category.variancePercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {/* Grand Total Row */}
              <tr className="bg-white/10 font-bold">
                <td className="px-6 py-4 text-white"></td>
                <td className="px-6 py-4 text-white uppercase tracking-wider">Total Production Costs</td>
                <td className="px-6 py-4 text-right text-white font-mono text-lg">${totalEst.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-white font-mono text-lg">${totalAct.toLocaleString()}</td>
                <td className={`px-6 py-4 text-right font-mono text-lg ${totalVar >= 0 ? "text-red-400" : "text-green-400"}`}>
                  {totalVar >= 0 ? "+" : ""}${totalVar.toLocaleString()}
                </td>
                <td className={`px-6 py-4 text-right font-mono text-lg ${totalVarPercent > 0 ? "text-red-400" : "text-green-400"}`}>
                  {totalVarPercent.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Production Budget</h1>
          <p className="text-white/70">Comprehensive budget tracking with AI-powered estimates and analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIAssistant(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            <Brain className="h-4 w-4" />
            AI Budget Assistant(mock)
          </button>
          <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Download className="h-4 w-4" />
            Export(mock)
          </button>
          <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Upload className="h-4 w-4" />
            Import(mock)
          </button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-5 w-5 text-blue-400" />
            <span className="text-white/70 text-sm">Total Estimated</span>
          </div>
          <p className="text-white font-bold text-2xl">${totals.totalEstimated.toLocaleString()}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            <span className="text-white/70 text-sm">Total Actual</span>
          </div>
          <p className="text-white font-bold text-2xl">${totals.totalActual.toLocaleString()}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            {totals.totalVariance >= 0 ? (
              <TrendingUp className="h-5 w-5 text-red-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-green-400" />
            )}
            <span className="text-white/70 text-sm">Variance</span>
          </div>
          <p className={`font-bold text-2xl ${totals.totalVariance >= 0 ? "text-red-400" : "text-green-400"}`}>
            {totals.totalVariance >= 0 ? "+" : ""}${totals.totalVariance.toLocaleString()}
          </p>
          <p className="text-white/60 text-sm">{totals.variancePercent.toFixed(1)}%</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-purple-400" />
            <span className="text-white/70 text-sm">Budget Health(mock)</span>
          </div>
          <p
            className={`font-bold text-2xl ${Math.abs(totals.variancePercent) < 5 ? "text-green-400" : Math.abs(totals.variancePercent) < 15 ? "text-yellow-400" : "text-red-400"}`}
          >
            {Math.abs(totals.variancePercent) < 5
              ? "Excellent"
              : Math.abs(totals.variancePercent) < 15
                ? "Good"
                : "At Risk"}
          </p>
        </div>
      </div>

      {/* AI Suggestions */}
      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsAiSuggestionsCollapsed(!isAiSuggestionsCollapsed)}
          >
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">AI Budget Intelligence (mock)</h2>
            </div>
            {isAiSuggestionsCollapsed ? (
              <ChevronDown className="h-5 w-5 text-white/70" />
            ) : (
              <ChevronUp className="h-5 w-5 text-white/70" />
            )}
          </div>

          {!isAiSuggestionsCollapsed && (
            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiSuggestions.slice(0, 4).map((suggestion, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    {suggestion.type === "optimization" && <Sparkles className="h-4 w-4 text-blue-400" />}
                    {suggestion.type === "alert" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                    {suggestion.type === "estimate" && <Calculator className="h-4 w-4 text-green-400" />}
                    {suggestion.type === "comparison" && <BarChart3 className="h-4 w-4 text-purple-400" />}
                    <h3 className="text-white font-medium text-sm">{suggestion.title}</h3>
                    <span className="text-xs text-white/50">({suggestion.confidence}% confidence)</span>
                  </div>
                  <p className="text-white/70 text-xs mb-2">{suggestion.description}</p>
                  <div className="flex items-center justify-between">
                    {suggestion.estimatedSavings && (
                      <span className="text-green-400 text-xs font-medium">
                        Save: ${suggestion.estimatedSavings.toLocaleString()}
                      </span>
                    )}
                    {suggestion.action && (
                      <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs transition-colors">
                        {suggestion.action}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
              {budgetData.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-white/70 text-sm">
            <input
              type="checkbox"
              checked={showVarianceOnly}
              onChange={(e) => setShowVarianceOnly(e.target.checked)}
              className="rounded"
            />
            Show variance only
          </label>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20">
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "detailed" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Detailed
            </button>
            <button
              onClick={() => setViewMode("summary")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "summary" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode("comparison")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "comparison" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Comparison
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === "summary" ? (
        renderSummary()
      ) : (
        /* Detailed Budget Categories */
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.id)
            const variancePercent = category.estimatedTotal > 0 ? (category.variance / category.estimatedTotal) * 100 : 0

            return (
              <div
                key={category.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden"
              >
                {/* Category Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center`}>
                      <category.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        {category.code}. {category.name}
                      </h3>
                      <p className="text-white/60 text-sm">{category.items.length} line items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-white font-medium">${category.estimatedTotal.toLocaleString()}</p>
                      <p className="text-white/60 text-sm">Estimated</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">${category.actualTotal.toLocaleString()}</p>
                      <p className="text-white/60 text-sm">Actual</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${category.variance >= 0 ? "text-red-400" : "text-green-400"}`}>
                        {category.variance >= 0 ? "+" : ""}${category.variance.toLocaleString()}
                      </p>
                      <p className="text-white/60 text-sm">({variancePercent.toFixed(1)}%)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          addLineItem(category.id)
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-white/70" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleZeroRows(category.id)
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title={showZeroRows.has(category.id) ? "Hide empty rows" : "Show empty rows"}
                      >
                        {showZeroRows.has(category.id) ? (
                          <Eye className="h-4 w-4 text-white/70" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-white/70" />
                        )}
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-white/70" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-white/70" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Items */}
                {isExpanded && (
                  <div className="border-t border-white/10">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">#</th>
                            <th className="px-4 py-3 text-left text-white/70 text-sm font-medium">Description</th>
                            <th className="px-4 py-3 text-center text-white/70 text-sm font-medium">Crew</th>
                            <th className="px-4 py-3 text-center text-white/70 text-sm font-medium">Days</th>
                            <th className="px-4 py-3 text-right text-white/70 text-sm font-medium">Rate</th>
                            <th className="px-4 py-3 text-right text-white/70 text-sm font-medium">Estimated</th>
                            <th className="px-4 py-3 text-right text-white/70 text-sm font-medium">Actual</th>
                            <th className="px-4 py-3 text-right text-white/70 text-sm font-medium">Variance</th>
                            <th className="px-4 py-3 text-center text-white/70 text-sm font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.items
                            .filter((item) => {
                              if (showZeroRows.has(category.id)) return true
                              // Always show if editing this item
                              if (editingItem === item.id) return true
                              // Show if it has values or is new
                              return (
                                item.estimatedTotal > 0 ||
                                item.actualTotal > 0 ||
                                item.description === "New Line Item"
                              )
                            })
                            .map((item) => renderLineItem(item, category.id))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* ... modal content ... */}
            <div className="p-6">
              {/* Simplified modal content placeholder to keep file size manageable if needed, 
                     but ideally we keep the original content. 
                     Since I am replacing, I must include the original content or I will delete it.
                     I will include the original content below. */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-purple-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">AI Budget Assistant (mock)</h2>
                    <p className="text-white/70">Get intelligent budget estimates and optimization suggestions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIAssistant(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white/70 text-sm">What would you like help with?</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/50 resize-none mt-2"
                    rows={3}
                    placeholder="e.g., 'Estimate crew costs for 25-day shoot' or 'Optimize equipment rental budget'"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">Generate Estimates</span>
                    </div>
                    <p className="text-white/60 text-xs">Create budget estimates based on project data</p>
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-white font-medium text-sm">Optimize Costs</span>
                    </div>
                    <p className="text-white/60 text-xs">Find cost-saving opportunities and efficiencies</p>
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      <span className="text-white font-medium text-sm">Compare Budgets</span>
                    </div>
                    <p className="text-white/60 text-xs">Compare with industry standards and similar projects</p>
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-white font-medium text-sm">Risk Analysis</span>
                    </div>
                    <p className="text-white/60 text-xs">Identify potential budget risks and contingencies</p>
                  </button>
                </div>

                <button
                  onClick={() => generateAIEstimates(aiPrompt)}
                  disabled={!aiPrompt.trim() || isGeneratingEstimates}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all duration-300 font-medium"
                >
                  {isGeneratingEstimates ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating AI Estimates...
                    </div>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 inline mr-2" />
                      Generate AI Recommendations
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
