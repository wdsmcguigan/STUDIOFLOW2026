"use client"

import { useState, useEffect, createContext, useContext } from "react"
import {
  ArrowRight,
  FolderSyncIcon as Sync,
  RefreshCw,
  Zap,
  Link,
  X,
  FileText,
  Video,
  Music,
  Calendar,
  Users,
  MapPin,
  Palette,
  Target,
  Brain,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"

interface ModuleData {
  id: string
  name: string
  type: string
  data: any
  metadata: Record<string, any>
  lastUpdated: string
  version: string
}

interface CrossModuleAction {
  id: string
  type: "sync" | "reference" | "import" | "export" | "generate"
  sourceModule: string
  targetModule: string
  description: string
  status: "pending" | "processing" | "completed" | "failed"
  progress?: number
  result?: any
  error?: string
  createdAt: string
}

interface InteropRule {
  id: string
  sourceModule: string
  targetModule: string
  trigger: "manual" | "auto" | "scheduled"
  condition?: string
  action: string
  enabled: boolean
  lastTriggered?: string
}

interface CrossModuleInteropProps {
  currentModule: string
  onDataSync?: (data: any) => void
  onActionComplete?: (action: CrossModuleAction) => void
  className?: string
}

const MODULE_CONFIGS = {
  script: {
    name: "Script",
    icon: FileText,
    color: "text-green-400",
    exports: ["scenes", "characters", "dialogue", "action_lines"],
    imports: ["storyboard_references", "location_notes", "cast_notes"],
    autoSync: ["storyboard", "schedule", "cast"],
  },
  storyboard: {
    name: "Storyboard",
    icon: Palette,
    color: "text-blue-400",
    exports: ["panels", "shots", "camera_moves", "timing"],
    imports: ["script_scenes", "location_photos", "cast_photos"],
    autoSync: ["script", "schedule", "vfx"],
  },
  schedule: {
    name: "Schedule",
    icon: Calendar,
    color: "text-orange-400",
    exports: ["shoot_days", "call_times", "locations", "crew_assignments"],
    imports: ["script_scenes", "cast_availability", "location_bookings"],
    autoSync: ["script", "cast", "locations"],
  },
  cast: {
    name: "Cast",
    icon: Users,
    color: "text-purple-400",
    exports: ["actor_profiles", "availability", "contracts", "photos"],
    imports: ["script_characters", "schedule_calls", "wardrobe_notes"],
    autoSync: ["script", "schedule"],
  },
  locations: {
    name: "Locations",
    icon: MapPin,
    color: "text-teal-400",
    exports: ["location_details", "photos", "permits", "contacts"],
    imports: ["script_scenes", "schedule_bookings"],
    autoSync: ["script", "schedule"],
  },
  vfx: {
    name: "VFX",
    icon: Zap,
    color: "text-yellow-400",
    exports: ["vfx_shots", "assets", "renders", "notes"],
    imports: ["storyboard_panels", "dailies_footage", "script_notes"],
    autoSync: ["storyboard", "dailies-review"],
  },
  audio: {
    name: "Audio",
    icon: Music,
    color: "text-pink-400",
    exports: ["tracks", "cues", "stems", "notes"],
    imports: ["script_dialogue", "storyboard_timing", "edit_cuts"],
    autoSync: ["script", "post-timeline"],
  },
  "dailies-review": {
    name: "Dailies",
    icon: Video,
    color: "text-red-400",
    exports: ["footage", "takes", "notes", "selects"],
    imports: ["storyboard_references", "script_scenes"],
    autoSync: ["storyboard", "vfx", "post-timeline"],
  },
  "post-timeline": {
    name: "Post Timeline",
    icon: Video,
    color: "text-indigo-400",
    exports: ["cuts", "sequences", "timing", "notes"],
    imports: ["dailies_selects", "audio_tracks", "vfx_shots"],
    autoSync: ["dailies-review", "audio", "vfx"],
  },
}

const InteropContext = createContext<{
  syncData: (sourceModule: string, targetModule: string, data: any) => Promise<void>
  getModuleData: (moduleId: string) => ModuleData | null
  createAction: (action: Omit<CrossModuleAction, "id" | "createdAt">) => void
}>({
  syncData: async () => {},
  getModuleData: () => null,
  createAction: () => {},
})

export default function CrossModuleInterop({
  currentModule,
  onDataSync,
  onActionComplete,
  className = "",
}: CrossModuleInteropProps) {
  const [moduleData, setModuleData] = useState<Record<string, ModuleData>>({})
  const [actions, setActions] = useState<CrossModuleAction[]>([])
  const [rules, setRules] = useState<InteropRule[]>([])
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [selectedTargetModule, setSelectedTargetModule] = useState<string>("")
  const [syncInProgress, setSyncInProgress] = useState<string[]>([])
  const [showRulesPanel, setShowRulesPanel] = useState(false)

  // Initialize sample data
  useEffect(() => {
    const sampleModuleData: Record<string, ModuleData> = {
      script: {
        id: "script_data",
        name: "Main Script",
        type: "script",
        data: {
          scenes: [
            { id: "scene_1", number: 1, title: "Hero Introduction", location: "INT. APARTMENT", timeOfDay: "NIGHT" },
            { id: "scene_2", number: 2, title: "Chase Sequence", location: "EXT. CITY STREET", timeOfDay: "DAY" },
          ],
          characters: [
            { id: "char_1", name: "Alex Chen", role: "Protagonist" },
            { id: "char_2", name: "Dr. Morgan", role: "Mentor" },
          ],
        },
        metadata: { totalScenes: 2, totalPages: 45, lastRevision: "Rev 3" },
        lastUpdated: "2024-03-19T14:30:00Z",
        version: "v1.3",
      },
      storyboard: {
        id: "storyboard_data",
        name: "Main Storyboard",
        type: "storyboard",
        data: {
          panels: [
            { id: "panel_1", sceneId: "scene_1", shotType: "Wide", description: "Hero enters apartment" },
            { id: "panel_2", sceneId: "scene_1", shotType: "Close-up", description: "Hero reaction shot" },
          ],
        },
        metadata: { totalPanels: 2, completedPanels: 2 },
        lastUpdated: "2024-03-19T15:00:00Z",
        version: "v2.1",
      },
      schedule: {
        id: "schedule_data",
        name: "Production Schedule",
        type: "schedule",
        data: {
          shootDays: [
            { id: "day_1", date: "2024-03-25", scenes: ["scene_1"], location: "Studio A" },
            { id: "day_2", date: "2024-03-26", scenes: ["scene_2"], location: "Downtown Location" },
          ],
        },
        metadata: { totalDays: 2, completedDays: 0 },
        lastUpdated: "2024-03-19T12:00:00Z",
        version: "v1.0",
      },
    }

    const sampleRules: InteropRule[] = [
      {
        id: "rule_1",
        sourceModule: "script",
        targetModule: "storyboard",
        trigger: "auto",
        condition: "scene_added",
        action: "create_storyboard_template",
        enabled: true,
        lastTriggered: "2024-03-19T10:00:00Z",
      },
      {
        id: "rule_2",
        sourceModule: "storyboard",
        targetModule: "schedule",
        trigger: "auto",
        condition: "panels_completed",
        action: "update_shot_list",
        enabled: true,
      },
      {
        id: "rule_3",
        sourceModule: "cast",
        targetModule: "schedule",
        trigger: "manual",
        action: "sync_availability",
        enabled: true,
      },
    ]

    setModuleData(sampleModuleData)
    setRules(sampleRules)
  }, [])

  // Get available sync targets for current module
  const getAvailableSyncTargets = () => {
    const currentConfig = MODULE_CONFIGS[currentModule as keyof typeof MODULE_CONFIGS]
    if (!currentConfig) return []

    return currentConfig.autoSync
      .map((moduleId) => ({
        id: moduleId,
        ...MODULE_CONFIGS[moduleId as keyof typeof MODULE_CONFIGS],
      }))
      .filter(Boolean)
  }

  // Get data that can be exported from current module
  const getExportableData = () => {
    const currentConfig = MODULE_CONFIGS[currentModule as keyof typeof MODULE_CONFIGS]
    const data = moduleData[currentModule]

    if (!currentConfig || !data) return []

    return currentConfig.exports.map((exportType) => ({
      type: exportType,
      label: exportType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      data: data.data[exportType] || [],
      count: Array.isArray(data.data[exportType]) ? data.data[exportType].length : 1,
    }))
  }

  // Get data that can be imported to target module
  const getImportableData = (targetModule: string) => {
    const targetConfig = MODULE_CONFIGS[targetModule as keyof typeof MODULE_CONFIGS]
    const currentConfig = MODULE_CONFIGS[currentModule as keyof typeof MODULE_CONFIGS]

    if (!targetConfig || !currentConfig) return []

    // Find matching import/export pairs
    const matches = targetConfig.imports.filter((importType) => {
      return currentConfig.exports.some(
        (exportType) => importType.includes(exportType.split("_")[0]) || exportType.includes(importType.split("_")[0]),
      )
    })

    return matches.map((importType) => ({
      type: importType,
      label: importType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      compatible: true,
    }))
  }

  // Perform data sync
  const performSync = async (targetModule: string, syncType: string) => {
    const actionId = `action_${Date.now()}`

    const newAction: CrossModuleAction = {
      id: actionId,
      type: "sync",
      sourceModule: currentModule,
      targetModule,
      description: `Sync ${syncType} from ${currentModule} to ${targetModule}`,
      status: "processing",
      progress: 0,
      createdAt: new Date().toISOString(),
    }

    setActions((prev) => [newAction, ...prev])
    setSyncInProgress((prev) => [...prev, actionId])

    // Simulate sync process
    const progressSteps = [10, 30, 50, 70, 90, 100]
    for (const progress of progressSteps) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setActions((prev) => prev.map((action) => (action.id === actionId ? { ...action, progress } : action)))
    }

    // Complete sync
    setActions((prev) =>
      prev.map((action) =>
        action.id === actionId
          ? {
              ...action,
              status: "completed",
              progress: 100,
              result: { synced: true, itemsCount: Math.floor(Math.random() * 10) + 1 },
            }
          : action,
      ),
    )

    setSyncInProgress((prev) => prev.filter((id) => id !== actionId))

    if (onActionComplete) {
      onActionComplete(newAction)
    }

    // Trigger data sync callback
    if (onDataSync) {
      onDataSync({
        sourceModule: currentModule,
        targetModule,
        syncType,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Generate AI suggestions for cross-module actions
  const getAISuggestions = () => {
    const suggestions = []

    // Check for potential syncs based on data freshness
    const currentData = moduleData[currentModule]
    if (currentData) {
      const targets = getAvailableSyncTargets()
      targets.forEach((target) => {
        const targetData = moduleData[target.id]
        if (targetData && new Date(currentData.lastUpdated) > new Date(targetData.lastUpdated)) {
          suggestions.push({
            type: "sync",
            title: `Sync with ${target.name}`,
            description: `${target.name} data is outdated. Sync latest changes from ${MODULE_CONFIGS[currentModule as keyof typeof MODULE_CONFIGS]?.name}.`,
            action: () => performSync(target.id, "auto"),
            priority: "medium",
            moduleId: target.id,
          })
        }
      })
    }

    // Check for missing storyboard panels
    if (currentModule === "script") {
      const scriptData = moduleData.script
      const storyboardData = moduleData.storyboard

      if (scriptData && storyboardData) {
        const sceneCount = scriptData.data.scenes?.length || 0
        const panelCount = storyboardData.data.panels?.length || 0

        if (sceneCount > panelCount / 2) {
          // Assuming 2 panels per scene minimum
          suggestions.push({
            type: "generate",
            title: "Generate Missing Storyboards",
            description: `${sceneCount} scenes found but only ${panelCount} storyboard panels. Generate missing panels with AI.`,
            action: () => {}, // Would trigger AI generation
            priority: "high",
            moduleId: "storyboard",
          })
        }
      }
    }

    return suggestions
  }

  // Render sync status indicator
  const renderSyncStatus = () => {
    const recentActions = actions.slice(0, 3)
    const hasActiveSync = syncInProgress.length > 0

    return (
      <div className="flex items-center gap-2">
        {hasActiveSync && (
          <div className="flex items-center gap-2 text-blue-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Syncing...</span>
          </div>
        )}

        {recentActions.length > 0 && (
          <div className="flex items-center gap-1">
            {recentActions.map((action) => (
              <div
                key={action.id}
                className={`w-2 h-2 rounded-full ${
                  action.status === "completed"
                    ? "bg-green-400"
                    : action.status === "failed"
                      ? "bg-red-400"
                      : action.status === "processing"
                        ? "bg-blue-400 animate-pulse"
                        : "bg-gray-400"
                }`}
                title={`${action.description} - ${action.status}`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render sync panel
  const renderSyncPanel = () => {
    if (!showSyncPanel) return null

    const availableTargets = getAvailableSyncTargets()
    const exportableData = getExportableData()
    const importableData = selectedTargetModule ? getImportableData(selectedTargetModule) : []

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Cross-Module Sync</h2>
              <button
                onClick={() => setShowSyncPanel(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Source Module */}
              <div>
                <h3 className="text-white font-medium mb-4">
                  From: {MODULE_CONFIGS[currentModule as keyof typeof MODULE_CONFIGS]?.name}
                </h3>

                <div className="space-y-3">
                  <h4 className="text-white/70 text-sm">Available Data to Export:</h4>
                  {exportableData.map((item) => (
                    <div key={item.type} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{item.label}</span>
                        <span className="text-white/60 text-sm">{item.count} items</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Module */}
              <div>
                <h3 className="text-white font-medium mb-4">To: Select Target Module</h3>

                <div className="space-y-3 mb-4">
                  {availableTargets.map((target) => {
                    const TargetIcon = target.icon
                    return (
                      <button
                        key={target.id}
                        onClick={() => setSelectedTargetModule(target.id)}
                        className={`w-full p-3 rounded-lg border transition-colors text-left ${
                          selectedTargetModule === target.id
                            ? "border-blue-400 bg-blue-500/20"
                            : "border-white/20 hover:border-white/40 bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <TargetIcon className={`h-5 w-5 ${target.color}`} />
                          <span className="text-white font-medium">{target.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedTargetModule && (
                  <div className="space-y-3">
                    <h4 className="text-white/70 text-sm">Compatible Import Types:</h4>
                    {importableData.map((item) => (
                      <div key={item.type} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{item.label}</span>
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => selectedTargetModule && performSync(selectedTargetModule, "manual")}
                disabled={!selectedTargetModule || syncInProgress.length > 0}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium"
              >
                <Sync className="h-4 w-4 inline mr-2" />
                Start Sync
              </button>
              <button
                onClick={() => setShowSyncPanel(false)}
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

  // Render AI suggestions
  const renderAISuggestions = () => {
    const suggestions = getAISuggestions()

    if (suggestions.length === 0) return null

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-purple-400" />
          <h3 className="text-white font-medium">AI Suggestions</h3>
        </div>

        <div className="space-y-2">
          {suggestions.map((suggestion, index) => {
            const TargetModule = MODULE_CONFIGS[suggestion.moduleId as keyof typeof MODULE_CONFIGS]
            const TargetIcon = TargetModule?.icon || Target

            return (
              <div key={index} className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <TargetIcon className={`h-5 w-5 mt-0.5 ${TargetModule?.color || "text-purple-400"}`} />
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm mb-1">{suggestion.title}</h4>
                      <p className="text-white/60 text-xs">{suggestion.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={suggestion.action}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs transition-colors"
                  >
                    {suggestion.type === "sync" ? "Sync Now" : "Generate"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render recent actions
  const renderRecentActions = () => {
    if (actions.length === 0) return null

    return (
      <div className="mb-4">
        <h3 className="text-white font-medium mb-3">Recent Actions</h3>
        <div className="space-y-2">
          {actions.slice(0, 5).map((action) => {
            const SourceModule = MODULE_CONFIGS[action.sourceModule as keyof typeof MODULE_CONFIGS]
            const TargetModule = MODULE_CONFIGS[action.targetModule as keyof typeof MODULE_CONFIGS]

            return (
              <div key={action.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {SourceModule && <SourceModule.icon className={`h-4 w-4 ${SourceModule.color}`} />}
                    <ArrowRight className="h-3 w-3 text-white/50" />
                    {TargetModule && <TargetModule.icon className={`h-4 w-4 ${TargetModule.color}`} />}
                    <span className="text-white text-sm font-medium">
                      {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {action.status === "completed" && <CheckCircle className="h-4 w-4 text-green-400" />}
                    {action.status === "failed" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                    {action.status === "processing" && <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />}
                    <span
                      className={`text-xs ${
                        action.status === "completed"
                          ? "text-green-400"
                          : action.status === "failed"
                            ? "text-red-400"
                            : action.status === "processing"
                              ? "text-blue-400"
                              : "text-white/60"
                      }`}
                    >
                      {action.status}
                    </span>
                  </div>
                </div>

                <p className="text-white/60 text-xs mb-2">{action.description}</p>

                {action.status === "processing" && action.progress !== undefined && (
                  <div className="w-full bg-white/20 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${action.progress}%` }}
                    />
                  </div>
                )}

                {action.result && (
                  <div className="text-xs text-green-400 mt-1">✓ Synced {action.result.itemsCount} items</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <InteropContext.Provider
      value={{
        syncData: async (sourceModule, targetModule, data) => {
          await performSync(targetModule, "api")
        },
        getModuleData: (moduleId) => moduleData[moduleId] || null,
        createAction: (actionData) => {
          const newAction = {
            ...actionData,
            id: `action_${Date.now()}`,
            createdAt: new Date().toISOString(),
          }
          setActions((prev) => [newAction, ...prev])
        },
      }}
    >
      <div className={`bg-white/5 rounded-lg border border-white/10 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-blue-400" />
            <h2 className="text-white font-medium">Cross-Module Integration</h2>
          </div>

          <div className="flex items-center gap-2">
            {renderSyncStatus()}
            <button
              onClick={() => setShowSyncPanel(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
            >
              <Sync className="h-4 w-4 inline mr-2" />
              Sync Data
            </button>
          </div>
        </div>

        {renderAISuggestions()}
        {renderRecentActions()}

        {/* Quick Sync Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {getAvailableSyncTargets().map((target) => {
            const TargetIcon = target.icon
            const isInProgress = syncInProgress.some(
              (id) => actions.find((a) => a.id === id)?.targetModule === target.id,
            )

            return (
              <button
                key={target.id}
                onClick={() => performSync(target.id, "quick")}
                disabled={isInProgress}
                className="p-3 rounded-lg border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <TargetIcon className={`h-4 w-4 ${target.color}`} />
                  <span className="text-white text-sm font-medium">{target.name}</span>
                </div>
                <div className="text-white/60 text-xs">{isInProgress ? "Syncing..." : "Quick Sync"}</div>
              </button>
            )
          })}
        </div>

        {renderSyncPanel()}
      </div>
    </InteropContext.Provider>
  )
}

// Hook for using cross-module interop
export function useCrossModuleInterop() {
  const context = useContext(InteropContext)
  if (!context) {
    throw new Error("useCrossModuleInterop must be used within CrossModuleInterop")
  }
  return context
}

// Component for embedding interop controls in other modules
export function InteropControls({
  moduleId,
  onSync,
  className = "",
}: {
  moduleId: string
  onSync?: (targetModule: string) => void
  className?: string
}) {
  const { syncData, getModuleData } = useCrossModuleInterop()

  const moduleConfig = MODULE_CONFIGS[moduleId as keyof typeof MODULE_CONFIGS]
  if (!moduleConfig) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-white/70 text-sm">Sync with:</span>
      {moduleConfig.autoSync.map((targetId) => {
        const targetConfig = MODULE_CONFIGS[targetId as keyof typeof MODULE_CONFIGS]
        if (!targetConfig) return null

        const TargetIcon = targetConfig.icon

        return (
          <button
            key={targetId}
            onClick={() => {
              syncData(moduleId, targetId, {})
              onSync?.(targetId)
            }}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs transition-colors"
            title={`Sync with ${targetConfig.name}`}
          >
            <TargetIcon className={`h-3 w-3 ${targetConfig.color}`} />
            <span>{targetConfig.name}</span>
          </button>
        )
      })}
    </div>
  )
}
