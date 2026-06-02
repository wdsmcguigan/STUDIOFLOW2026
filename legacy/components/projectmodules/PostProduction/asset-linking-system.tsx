"use client"

import { useState, useEffect } from "react"
import {
  Link,
  Eye,
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  Layers,
  FileText,
  Video,
  Music,
  Palette,
  Users,
  Calendar,
  MapPin,
  Zap,
  X,
} from "lucide-react"

interface Asset {
  id: string
  name: string
  type:
    | "storyboard"
    | "moodboard"
    | "script"
    | "dailies"
    | "vfx"
    | "audio"
    | "document"
    | "schedule"
    | "location"
    | "cast"
  moduleId: string
  projectId: string
  thumbnail?: string
  description?: string
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  metadata: Record<string, any>
  status?: string
  version?: string
}

interface AssetLink {
  id: string
  sourceAssetId: string
  targetAssetId: string
  linkType: "reference" | "comparison" | "dependency" | "inspiration" | "version"
  description?: string
  createdAt: string
  createdBy: string
  metadata?: Record<string, any>
}

interface AssetLinkingProps {
  currentAsset?: Asset
  onLinkCreated?: (link: AssetLink) => void
  onAssetSelected?: (asset: Asset) => void
  className?: string
  variant?: "panel" | "modal" | "sidebar"
  showReferences?: boolean
}

const ASSET_TYPES = {
  storyboard: { icon: Layers, color: "text-blue-400", label: "Storyboard" },
  moodboard: { icon: Palette, color: "text-purple-400", label: "Moodboard" },
  script: { icon: FileText, color: "text-green-400", label: "Script" },
  dailies: { icon: Video, color: "text-red-400", label: "Dailies" },
  vfx: { icon: Zap, color: "text-yellow-400", label: "VFX" },
  audio: { icon: Music, color: "text-pink-400", label: "Audio" },
  document: { icon: FileText, color: "text-gray-400", label: "Document" },
  schedule: { icon: Calendar, color: "text-orange-400", label: "Schedule" },
  location: { icon: MapPin, color: "text-teal-400", label: "Location" },
  cast: { icon: Users, color: "text-indigo-400", label: "Cast" },
}

const LINK_TYPES = {
  reference: { label: "Reference", color: "bg-blue-500", description: "Used as reference or inspiration" },
  comparison: { label: "Compare", color: "bg-purple-500", description: "Compare side-by-side" },
  dependency: { label: "Dependency", color: "bg-red-500", description: "Required for this asset" },
  inspiration: { label: "Inspiration", color: "bg-green-500", description: "Inspired by this asset" },
  version: { label: "Version", color: "bg-orange-500", description: "Different version of same asset" },
}

