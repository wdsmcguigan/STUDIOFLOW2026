"use client"

import { useState, useEffect } from "react"
import {
  Package,
  Plus,
  Grid3X3,
  List,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  ChevronDown,
  ChevronUp,
  X,
  Brain,
  Camera,
  Mic,
  Lightbulb,
  Monitor,
  Zap,
  Settings,
  Users,
  TrendingUp,
  Building,
  BarChart3,
  Filter,
} from "lucide-react"

interface GearItem {
  id: string
  name: string
  category: "camera" | "audio" | "lighting" | "grip" | "electrical" | "post" | "transport"
  brand: string
  model: string
  serialNumber: string
  status: "available" | "checked-out" | "maintenance" | "damaged" | "lost"
  condition: "excellent" | "good" | "fair" | "poor"
  dailyRate: number
  replacementValue: number
  location: string
  checkedOutTo?: string
  checkedOutDate?: string
  dueDate?: string
  description: string
  specifications: { [key: string]: string }
  images: string[]
  rentalSources: RentalSource[]
  retailSources: RetailSource[]
  lastMaintenance?: string
  nextMaintenance?: string
  notes: string
  departmentId: string
}

interface Department {
  id: string
  name: string
  category: "camera" | "audio" | "lighting" | "grip" | "electrical" | "post" | "transport"
  head: string
  headId: string
  budget: number
  spent: number
  crewMembers: string[]
  gearItems: string[]
  color: string
  description: string
  dailyCrewCost: number
  dailyGearCost: number
  weeklyBudget: number
  monthlyBudget: number
}

interface CrewMember {
  id: string
  name: string
  role: string
  department: string
  departmentId: string
  hourlyRate: number
  dailyRate: number
  status: "available" | "busy" | "on-set" | "off-duty" | "unavailable"
  avatar: string
}

interface RentalSource {
  id: string
  company: string
  contact: string
  phone: string
  email: string
  dailyRate: number
  weeklyRate: number
  availability: "available" | "limited" | "unavailable"
  rating: number
  notes: string
}

interface RetailSource {
  id: string
  retailer: string
  price: number
  url: string
  inStock: boolean
  rating: number
  shippingTime: string
}

interface SearchMode {
  global: boolean
  moduleSpecific: boolean
}

const MOCK_GEAR_STORE: Record<string, GearItem[]> = {}

