"use client"

import { useState, useEffect } from "react"
import {
  ImageIcon,
  Plus,
  Grid3X3,
  List,
  Edit,
  Trash2,
  Download,
  Heart,
  Share2,
  Bookmark,
  Tag,
  Palette,
  X,
  User,
} from "lucide-react"

interface MoodboardItem {
  id: number
  title: string
  category: string
  type: string
  imageUrl: string
  description?: string
  tags: string[]
  color?: string
  createdBy?: string
  createdAt?: string
  likes?: number
  isLiked?: boolean
  isBookmarked?: boolean
  source?: string
  notes?: string
}

interface MoodboardModuleProps {
  searchQuery?: string
  filters?: {
    category: string
    type: string
    color?: string
  }
  projectId?: string
}

const MOCK_MOODBOARD_STORE: Record<string, MoodboardItem[]> = {}

export default function MoodboardModule({
  searchQuery = "",
  filters = { category: "all", type: "all", color: "all" },
  projectId = "1",
}: MoodboardModuleProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedItem, setSelectedItem] = useState<MoodboardItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [gridSize, setGridSize] = useState(3)
  const [moodboardItems, setMoodboardItems] = useState<MoodboardItem[]>([])

  useEffect(() => {
    if (MOCK_MOODBOARD_STORE[projectId]) {
      setMoodboardItems(MOCK_MOODBOARD_STORE[projectId])
      return
    }

    const initialItems: MoodboardItem[] = [
      {
        id: 1,
        title: "Cozy Living Room",
        category: "Living Room",
        type: "Interior",
        imageUrl: "/placeholder.svg?height=400&width=300&text=Cozy+Living+Room",
        description: "A warm and inviting living space with natural lighting.",
        tags: ["cozy", "living room", "interior", "warm", "natural light"],
        color: "warm",
        createdBy: "Sarah Johnson",
        createdAt: "2024-01-15",
        likes: 24,
        isLiked: true,
        isBookmarked: false,
        source: "Pinterest",
        notes: "Perfect for intimate dialogue scenes",
      },
      {
        id: 2,
        title: "Modern Kitchen Design",
        category: "Kitchen",
        type: "Interior",
        imageUrl: "/placeholder.svg?height=400&width=300&text=Modern+Kitchen",
        description: "Sleek and functional kitchen design with clean lines.",
        tags: ["modern", "kitchen", "interior", "clean", "minimalist"],
        color: "cool",
        createdBy: "Mike Chen",
        createdAt: "2024-01-14",
        likes: 18,
        isLiked: false,
        isBookmarked: true,
        source: "Architectural Digest",
        notes: "Great for cooking scenes and family interactions",
      },
      {
        id: 3,
        title: "Minimalist Bedroom",
        category: "Bedroom",
        type: "Interior",
        imageUrl: "/placeholder.svg?height=400&width=300&text=Minimalist+Bedroom",
        description: "Clean and simple bedroom decor with neutral tones.",
        tags: ["minimalist", "bedroom", "interior", "neutral", "simple"],
        color: "neutral",
        createdBy: "Emma Davis",
        createdAt: "2024-01-13",
        likes: 31,
        isLiked: true,
        isBookmarked: true,
        source: "Design Milk",
        notes: "Ideal for peaceful morning scenes",
      },
      {
        id: 4,
        title: "Rustic Bathroom",
        category: "Bathroom",
        type: "Interior",
        imageUrl: "/placeholder.svg?height=400&width=300&text=Rustic+Bathroom",
        description: "A bathroom with rustic charm and vintage fixtures.",
        tags: ["rustic", "bathroom", "interior", "vintage", "wood"],
        color: "warm",
        createdBy: "Tom Wilson",
        createdAt: "2024-01-12",
        likes: 15,
        isLiked: false,
        isBookmarked: false,
        source: "Country Living",
        notes: "Character-building space with texture",
      },
      {
        id: 5,
        title: "Outdoor Patio",
        category: "Outdoor",
        type: "Exterior",
        imageUrl: "/placeholder.svg?height=400&width=300&text=Outdoor+Patio",
        description: "Relaxing outdoor patio space with garden views.",
        tags: ["outdoor", "patio", "exterior", "garden", "relaxing"],
        color: "natural",
        createdBy: "Lisa Park",
        createdAt: "2024-01-11",
        likes: 42,
        isLiked: true,
        isBookmarked: false,
        source: "Better Homes & Gardens",
        notes: "Perfect for outdoor dining and conversation scenes",
      },
      {
        id: 6,
        title: "Contemporary Office",
        category: "Office",
        type: "Interior",
        imageUrl: "/placeholder.svg?height=400&width=300&text=Contemporary+Office",
        description: "A modern and productive office environment.",
        tags: ["contemporary", "office", "interior", "professional", "modern"],
        color: "cool",
        createdBy: "Alex Kim",
        createdAt: "2024-01-10",
        likes: 27,
        isLiked: false,
        isBookmarked: true,
        source: "Office Design Magazine",
        notes: "Corporate scenes and business meetings",
      },
    ]

    if (projectId === "2") {
      initialItems.shift();
      initialItems.forEach(item => item.category = "Architecture");
    } else if (projectId === "3") {
      initialItems.shift();
      initialItems.shift();
      initialItems.forEach(item => item.notes = "Project 3 Note");
    }

    MOCK_MOODBOARD_STORE[projectId] = initialItems;
    setMoodboardItems(initialItems);
  }, [projectId])

  useEffect(() => {
    if (moodboardItems.length > 0 && projectId) {
      MOCK_MOODBOARD_STORE[projectId] = moodboardItems;
    }
  }, [moodboardItems, projectId])

  const filteredItems = moodboardItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.notes?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filters.category === "all" || item.category.toLowerCase() === filters.category.toLowerCase()
    const matchesType = filters.type === "all" || item.type.toLowerCase() === filters.type.toLowerCase()
    const matchesColor = !filters.color || filters.color === "all" || item.color === filters.color

    return matchesSearch && matchesCategory && matchesType && matchesColor
  })

  const getColorBadge = (color?: string) => {
    switch (color) {
      case "warm":
        return "bg-orange-500/20 text-orange-400"
      case "cool":
        return "bg-blue-500/20 text-blue-400"
      case "neutral":
        return "bg-gray-500/20 text-gray-400"
      case "natural":
        return "bg-green-500/20 text-green-400"
      default:
        return "bg-purple-500/20 text-purple-400"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Moodboard</h1>
          <p className="text-white/70">Visual inspiration and reference collection</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Image
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{moodboardItems.length}</p>
              <p className="text-white/70 text-sm">Total Images</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {moodboardItems.reduce((sum, item) => sum + (item.likes || 0), 0)}
              </p>
              <p className="text-white/70 text-sm">Total Likes</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Bookmark className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {moodboardItems.filter((item) => item.isBookmarked).length}
              </p>
              <p className="text-white/70 text-sm">Bookmarked</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Tag className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {new Set(moodboardItems.flatMap((item) => item.tags)).size}
              </p>
              <p className="text-white/70 text-sm">Unique Tags</p>
            </div>
          </div>
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
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {viewMode === "grid" && (
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm">Grid Size:</span>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"
              >
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
                <option value={5}>5 Columns</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Moodboard Grid */}
      {viewMode === "grid" && (
        <div
          className={`grid gap-4 ${gridSize === 2
            ? "grid-cols-1 md:grid-cols-2"
            : gridSize === 3
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : gridSize === 4
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            }`}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer group"
              onClick={() => setSelectedItem(item)}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.imageUrl || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button
                      className={`p-2 rounded-full backdrop-blur-sm transition-colors ${item.isLiked ? "bg-red-500 text-white" : "bg-black/50 text-white hover:bg-red-500"
                        }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle like
                      }}
                    >
                      <Heart className="h-3 w-3" />
                    </button>
                    <button
                      className={`p-2 rounded-full backdrop-blur-sm transition-colors ${item.isBookmarked ? "bg-yellow-500 text-white" : "bg-black/50 text-white hover:bg-yellow-500"
                        }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle bookmark
                      }}
                    >
                      <Bookmark className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-3 left-3">
                  {item.color && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColorBadge(item.color)}`}>
                      {item.color}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-white font-semibold mb-1 line-clamp-1">{item.title}</h3>
                <p className="text-white/70 text-sm mb-2">
                  {item.category} • {item.type}
                </p>
                {item.description && <p className="text-white/60 text-xs mb-3 line-clamp-2">{item.description}</p>}

                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">+{item.tags.length - 3}</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-white/70">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{item.likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{item.createdBy}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex gap-4">
                <img
                  src={item.imageUrl || "/placeholder.svg"}
                  alt={item.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-semibold">{item.title}</h3>
                      <p className="text-white/70 text-sm">
                        {item.category} • {item.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.color && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColorBadge(item.color)}`}>
                          {item.color}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-white/70">
                        <Heart className="h-3 w-3" />
                        <span className="text-xs">{item.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                  {item.description && <p className="text-white/60 text-sm mb-2">{item.description}</p>}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>By {item.createdBy}</span>
                    <span>{item.createdAt}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedItem.title}</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedItem.imageUrl || "/placeholder.svg"}
                    alt={selectedItem.title}
                    className="w-full rounded-lg mb-4"
                  />
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${selectedItem.isLiked ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-red-500"
                        }`}
                    >
                      <Heart className="h-4 w-4" />
                      {selectedItem.likes || 0}
                    </button>
                    <button
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${selectedItem.isBookmarked
                        ? "bg-yellow-500 text-white"
                        : "bg-white/10 text-white hover:bg-yellow-500"
                        }`}
                    >
                      <Bookmark className="h-4 w-4" />
                      Bookmark
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-2">Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Category:</span>
                        <span className="text-white">{selectedItem.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Type:</span>
                        <span className="text-white">{selectedItem.type}</span>
                      </div>
                      {selectedItem.color && (
                        <div className="flex justify-between">
                          <span className="text-white/70">Color Palette:</span>
                          <span className={`px-2 py-1 rounded text-xs ${getColorBadge(selectedItem.color)}`}>
                            {selectedItem.color}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-white/70">Created by:</span>
                        <span className="text-white">{selectedItem.createdBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Date:</span>
                        <span className="text-white">{selectedItem.createdAt}</span>
                      </div>
                      {selectedItem.source && (
                        <div className="flex justify-between">
                          <span className="text-white/70">Source:</span>
                          <span className="text-white">{selectedItem.source}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedItem.description && (
                    <div>
                      <h3 className="text-white font-medium mb-2">Description</h3>
                      <p className="text-white/80 text-sm">{selectedItem.description}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-white font-medium mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedItem.notes && (
                    <div>
                      <h3 className="text-white font-medium mb-2">Production Notes</h3>
                      <p className="text-white/80 text-sm bg-white/5 rounded-lg p-3">{selectedItem.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex gap-3 flex-wrap">
                  <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Palette className="h-4 w-4" />
                    Extract Colors
                  </button>
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