export default function AssetLinkingSystem({
  currentAsset,
  onLinkCreated,
  onAssetSelected,
  className = "",
  variant = "panel",
  showReferences = true,
}: AssetLinkingProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [links, setLinks] = useState<AssetLink[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedLinkType, setSelectedLinkType] = useState<string>("reference")
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonAssets, setComparisonAssets] = useState<Asset[]>([])

  // Sample assets data
  useEffect(() => {
    const sampleAssets: Asset[] = [
      {
        id: "asset_1",
        name: "Hero Shot Storyboard",
        type: "storyboard",
        moduleId: "storyboard",
        projectId: "project_1",
        thumbnail: "/placeholder.svg?height=100&width=150&text=Storyboard",
        description: "Main character introduction sequence",
        tags: ["hero", "introduction", "wide-shot"],
        createdAt: "2024-03-15T10:00:00Z",
        updatedAt: "2024-03-15T14:30:00Z",
        createdBy: "Director",
        metadata: { panels: 6, duration: 15 },
        status: "approved",
        version: "v2",
      },
      {
        id: "asset_2",
        name: "Moody Lighting Reference",
        type: "moodboard",
        moduleId: "moodboard",
        projectId: "project_1",
        thumbnail: "/placeholder.svg?height=100&width=150&text=Moodboard",
        description: "Dark, atmospheric lighting inspiration",
        tags: ["lighting", "mood", "atmosphere", "dark"],
        createdAt: "2024-03-14T16:00:00Z",
        updatedAt: "2024-03-15T09:00:00Z",
        createdBy: "DP",
        metadata: { images: 8, palette: ["#1a1a2e", "#16213e"] },
        status: "final",
      },
      {
        id: "asset_3",
        name: "Scene 12 Dailies",
        type: "dailies",
        moduleId: "dailies-review",
        projectId: "project_1",
        thumbnail: "/placeholder.svg?height=100&width=150&text=Dailies",
        description: "Hero shot takes from Scene 12",
        tags: ["scene-12", "hero", "takes", "approved"],
        createdAt: "2024-03-16T08:00:00Z",
        updatedAt: "2024-03-16T12:00:00Z",
        createdBy: "Editor",
        metadata: { takes: 5, duration: 180, bestTake: 3 },
        status: "reviewed",
      },
      {
        id: "asset_4",
        name: "VFX Shot 012",
        type: "vfx",
        moduleId: "vfx",
        projectId: "project_1",
        thumbnail: "/placeholder.svg?height=100&width=150&text=VFX+Shot",
        description: "Hologram effect for hero introduction",
        tags: ["hologram", "vfx", "hero", "scene-12"],
        createdAt: "2024-03-17T10:00:00Z",
        updatedAt: "2024-03-18T15:00:00Z",
        createdBy: "VFX Artist",
        metadata: { complexity: "high", progress: 75 },
        status: "in-progress",
      },
      {
        id: "asset_5",
        name: "Character Theme Music",
        type: "audio",
        moduleId: "audio",
        projectId: "project_1",
        thumbnail: "/placeholder.svg?height=100&width=150&text=Audio",
        description: "Main character leitmotif",
        tags: ["theme", "character", "music", "leitmotif"],
        createdAt: "2024-03-18T14:00:00Z",
        updatedAt: "2024-03-18T16:30:00Z",
        createdBy: "Composer",
        metadata: { duration: 45, key: "C minor", tempo: 120 },
        status: "approved",
      },
    ]

    const sampleLinks: AssetLink[] = [
      {
        id: "link_1",
        sourceAssetId: "asset_1",
        targetAssetId: "asset_2",
        linkType: "reference",
        description: "Storyboard references moodboard for lighting",
        createdAt: "2024-03-15T11:00:00Z",
        createdBy: "Director",
      },
      {
        id: "link_2",
        sourceAssetId: "asset_3",
        targetAssetId: "asset_1",
        linkType: "comparison",
        description: "Compare dailies against storyboard",
        createdAt: "2024-03-16T09:00:00Z",
        createdBy: "Editor",
      },
      {
        id: "link_3",
        sourceAssetId: "asset_4",
        targetAssetId: "asset_1",
        linkType: "dependency",
        description: "VFX shot based on storyboard panel 3",
        createdAt: "2024-03-17T11:00:00Z",
        createdBy: "VFX Supervisor",
      },
    ]

    setAssets(sampleAssets)
    setLinks(sampleLinks)
  }, [])

  // Get linked assets for current asset
  const getLinkedAssets = (assetId: string) => {
    const assetLinks = links.filter((link) => link.sourceAssetId === assetId || link.targetAssetId === assetId)

    return assetLinks
      .map((link) => {
        const linkedAssetId = link.sourceAssetId === assetId ? link.targetAssetId : link.sourceAssetId
        const linkedAsset = assets.find((asset) => asset.id === linkedAssetId)
        return {
          asset: linkedAsset,
          link,
          direction: link.sourceAssetId === assetId ? "outgoing" : "incoming",
        }
      })
      .filter((item) => item.asset)
  }

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    if (currentAsset && asset.id === currentAsset.id) return false

    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = selectedType === "all" || asset.type === selectedType

    return matchesSearch && matchesType
  })

  // Create asset link
  const createLink = (targetAsset: Asset) => {
    if (!currentAsset) return

    const newLink: AssetLink = {
      id: `link_${Date.now()}`,
      sourceAssetId: currentAsset.id,
      targetAssetId: targetAsset.id,
      linkType: selectedLinkType as any,
      description: `${LINK_TYPES[selectedLinkType as keyof typeof LINK_TYPES].description}`,
      createdAt: new Date().toISOString(),
      createdBy: "Current User",
    }

    setLinks((prev) => [...prev, newLink])
    setShowLinkModal(false)

    if (onLinkCreated) {
      onLinkCreated(newLink)
    }
  }

  // Remove asset link
  const removeLink = (linkId: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== linkId))
  }

  // Start comparison
  const startComparison = (compareAssets: Asset[]) => {
    setComparisonAssets(compareAssets)
    setShowComparison(true)
  }

  // Render asset card
  const renderAssetCard = (asset: Asset, showActions = true) => {
    const assetType = ASSET_TYPES[asset.type]

    return (
      <div className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {asset.thumbnail ? (
              <img
                src={asset.thumbnail || "/placeholder.svg"}
                alt={asset.name}
                className="w-16 h-12 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-12 bg-white/10 rounded flex items-center justify-center">
                <assetType.icon className={`h-6 w-6 ${assetType.color}`} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-white font-medium text-sm truncate">{asset.name}</h4>
              <span className={`px-2 py-1 rounded text-xs ${assetType.color} bg-white/10`}>{assetType.label}</span>
            </div>

            {asset.description && <p className="text-white/60 text-xs mb-2 line-clamp-2">{asset.description}</p>}

            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>{new Date(asset.updatedAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{asset.createdBy}</span>
              {asset.status && (
                <>
                  <span>•</span>
                  <span className="capitalize">{asset.status}</span>
                </>
              )}
            </div>

            {asset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {asset.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded">
                    {tag}
                  </span>
                ))}
                {asset.tags.length > 3 && <span className="text-white/50 text-xs">+{asset.tags.length - 3}</span>}
              </div>
            )}
          </div>

          {showActions && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedAsset(asset)
                  setShowLinkModal(true)
                }}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Link Asset"
              >
                <Link className="h-4 w-4 text-white/70" />
              </button>
              <button
                onClick={() => onAssetSelected?.(asset)}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="View Asset"
              >
                <Eye className="h-4 w-4 text-white/70" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render linked assets panel
  const renderLinkedAssets = () => {
    if (!currentAsset || !showReferences) return null

    const linkedAssets = getLinkedAssets(currentAsset.id)

    if (linkedAssets.length === 0) {
      return (
        <div className="bg-white/5 rounded-lg border border-white/10 p-6 text-center">
          <Link className="h-12 w-12 text-white/30 mx-auto mb-3" />
          <h3 className="text-white font-medium mb-2">No Linked Assets</h3>
          <p className="text-white/60 text-sm mb-4">
            Link this asset to other project assets for easy reference and comparison.
          </p>
          <button
            onClick={() => setShowLinkModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Link Asset
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Linked Assets ({linkedAssets.length})</h3>
          <button onClick={() => setShowLinkModal(true)} className="text-blue-400 hover:text-blue-300 text-sm">
            <Plus className="h-4 w-4 inline mr-1" />
            Add Link
          </button>
        </div>

        <div className="space-y-3">
          {linkedAssets.map(({ asset, link, direction }) => {
            if (!asset) return null

            const linkType = LINK_TYPES[link.linkType]

            return (
              <div key={link.id} className="bg-white/5 rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs text-white ${linkType.color}`}>{linkType.label}</span>
                    {direction === "incoming" ? (
                      <ArrowLeft className="h-4 w-4 text-white/50" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-white/50" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {link.linkType === "comparison" && (
                      <button
                        onClick={() => startComparison([currentAsset, asset])}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="Compare"
                      >
                        <Eye className="h-4 w-4 text-white/70" />
                      </button>
                    )}
                    <button
                      onClick={() => removeLink(link.id)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="Remove Link"
                    >
                      <X className="h-4 w-4 text-white/70" />
                    </button>
                  </div>
                </div>

                {renderAssetCard(asset, false)}

                {link.description && <p className="text-white/60 text-sm mt-2 italic">{link.description}</p>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render asset browser
  const renderAssetBrowser = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
        >
          <option value="all">All Types</option>
          {Object.entries(ASSET_TYPES).map(([type, config]) => (
            <option key={type} value={type}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAssets.map((asset) => (
          <div key={asset.id}>{renderAssetCard(asset)}</div>
        ))}
      </div>
    </div>
  )

  // Render link creation modal
  const renderLinkModal = () => {
    if (!showLinkModal) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Link Assets</h2>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {currentAsset && (
              <div className="mb-6">
                <h3 className="text-white font-medium mb-3">Current Asset</h3>
                {renderAssetCard(currentAsset, false)}
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-white font-medium mb-3">Link Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(LINK_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedLinkType(type)}
                    className={`p-3 rounded-lg border transition-colors text-left ${
                      selectedLinkType === type
                        ? "border-blue-400 bg-blue-500/20"
                        : "border-white/20 hover:border-white/40 bg-white/5"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded ${config.color} mb-2`}></div>
                    <div className="text-white font-medium text-sm">{config.label}</div>
                    <div className="text-white/60 text-xs">{config.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-white font-medium mb-3">Select Asset to Link</h3>
              {renderAssetBrowser()}
            </div>

            {selectedAsset && (
              <div className="mb-6">
                <h3 className="text-white font-medium mb-3">Selected Asset</h3>
                {renderAssetCard(selectedAsset, false)}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => selectedAsset && createLink(selectedAsset)}
                disabled={!selectedAsset}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium"
              >
                Create Link
              </button>
              <button
                onClick={() => setShowLinkModal(false)}
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

  // Render comparison view
  const renderComparisonModal = () => {
    if (!showComparison || comparisonAssets.length === 0) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Asset Comparison</h2>
              <button
                onClick={() => setShowComparison(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {comparisonAssets.map((asset, index) => (
                <div key={asset.id} className="space-y-4">
                  <h3 className="text-white font-medium">Asset {index + 1}</h3>
                  {renderAssetCard(asset, false)}

                  {asset.thumbnail && (
                    <div className="aspect-video bg-black/30 rounded-lg overflow-hidden">
                      <img
                        src={asset.thumbnail || "/placeholder.svg"}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowComparison(false)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {variant === "panel" && <div className="space-y-6">{renderLinkedAssets()}</div>}

      {variant === "sidebar" && (
        <div className="w-80 bg-white/10 backdrop-blur-lg border-l border-white/20 p-4 space-y-6">
          {renderLinkedAssets()}
        </div>
      )}

      {renderLinkModal()}
      {renderComparisonModal()}
    </div>
  )
}

// Hook for managing asset links
export function useAssetLinks(assetId?: string) {
  const [links, setLinks] = useState<AssetLink[]>([])
  const [loading, setLoading] = useState(false)

  const createLink = async (sourceId: string, targetId: string, type: string) => {
    setLoading(true)
    // Implementation would call API
    setLoading(false)
  }

  const removeLink = async (linkId: string) => {
    setLoading(true)
    // Implementation would call API
    setLoading(false)
  }

  const getLinkedAssets = (assetId: string) => {
    return links.filter((link) => link.sourceAssetId === assetId || link.targetAssetId === assetId)
  }

  return {
    links,
    loading,
    createLink,
    removeLink,
    getLinkedAssets,
  }
}