export default function GearManagement({
  searchQuery = "",
  searchMode,
  filters = { category: "all", status: "all", department: "all" },
  projectId = "1",
}: {
  searchQuery?: string
  searchMode?: SearchMode
  filters?: {
    category: string
    status: string
    department: string
  }
  projectId?: string
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list" | "departments">("departments")
  const [gridColumns, setGridColumns] = useState(3)
  const [selectedItem, setSelectedItem] = useState<GearItem | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showDepartmentDetail, setShowDepartmentDetail] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [showSources, setShowSources] = useState<{ rental: boolean; retail: boolean }>({ rental: false, retail: false })
  const [gearItems, setGearItems] = useState<GearItem[]>([])

  // Mock Store
  const MOCK_GEAR_STORE: Record<string, GearItem[]> = {}

  useEffect(() => {
    // In a real app we'd move this outside component or use a proper store, 
    // but for local vars inside component, we can just use a module-level variable 
    // if we want it to persist across re-mounts but not page reloads unless we move it out.
    // Actually, I'll move MOCK_GEAR_STORE outside in a separate replacement chunk to be safe.
  }, [])


  // Sample crew data (integrated from team collaboration)
  const crewMembers: CrewMember[] = [
    {
      id: "1",
      name: "Sarah Chen",
      role: "Director",
      department: "Direction",
      departmentId: "direction",
      hourlyRate: 62.5,
      dailyRate: 500,
      status: "on-set",
      avatar: "SC",
    },
    {
      id: "2",
      name: "Alex Kim",
      role: "Director of Photography",
      department: "Camera",
      departmentId: "camera",
      hourlyRate: 50,
      dailyRate: 400,
      status: "available",
      avatar: "AK",
    },
    {
      id: "3",
      name: "Emma Davis",
      role: "Editor",
      department: "Post-Production",
      departmentId: "post",
      hourlyRate: 37.5,
      dailyRate: 300,
      status: "busy",
      avatar: "ED",
    },
    {
      id: "4",
      name: "Mike Rodriguez",
      role: "Sound Mixer",
      department: "Audio",
      departmentId: "audio",
      hourlyRate: 43.75,
      dailyRate: 350,
      status: "on-set",
      avatar: "MR",
    },
    {
      id: "5",
      name: "Lisa Park",
      role: "Gaffer",
      department: "Lighting",
      departmentId: "lighting",
      hourlyRate: 40,
      dailyRate: 320,
      status: "available",
      avatar: "LP",
    },
    {
      id: "6",
      name: "Tom Wilson",
      role: "Key Grip",
      department: "Grip",
      departmentId: "grip",
      hourlyRate: 35,
      dailyRate: 280,
      status: "busy",
      avatar: "TW",
    },
    {
      id: "7",
      name: "Jake Martinez",
      role: "Camera Operator",
      department: "Camera",
      departmentId: "camera",
      hourlyRate: 37.5,
      dailyRate: 300,
      status: "available",
      avatar: "JM",
    },
    {
      id: "8",
      name: "Sophie Brown",
      role: "Boom Operator",
      department: "Audio",
      departmentId: "audio",
      hourlyRate: 25,
      dailyRate: 200,
      status: "on-set",
      avatar: "SB",
    },
  ]

  // Sample departments with integrated crew and gear
  const departments: Department[] = [
    {
      id: "camera",
      name: "Camera Department",
      category: "camera",
      head: "Alex Kim",
      headId: "2",
      budget: 120000,
      spent: 45000,
      crewMembers: ["2", "7"],
      gearItems: ["1", "4"],
      color: "bg-blue-500",
      description: "Cinematography and camera operations",
      dailyCrewCost: 700, // Alex (400) + Jake (300)
      dailyGearCost: 950, // RED Komodo (850) + Lens Package (100)
      weeklyBudget: 11550, // (700 + 950) * 7
      monthlyBudget: 49500, // Weekly * 30/7
    },
    {
      id: "lighting",
      name: "Lighting Department",
      category: "lighting",
      head: "Lisa Park",
      headId: "5",
      budget: 100000,
      spent: 32000,
      crewMembers: ["5"],
      gearItems: ["2", "5"],
      color: "bg-yellow-500",
      description: "Lighting design and electrical",
      dailyCrewCost: 320, // Lisa (320)
      dailyGearCost: 225, // SkyPanel (125) + LED Kit (100)
      weeklyBudget: 3815, // (320 + 225) * 7
      monthlyBudget: 16350,
    },
    {
      id: "audio",
      name: "Audio Department",
      category: "audio",
      head: "Mike Rodriguez",
      headId: "4",
      budget: 80000,
      spent: 28000,
      crewMembers: ["4", "8"],
      gearItems: ["3", "6"],
      color: "bg-purple-500",
      description: "Sound recording and audio post",
      dailyCrewCost: 550, // Mike (350) + Sophie (200)
      dailyGearCost: 170, // Sound Devices (95) + Wireless Kit (75)
      weeklyBudget: 5040, // (550 + 170) * 7
      monthlyBudget: 21600,
    },
    {
      id: "grip",
      name: "Grip Department",
      category: "grip",
      head: "Tom Wilson",
      headId: "6",
      budget: 60000,
      spent: 18000,
      crewMembers: ["6"],
      gearItems: ["7", "8"],
      color: "bg-green-500",
      description: "Camera support and rigging",
      dailyCrewCost: 280, // Tom (280)
      dailyGearCost: 150, // Tripods and Support (150)
      weeklyBudget: 3010, // (280 + 150) * 7
      monthlyBudget: 12900,
    },
    {
      id: "post",
      name: "Post-Production",
      category: "post",
      head: "Emma Davis",
      headId: "3",
      budget: 90000,
      spent: 35000,
      crewMembers: ["3"],
      gearItems: ["9"],
      color: "bg-red-500",
      description: "Editing and post-production",
      dailyCrewCost: 300, // Emma (300)
      dailyGearCost: 200, // Edit Suite (200)
      weeklyBudget: 3500, // (300 + 200) * 7
      monthlyBudget: 15000,
    },
  ]

  useEffect(() => {
    if (MOCK_GEAR_STORE[projectId || "1"]) {
      setGearItems(MOCK_GEAR_STORE[projectId || "1"])
      return
    }

    const initialGear: GearItem[] = [
      {
        id: "1",
        name: "RED Komodo 6K",
        category: "camera",
        brand: "RED Digital Cinema",
        model: "Komodo 6K",
        serialNumber: "KMD001234",
        status: "checked-out",
        condition: "excellent",
        dailyRate: 850,
        replacementValue: 6000,
        location: "Set A - Stage 2",
        checkedOutTo: "Alex Kim",
        checkedOutDate: "2024-01-18",
        dueDate: "2024-01-30",
        description: "Professional 6K cinema camera with global shutter",
        specifications: {
          Sensor: "Super 35mm",
          Resolution: "6144 x 3240",
          "Frame Rates": "Up to 40fps at 6K",
          Mount: "RF Mount",
          Recording: "REDCODE RAW",
        },
        images: ["/placeholder.svg?height=300&width=400&text=RED+Komodo"],
        rentalSources: [
          {
            id: "1",
            company: "Camera House Rentals",
            contact: "Mike Rodriguez",
            phone: "(555) 123-4567",
            email: "mike@camerahouse.com",
            dailyRate: 800,
            weeklyRate: 4800,
            availability: "available",
            rating: 4.8,
            notes: "Includes lens package deal",
          },
        ],
        retailSources: [
          {
            id: "1",
            retailer: "B&H Photo",
            price: 5995,
            url: "https://bhphotovideo.com/red-komodo",
            inStock: true,
            rating: 4.7,
            shippingTime: "2-3 days",
          },
        ],
        lastMaintenance: "2024-01-01",
        nextMaintenance: "2024-04-01",
        notes: "Excellent condition. Includes cage and monitor.",
        departmentId: "camera",
      },
      {
        id: "2",
        name: "ARRI SkyPanel S60-C",
        category: "lighting",
        brand: "ARRI",
        model: "SkyPanel S60-C",
        serialNumber: "SKY567890",
        status: "available",
        condition: "good",
        dailyRate: 125,
        replacementValue: 3200,
        location: "Lighting Warehouse",
        description: "LED softlight with full color spectrum control",
        specifications: {
          Power: "400W",
          "Color Temperature": "2800K - 10000K",
          CRI: ">95",
          Control: "DMX, Art-Net, sACN",
          "Beam Angle": "115°",
        },
        images: ["/placeholder.svg?height=300&width=400&text=ARRI+SkyPanel"],
        rentalSources: [
          {
            id: "3",
            company: "Lighting Warehouse",
            contact: "Tom Wilson",
            phone: "(555) 456-7890",
            email: "tom@lightingwarehouse.com",
            dailyRate: 120,
            weeklyRate: 720,
            availability: "available",
            rating: 4.9,
            notes: "Bulk discounts available",
          },
        ],
        retailSources: [
          {
            id: "3",
            retailer: "ARRI Direct",
            price: 3195,
            url: "https://arri.com/skypanel-s60c",
            inStock: true,
            rating: 5.0,
            shippingTime: "1-2 days",
          },
        ],
        notes: "Recently serviced. Includes barn doors and diffusion.",
        departmentId: "lighting",
      },
      {
        id: "3",
        name: "Sound Devices 833",
        category: "audio",
        brand: "Sound Devices",
        model: "833",
        serialNumber: "SD833001",
        status: "available",
        condition: "excellent",
        dailyRate: 95,
        replacementValue: 4200,
        location: "Sound Cart - Unit B",
        description: "8-input/12-track portable mixer and recorder",
        specifications: {
          Inputs: "8 mic/line inputs",
          Tracks: "12-track recording",
          "Sample Rate": "Up to 192kHz",
          "Bit Depth": "32-bit float",
          Timecode: "Built-in generator/reader",
        },
        images: ["/placeholder.svg?height=300&width=400&text=Sound+Devices+833"],
        rentalSources: [
          {
            id: "4",
            company: "Audio Specialists",
            contact: "Emma Davis",
            phone: "(555) 234-5678",
            email: "emma@audiospec.com",
            dailyRate: 90,
            weeklyRate: 540,
            availability: "available",
            rating: 4.7,
            notes: "Includes wireless package",
          },
        ],
        retailSources: [
          {
            id: "4",
            retailer: "Sound Devices Store",
            price: 4199,
            url: "https://sounddevices.com/833",
            inStock: true,
            rating: 4.9,
            shippingTime: "Next day",
          },
        ],
        notes: "Perfect working condition. Includes carrying case.",
        departmentId: "audio",
      },
      // Additional gear items for other departments
      {
        id: "4",
        name: "Canon CN-E 24-70mm T2.95",
        category: "camera",
        brand: "Canon",
        model: "CN-E 24-70mm T2.95",
        serialNumber: "CNE24701",
        status: "available",
        condition: "excellent",
        dailyRate: 100,
        replacementValue: 8000,
        location: "Camera Dept Storage",
        description: "Professional cinema zoom lens",
        specifications: {
          "Focal Length": "24-70mm",
          "Max Aperture": "T2.95",
          Mount: "EF Mount",
          "Focus Ring": "300° rotation",
        },
        images: ["/placeholder.svg?height=300&width=400&text=Canon+Lens"],
        rentalSources: [],
        retailSources: [],
        notes: "Excellent for handheld work.",
        departmentId: "camera",
      },
      {
        id: "5",
        name: "Aputure 300d Mark II",
        category: "lighting",
        brand: "Aputure",
        model: "300d Mark II",
        serialNumber: "APT300D02",
        status: "checked-out",
        condition: "good",
        dailyRate: 100,
        replacementValue: 1200,
        location: "Set B",
        checkedOutTo: "Lisa Park",
        description: "Powerful LED light with Bowens mount",
        specifications: {
          Power: "300W",
          "Color Temperature": "5500K",
          CRI: "96+",
          Mount: "Bowens",
        },
        images: ["/placeholder.svg?height=300&width=400&text=Aputure+300d"],
        rentalSources: [],
        retailSources: [],
        notes: "Includes softbox and barn doors.",
        departmentId: "lighting",
      },
      {
        id: "6",
        name: "Sennheiser G4 Wireless Kit",
        category: "audio",
        brand: "Sennheiser",
        model: "EW 112P G4",
        serialNumber: "SEN112G401",
        status: "available",
        condition: "excellent",
        dailyRate: 75,
        replacementValue: 600,
        location: "Audio Storage",
        description: "Professional wireless microphone system",
        specifications: {
          Frequency: "A1: 470-516 MHz",
          Range: "Up to 100m",
          "Battery Life": "8 hours",
          Channels: "1680 tunable frequencies",
        },
        images: ["/placeholder.svg?height=300&width=400&text=Sennheiser+G4"],
        rentalSources: [],
        retailSources: [],
        notes: "Fresh batteries included.",
        departmentId: "audio",
      },
    ]

    if (projectId === "2") {
      initialGear[0].status = "available"; // Komodo available in project 2
      initialGear.push({
        id: "7",
        name: "GoPro Hero 11",
        category: "camera",
        brand: "GoPro",
        model: "Hero 11",
        serialNumber: "GP11001",
        status: "available",
        condition: "good",
        dailyRate: 50,
        replacementValue: 400,
        location: "Camera Bag 1",
        description: "Action camera",
        specifications: {},
        images: [],
        rentalSources: [],
        retailSources: [],
        notes: "",
        departmentId: "camera"
      });
    } else if (projectId === "3") {
      initialGear.pop(); // Remove Sennheiser
      initialGear[0].checkedOutTo = "Director";
    }

    MOCK_GEAR_STORE[projectId || "1"] = initialGear
    setGearItems(initialGear)
  }, [projectId])

  useEffect(() => {
    if (gearItems.length > 0 && projectId) {
      MOCK_GEAR_STORE[projectId] = gearItems
    }
  }, [gearItems, projectId])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "camera":
        return <Camera className="h-4 w-4" />
      case "audio":
        return <Mic className="h-4 w-4" />
      case "lighting":
        return <Lightbulb className="h-4 w-4" />
      case "grip":
        return <Settings className="h-4 w-4" />
      case "electrical":
        return <Zap className="h-4 w-4" />
      case "post":
        return <Monitor className="h-4 w-4" />
      case "transport":
        return <Package className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500"
      case "checked-out":
        return "bg-blue-500"
      case "maintenance":
        return "bg-yellow-500"
      case "damaged":
        return "bg-red-500"
      case "lost":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "excellent":
        return "text-green-400"
      case "good":
        return "text-blue-400"
      case "fair":
        return "text-yellow-400"
      case "poor":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  const toggleCardExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedCards(newExpanded)
  }

  const filteredItems = gearItems.filter((item) => {
    const matchesSearch = searchQuery
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true

    const matchesCategory = filters.category === "all" || item.category === filters.category
    const matchesStatus = filters.status === "all" || item.status === filters.status
    const matchesDepartment = filters.department === "all" || item.departmentId === filters.department

    return matchesSearch && matchesCategory && matchesStatus && matchesDepartment
  })

  const getDepartmentCrewMembers = (departmentId: string) => {
    return crewMembers.filter((member) => member.departmentId === departmentId)
  }

  const getDepartmentGearItems = (departmentId: string) => {
    return gearItems.filter((item) => item.departmentId === departmentId)
  }

  const GearCard = ({ item }: { item: GearItem }) => {
    const isExpanded = expandedCards.has(item.id)

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
        <div className="p-4 cursor-pointer" onClick={() => toggleCardExpansion(item.id)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                {getCategoryIcon(item.category)}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{item.name}</h3>
                <p className="text-white/60 text-xs">
                  {item.brand} • {item.model}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(item.status)}`}>
                {item.status.toUpperCase()}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-white/50" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/50" />
              )}
            </div>
          </div>

          {item.images.length > 0 && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
              <img src={item.images[0] || "/placeholder.svg"} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-white/50">Daily Rate:</span>
              <p className="text-white font-medium">${item.dailyRate}</p>
            </div>
            <div>
              <span className="text-white/50">Condition:</span>
              <p className={`font-medium capitalize ${getConditionColor(item.condition)}`}>{item.condition}</p>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-white/10">
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-white/50">Serial Number:</span>
                  <p className="text-white">{item.serialNumber}</p>
                </div>
                <div>
                  <span className="text-white/50">Location:</span>
                  <p className="text-white">{item.location}</p>
                </div>
                <div>
                  <span className="text-white/50">Replacement Value:</span>
                  <p className="text-white">${item.replacementValue.toLocaleString()}</p>
                </div>
                {item.checkedOutTo && (
                  <div>
                    <span className="text-white/50">Checked Out To:</span>
                    <p className="text-white">{item.checkedOutTo}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors">
                    <Brain className="h-3 w-3 text-purple-400" />
                    <span className="text-purple-400 text-xs">AI Suggest</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1 rounded hover:bg-white/10 transition-colors">
                    <Edit className="h-3 w-3 text-white/70" />
                  </button>
                  <button className="p-1 rounded hover:bg-white/10 transition-colors">
                    <Eye className="h-3 w-3 text-white/70" />
                  </button>
                  <button className="p-1 rounded hover:bg-white/10 transition-colors">
                    <Trash2 className="h-3 w-3 text-white/70" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const DepartmentCard = ({ department }: { department: Department }) => {
    const departmentCrew = getDepartmentCrewMembers(department.id)
    const departmentGear = getDepartmentGearItems(department.id)
    const budgetUsed = (department.spent / department.budget) * 100

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg ${department.color} flex items-center justify-center`}>
              {getCategoryIcon(department.category)}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{department.name}</h3>
              <p className="text-white/70 text-sm">{department.description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedDepartment(department)
              setShowDepartmentDetail(true)
            }}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            View Details
          </button>
        </div>

        {/* Budget Overview */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/70 text-sm">Budget Usage</span>
            <span className="text-white font-medium">
              ${department.spent.toLocaleString()} / ${department.budget.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${budgetUsed > 90 ? "bg-red-500" : budgetUsed > 70 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
            />
          </div>
          <p className="text-white/60 text-xs mt-1">{budgetUsed.toFixed(1)}% used</p>
        </div>

        {/* Daily Costs Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-white/70 text-xs">Daily Crew Cost</span>
            </div>
            <p className="text-white font-semibold">${department.dailyCrewCost}</p>
            <p className="text-white/60 text-xs">{departmentCrew.length} members</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-green-400" />
              <span className="text-white/70 text-xs">Daily Gear Cost</span>
            </div>
            <p className="text-white font-semibold">${department.dailyGearCost}</p>
            <p className="text-white/60 text-xs">{departmentGear.length} items</p>
          </div>
        </div>

        {/* Weekly/Monthly Projections */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-white/50 text-xs">Weekly Budget</span>
            <p className="text-white font-medium">${department.weeklyBudget.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-white/50 text-xs">Monthly Budget</span>
            <p className="text-white font-medium">${department.monthlyBudget.toLocaleString()}</p>
          </div>
        </div>

        {/* Department Head */}
        <div className="flex items-center justify-between pt-3 border-t border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {crewMembers.find((m) => m.id === department.headId)?.avatar || "?"}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{department.head}</p>
              <p className="text-white/60 text-xs">Department Head</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${crewMembers.find((m) => m.id === department.headId)?.status === "available" ? "bg-green-500" : crewMembers.find((m) => m.id === department.headId)?.status === "on-set" ? "bg-blue-500" : "bg-yellow-500"}`}
            />
            <span className="text-white/60 text-xs capitalize">
              {crewMembers.find((m) => m.id === department.headId)?.status?.replace("-", " ")}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gear & Department Management</h1>
          <p className="text-white/70">Manage equipment inventory and department budgets with integrated crew costs</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIAssistant(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            <Brain className="h-4 w-4" />
            AI Assistant
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Equipment
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Building className="h-4 w-4 text-blue-400" />
            <span className="text-white/70 text-xs">Departments</span>
          </div>
          <p className="text-white font-bold text-lg">{departments.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-green-400" />
            <span className="text-white/70 text-xs">Total Gear</span>
          </div>
          <p className="text-white font-bold text-lg">{gearItems.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="text-white/70 text-xs">Total Crew</span>
          </div>
          <p className="text-white font-bold text-lg">{crewMembers.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-yellow-400" />
            <span className="text-white/70 text-xs">Daily Total</span>
          </div>
          <p className="text-white font-bold text-lg">
            ${departments.reduce((sum, dept) => sum + dept.dailyCrewCost + dept.dailyGearCost, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-white/70 text-xs">Weekly Total</span>
          </div>
          <p className="text-white font-bold text-lg">
            ${departments.reduce((sum, dept) => sum + dept.weeklyBudget, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-red-400" />
            <span className="text-white/70 text-xs">Budget Used</span>
          </div>
          <p className="text-white font-bold text-lg">
            {(
              (departments.reduce((sum, dept) => sum + dept.spent, 0) /
                departments.reduce((sum, dept) => sum + dept.budget, 0)) *
              100
            ).toFixed(1)}
            %
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/70" />
            <select
              value={filters.department}
              onChange={(e) => {
                // This would be handled by parent component
                console.log("Department filter:", e.target.value)
              }}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20">
            <button
              onClick={() => setViewMode("departments")}
              className={`px-3 py-2 rounded-md transition-colors ${viewMode === "departments" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                }`}
            >
              <Building className="h-4 w-4" />
            </button>
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
        </div>
      </div>

      {/* Content */}
      {viewMode === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>
      )}

      {viewMode === "grid" && (
        <div
          className={`grid gap-4 ${gridColumns === 2
            ? "grid-cols-1 md:grid-cols-2"
            : gridColumns === 3
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : gridColumns === 4
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            }`}
        >
          {filteredItems.map((item) => (
            <GearCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{item.name}</h3>
                    <p className="text-white/70 text-sm">
                      {item.brand} • {item.model} • {departments.find((d) => d.id === item.departmentId)?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium">${item.dailyRate}/day</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(item.status)}`}
                  >
                    {item.status.replace("-", " ").toUpperCase()}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <Edit className="h-4 w-4 text-white/70" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <Eye className="h-4 w-4 text-white/70" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Department Detail Modal */}
      {selectedDepartment && showDepartmentDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl ${selectedDepartment.color} flex items-center justify-center`}>
                    {getCategoryIcon(selectedDepartment.category)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{selectedDepartment.name}</h2>
                    <p className="text-white/70">{selectedDepartment.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDepartmentDetail(false)
                    setSelectedDepartment(null)
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              {/* Budget Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white/70 text-sm mb-2">Total Budget</h3>
                  <p className="text-white font-bold text-2xl">${selectedDepartment.budget.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white/70 text-sm mb-2">Spent</h3>
                  <p className="text-white font-bold text-2xl">${selectedDepartment.spent.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white/70 text-sm mb-2">Remaining</h3>
                  <p className="text-white font-bold text-2xl">
                    ${(selectedDepartment.budget - selectedDepartment.spent).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white/70 text-sm mb-2">Daily Total</h3>
                  <p className="text-white font-bold text-2xl">
                    ${selectedDepartment.dailyCrewCost + selectedDepartment.dailyGearCost}
                  </p>
                </div>
              </div>

              {/* Crew Members */}
              <div className="mb-6">
                <h3 className="text-white font-semibold text-lg mb-4">
                  Crew Members ({getDepartmentCrewMembers(selectedDepartment.id).length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getDepartmentCrewMembers(selectedDepartment.id).map((member) => (
                    <div key={member.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {member.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{member.name}</h4>
                          <p className="text-white/70 text-sm">{member.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">${member.dailyRate}/day</p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(member.status)}`}
                          >
                            {member.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gear Items */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-4">
                  Equipment ({getDepartmentGearItems(selectedDepartment.id).length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getDepartmentGearItems(selectedDepartment.id).map((item) => (
                    <div key={item.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm">{item.name}</h4>
                          <p className="text-white/70 text-xs">
                            {item.brand} {item.model}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">${item.dailyRate}/day</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(item.status)}`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-purple-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">AI Department Assistant</h2>
                    <p className="text-white/70">Get intelligent department and budget recommendations</p>
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
                  <label className="text-white/70 text-sm">What do you need help with?</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/50 resize-none mt-2"
                    rows={3}
                    placeholder="e.g., 'Optimize camera department budget' or 'Suggest crew assignments for lighting department'"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-green-400" />
                      <span className="text-white font-medium text-sm">Budget Optimization</span>
                    </div>
                    <p className="text-white/60 text-xs">Optimize department budgets and resource allocation</p>
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">Crew Assignment</span>
                    </div>
                    <p className="text-white/60 text-xs">Suggest optimal crew assignments across departments</p>
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-purple-400" />
                      <span className="text-white font-medium text-sm">Equipment Planning</span>
                    </div>
                    <p className="text-white/60 text-xs">Plan equipment needs and rental schedules</p>
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-yellow-400" />
                      <span className="text-white font-medium text-sm">Cost Analysis</span>
                    </div>
                    <p className="text-white/60 text-xs">Analyze costs and identify savings opportunities</p>
                  </button>
                </div>

                <button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-3 rounded-lg transition-all duration-300 font-medium">
                  Get AI Recommendations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
