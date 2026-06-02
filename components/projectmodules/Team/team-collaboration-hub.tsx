"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Filter,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  Star,
  Eye,
  X,
  ChevronDown,
  Brain,
  Zap,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Grid3X3,
  List,
  DollarSign,
  Package,
  Building,
  Edit,
  UserPlus,
} from "lucide-react"

interface CrewMember {
  id: string
  name: string
  role: string
  department: string
  departmentId: string
  email: string
  phone: string
  avatar: string
  status: "available" | "busy" | "on-set" | "off-duty" | "unavailable"
  location: string
  currentProject: string
  experience: number
  rating: number
  skills: string[]
  certifications: string[]
  hourlyRate: number
  dailyRate: number
  availability: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  lastActive: string
  totalHours: number
  completedProjects: number
  notes: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  equipment: string[]
  languages: string[]
  union: string
  startDate: string
  endDate?: string
}

interface CrewDepartment {
  id: string
  name: string
  category: "camera" | "audio" | "lighting" | "grip" | "electrical" | "post" | "transport" | "direction"
  head: string
  headId: string
  members: string[]
  budget: number
  spent: number
  color: string
  description: string
  dailyCrewCost: number
  gearBudget: number
  weeklyBudget: number
  monthlyBudget: number
}

interface AIInsight {
  type: "optimization" | "alert" | "suggestion" | "prediction"
  title: string
  description: string
  impact: "high" | "medium" | "low"
  action?: string
}



const MOCK_CREW_STORE: Record<string, CrewMember[]> = {}

export default function TeamCollaborationHub({ searchQuery = "", projectId = "1" }: { searchQuery?: string; projectId?: string }) {
  const [viewMode, setViewMode] = useState<"grid" | "list" | "departments">("departments")
  const [gridSize, setGridSize] = useState(3)
  const [filterDepartment, setFilterDepartment] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<CrewDepartment | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDepartmentDetail, setShowDepartmentDetail] = useState(false)
  const [showAIInsights, setShowAIInsights] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])

  // Enhanced crew data with department assignments and rates
  useEffect(() => {
    if (MOCK_CREW_STORE[projectId]) {
      setCrewMembers(MOCK_CREW_STORE[projectId])
      return
    }

    const initialCrewMembers: CrewMember[] = [
      {
        id: "1",
        name: "Sarah Chen",
        role: "Director",
        department: "Direction",
        departmentId: "direction",
        email: "sarah.chen@midnightchronicles.com",
        phone: "+1 (555) 123-4567",
        avatar: "SC",
        status: "on-set",
        location: "Stage A",
        currentProject: "Midnight Chronicles",
        experience: 12,
        rating: 4.9,
        skills: ["Narrative Direction", "Actor Coaching", "Visual Storytelling", "Post Supervision"],
        certifications: ["DGA Member", "Film School Graduate"],
        hourlyRate: 62.5,
        dailyRate: 500,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        lastActive: "5 minutes ago",
        totalHours: 320,
        completedProjects: 8,
        notes: "Prefers early morning shoots. Excellent with child actors.",
        emergencyContact: {
          name: "Michael Chen",
          phone: "+1 (555) 987-6543",
          relationship: "Spouse",
        },
        equipment: ["Director's Monitor", "Megaphone", "Script Binder"],
        languages: ["English", "Mandarin"],
        union: "DGA",
        startDate: "2024-01-15",
      },
      {
        id: "2",
        name: "Alex Kim",
        role: "Director of Photography",
        department: "Camera",
        departmentId: "camera",
        email: "alex.kim@midnightchronicles.com",
        phone: "+1 (555) 234-5678",
        avatar: "AK",
        status: "available",
        location: "Equipment Room",
        currentProject: "Midnight Chronicles",
        experience: 10,
        rating: 4.8,
        skills: ["Cinematography", "Lighting Design", "Color Theory", "Camera Operation"],
        certifications: ["ASC Associate", "RED Certified"],
        hourlyRate: 50,
        dailyRate: 400,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        lastActive: "15 minutes ago",
        totalHours: 280,
        completedProjects: 15,
        notes: "Specializes in low-light cinematography. Owns RED camera package.",
        emergencyContact: {
          name: "Lisa Kim",
          phone: "+1 (555) 876-5432",
          relationship: "Sister",
          // @ts-ignore
        },
        equipment: ["RED Camera", "Lenses", "Monitor", "Tripod"],
        languages: ["English", "Korean"],
        union: "IATSE Local 600",
        startDate: "2024-01-20",
      },
      {
        id: "3",
        name: "Emma Davis",
        role: "Editor",
        department: "Post-Production",
        departmentId: "post",
        email: "emma.davis@midnightchronicles.com",
        phone: "+1 (555) 345-6789",
        avatar: "ED",
        status: "busy",
        location: "Edit Suite 1",
        currentProject: "Midnight Chronicles",
        experience: 8,
        rating: 4.7,
        skills: ["Avid Media Composer", "DaVinci Resolve", "Sound Design", "Color Correction"],
        certifications: ["Avid Certified", "Adobe Certified Expert"],
        hourlyRate: 37.5,
        dailyRate: 300,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        lastActive: "2 hours ago",
        totalHours: 450,
        completedProjects: 12,
        notes: "Fast turnaround on rough cuts. Excellent at action sequences.",
        emergencyContact: {
          name: "Robert Davis",
          phone: "+1 (555) 765-4321",
          relationship: "Father",
        },
        equipment: ["Avid System", "Speakers", "Color Monitor"],
        languages: ["English", "Spanish"],
        union: "IATSE Local 700",
        startDate: "2024-01-10",
      },
      {
        id: "4",
        name: "Mike Rodriguez",
        role: "Sound Mixer",
        department: "Audio",
        departmentId: "audio",
        email: "mike.rodriguez@midnightchronicles.com",
        phone: "+1 (555) 456-7890",
        avatar: "MR",
        status: "on-set",
        location: "Stage A",
        currentProject: "Midnight Chronicles",
        experience: 15,
        rating: 4.9,
        skills: ["Location Sound", "Boom Operation", "Wireless Systems", "Post Audio"],
        certifications: ["CAS Member", "Zaxcom Certified"],
        hourlyRate: 43.75,
        dailyRate: 350,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        lastActive: "10 minutes ago",
        totalHours: 380,
        completedProjects: 20,
        notes: "Expert in challenging acoustic environments. Owns full sound package.",
        emergencyContact: {
          name: "Maria Rodriguez",
          phone: "+1 (555) 654-3210",
          relationship: "Wife",
        },
        equipment: ["Sound Mixer", "Boom Poles", "Wireless Mics", "Headphones"],
        languages: ["English", "Spanish"],
        union: "IATSE Local 695",
        startDate: "2024-01-18",
      },
      {
        id: "5",
        name: "Lisa Park",
        role: "Gaffer",
        department: "Lighting",
        departmentId: "lighting",
        email: "lisa.park@midnightchronicles.com",
        phone: "+1 (555) 567-8901",
        avatar: "LP",
        status: "available",
        location: "Lighting Truck",
        currentProject: "Midnight Chronicles",
        experience: 12,
        rating: 4.8,
        skills: ["Lighting Design", "Electrical", "LED Systems", "Rigging"],
        certifications: ["IATSE Electrician", "OSHA Certified"],
        hourlyRate: 40,
        dailyRate: 320,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        lastActive: "30 minutes ago",
        totalHours: 290,
        completedProjects: 18,
        notes: "Innovative with LED technology. Safety-focused approach.",
        emergencyContact: {
          name: "David Park",
          phone: "+1 (555) 543-2109",
          relationship: "Brother",
        },
        equipment: ["LED Panels", "Cables", "Stands", "Meters"],
        languages: ["English", "Korean"],
        union: "IATSE Local 728",
        startDate: "2024-01-22",
      },
      {
        id: "6",
        name: "Tom Wilson",
        role: "Key Grip",
        department: "Grip",
        departmentId: "grip",
        email: "tom.wilson@midnightchronicles.com",
        phone: "+1 (555) 678-9012",
        avatar: "TW",
        status: "busy",
        location: "Production Office",
        currentProject: "Midnight Chronicles",
        experience: 14,
        rating: 4.7,
        skills: ["Rigging", "Camera Support", "Safety", "Equipment Maintenance"],
        certifications: ["IATSE Grip", "Safety Certified"],
        hourlyRate: 35,
        dailyRate: 280,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
        },
        lastActive: "1 hour ago",
        totalHours: 420,
        completedProjects: 25,
        notes: "Excellent at rigging complex setups. Very safety-conscious.",
        emergencyContact: {
          name: "Sarah Wilson",
          phone: "+1 (555) 432-1098",
          relationship: "Wife",
        },
        equipment: ["Grip Truck", "C-Stands", "Sandbags", "Clamps"],
        languages: ["English"],
        union: "IATSE Local 80",
        startDate: "2024-01-12",
      },
      {
        id: "7",
        name: "Jake Martinez",
        role: "Camera Operator",
        department: "Camera",
        departmentId: "camera",
        email: "jake.martinez@midnightchronicles.com",
        phone: "+1 (555) 789-0123",
        avatar: "JM",
        status: "available",
        location: "Camera Prep",
        currentProject: "Midnight Chronicles",
        experience: 6,
        rating: 4.5,
        skills: ["Steadicam", "Handheld", "Remote Heads", "Focus Pulling"],
        certifications: ["Steadicam Certified", "Remote Head Operator"],
        hourlyRate: 37.5,
        dailyRate: 300,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        lastActive: "45 minutes ago",
        totalHours: 180,
        completedProjects: 8,
        notes: "Excellent steadicam work. Quick setup times.",
        emergencyContact: {
          name: "Carmen Martinez",
          phone: "+1 (555) 321-0987",
          relationship: "Mother",
        },
        equipment: ["Steadicam", "Wireless Follow Focus", "Monitor"],
        languages: ["English", "Spanish"],
        union: "IATSE Local 600",
        startDate: "2024-01-25",
      },
      {
        id: "8",
        name: "Sophie Brown",
        role: "Boom Operator",
        department: "Audio",
        departmentId: "audio",
        email: "sophie.brown@midnightchronicles.com",
        phone: "+1 (555) 890-1234",
        avatar: "SB",
        status: "on-set",
        location: "Stage A",
        currentProject: "Midnight Chronicles",
        experience: 4,
        rating: 4.3,
        skills: ["Boom Operation", "Wireless Systems", "Sound Mixing", "Location Recording"],
        certifications: ["Audio Engineering Certificate"],
        hourlyRate: 25,
        dailyRate: 200,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        lastActive: "20 minutes ago",
        totalHours: 150,
        completedProjects: 5,
        notes: "Great ear for dialogue. Very reliable and punctual.",
        emergencyContact: {
          name: "James Brown",
          phone: "+1 (555) 210-9876",
          relationship: "Father",
        },
        equipment: ["Boom Poles", "Windscreens", "Headphones"],
        languages: ["English", "French"],
        union: "IATSE Local 695",
        startDate: "2024-02-01",
      },
    ]

    if (projectId === "2") {
      initialCrewMembers.pop();
      initialCrewMembers[0].role = "Senior Director";
    } else if (projectId === "3") {
      initialCrewMembers.shift();
    }

    MOCK_CREW_STORE[projectId] = initialCrewMembers;
    setCrewMembers(initialCrewMembers);
  }, [projectId])

  useEffect(() => {
    if (crewMembers.length > 0 && projectId) {
      MOCK_CREW_STORE[projectId] = crewMembers;
    }
  }, [crewMembers, projectId])

  // Enhanced departments with integrated budget tracking
  const departments: CrewDepartment[] = [
    {
      id: "direction",
      name: "Direction",
      category: "direction",
      head: "Sarah Chen",
      headId: "1",
      members: ["1"],
      budget: 150000,
      spent: 45000,
      color: "bg-blue-500",
      description: "Creative direction and vision",
      dailyCrewCost: 500,
      gearBudget: 25000,
      weeklyBudget: 3500,
      monthlyBudget: 15000,
    },
    {
      id: "camera",
      name: "Camera Department",
      category: "camera",
      head: "Alex Kim",
      headId: "2",
      members: ["2", "7"],
      budget: 120000,
      spent: 42000,
      color: "bg-green-500",
      description: "Cinematography and camera operations",
      dailyCrewCost: 700, // Alex (400) + Jake (300)
      gearBudget: 45000,
      weeklyBudget: 4900,
      monthlyBudget: 21000,
    },
    {
      id: "audio",
      name: "Audio Department",
      category: "audio",
      head: "Mike Rodriguez",
      headId: "4",
      members: ["4", "8"],
      budget: 80000,
      spent: 28000,
      color: "bg-purple-500",
      description: "Sound recording and audio post",
      dailyCrewCost: 550, // Mike (350) + Sophie (200)
      gearBudget: 30000,
      weeklyBudget: 3850,
      monthlyBudget: 16500,
    },
    {
      id: "lighting",
      name: "Lighting Department",
      category: "lighting",
      head: "Lisa Park",
      headId: "5",
      members: ["5"],
      budget: 100000,
      spent: 35000,
      color: "bg-yellow-500",
      description: "Lighting design and electrical",
      dailyCrewCost: 320,
      gearBudget: 40000,
      weeklyBudget: 2240,
      monthlyBudget: 9600,
    },
    {
      id: "grip",
      name: "Grip Department",
      category: "grip",
      head: "Tom Wilson",
      headId: "6",
      members: ["6"],
      budget: 60000,
      spent: 18000,
      color: "bg-red-500",
      description: "Camera support and rigging",
      dailyCrewCost: 280,
      gearBudget: 25000,
      weeklyBudget: 1960,
      monthlyBudget: 8400,
    },
    {
      id: "post",
      name: "Post-Production",
      category: "post",
      head: "Emma Davis",
      headId: "3",
      members: ["3"],
      budget: 90000,
      spent: 32000,
      color: "bg-indigo-500",
      description: "Editing and post-production",
      dailyCrewCost: 300,
      gearBudget: 35000,
      weeklyBudget: 2100,
      monthlyBudget: 9000,
    },
  ]

  // AI Insights with department-specific recommendations
  const aiInsights: AIInsight[] = [
    {
      type: "optimization",
      title: "Department Budget Reallocation",
      description:
        "Camera department is 15% under budget while Lighting is 8% over. Suggest reallocating $12K for optimal resource distribution.",
      impact: "high",
      action: "Reallocate budget",
    },
    {
      type: "alert",
      title: "Crew Overtime Alert",
      description:
        "Mike Rodriguez and Sophie Brown approaching 6-hour mark. Schedule meal break within 30 minutes to maintain union compliance.",
      impact: "high",
      action: "Schedule break",
    },
    {
      type: "suggestion",
      title: "Cross-Department Efficiency",
      description:
        "Jake Martinez (Camera) has grip experience. Could assist Grip department during downtime, saving $280/day on additional crew.",
      impact: "medium",
      action: "Cross-train crew",
    },
    {
      type: "prediction",
      title: "Equipment Utilization Forecast",
      description:
        "Based on schedule, Camera department will need 2 additional operators next week. Budget impact: $600/day.",
      impact: "medium",
      action: "Plan hiring",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500"
      case "busy":
        return "bg-yellow-500"
      case "on-set":
        return "bg-blue-500"
      case "off-duty":
        return "bg-gray-500"
      case "unavailable":
        return "bg-red-500"
      default:
        return "bg-gray-500"
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

  const getDepartmentIcon = (category: string) => {
    switch (category) {
      case "camera":
        return "📹"
      case "audio":
        return "🎤"
      case "lighting":
        return "💡"
      case "grip":
        return "🔧"
      case "post":
        return "💻"
      case "direction":
        return "🎬"
      default:
        return "👥"
    }
  }

  const filteredMembers = crewMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesDepartment = filterDepartment === "all" || member.departmentId === filterDepartment
    const matchesStatus = filterStatus === "all" || member.status === filterStatus

    return matchesSearch && matchesDepartment && matchesStatus
  })

  const getDepartmentMembers = (departmentId: string) => {
    return crewMembers.filter((member) => member.departmentId === departmentId)
  }

  const renderCrewCard = (member: CrewMember, isExpanded: boolean) => (
    <div
      key={member.id}
      className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 ${isExpanded ? "row-span-2" : ""
        }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {member.avatar}
            </div>
            <div>
              <h3 className="text-white font-semibold">{member.name}</h3>
              <p className="text-white/70 text-sm">{member.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(member.status)}`}>
              {member.status.replace("-", " ").toUpperCase()}
            </span>
            <button
              onClick={() => setExpandedCard(isExpanded ? null : member.id)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Department:</span>
            <span className="text-white">{member.department}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Daily Rate:</span>
            <span className="text-white font-medium">${member.dailyRate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Location:</span>
            <span className="text-white">{member.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Experience:</span>
            <span className="text-white">{member.experience} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Rating:</span>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-white">{member.rating}</span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/20 space-y-3">
            <div>
              <h4 className="text-white font-medium mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1">
                {member.skills.slice(0, 4).map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Contact</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-white/70" />
                  <span className="text-white/80">{member.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-white/70" />
                  <span className="text-white/80">{member.phone}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm transition-colors">
                Message
              </button>
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm transition-colors">
                Call
              </button>
            </div>
          </div>
        )}

        {!isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs">{member.lastActive}</span>
              <div className="flex gap-1">
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <MessageSquare className="h-3 w-3 text-white/70" />
                </button>
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <Phone className="h-3 w-3 text-white/70" />
                </button>
                <button className="p-1 rounded hover:bg-white/10 transition-colors">
                  <Eye className="h-3 w-3 text-white/70" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const DepartmentCard = ({ department }: { department: CrewDepartment }) => {
    const departmentMembers = getDepartmentMembers(department.id)
    const budgetUsed = (department.spent / department.budget) * 100

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg ${department.color} flex items-center justify-center text-2xl`}>
              {getDepartmentIcon(department.category)}
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

        {/* Cost Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-white/70 text-xs">Daily Crew Cost</span>
            </div>
            <p className="text-white font-semibold">${department.dailyCrewCost}</p>
            <p className="text-white/60 text-xs">{departmentMembers.length} members</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-green-400" />
              <span className="text-white/70 text-xs">Gear Budget</span>
            </div>
            <p className="text-white font-semibold">${department.gearBudget.toLocaleString()}</p>
            <p className="text-white/60 text-xs">Equipment allocation</p>
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

        {/* Department Head & Members */}
        <div className="pt-3 border-t border-white/20">
          <div className="flex items-center justify-between mb-3">
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

          {/* Team Members Preview */}
          <div className="flex -space-x-2">
            {departmentMembers.slice(0, 4).map((member) => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white/20"
                title={member.name}
              >
                {member.avatar}
              </div>
            ))}
            {departmentMembers.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-medium border-2 border-white/20">
                +{departmentMembers.length - 4}
              </div>
            )}
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
          <h1 className="text-3xl font-bold text-white mb-2">Team & Department Management</h1>
          <p className="text-white/70">Manage crew assignments, department budgets, and team collaboration</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Crew Member
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-white/70">Total Crew</span>
          </div>
          <p className="text-white font-medium text-sm">{crewMembers.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Building className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white/70">Departments</span>
          </div>
          <p className="text-white font-medium text-sm">{departments.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-xs text-white/70">On Set</span>
          </div>
          <p className="text-white font-medium text-sm">{crewMembers.filter((m) => m.status === "on-set").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-white/70">Available</span>
          </div>
          <p className="text-white font-medium text-sm">{crewMembers.filter((m) => m.status === "available").length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="text-xs text-white/70">Daily Total</span>
          </div>
          <p className="text-white font-medium text-sm">
            ${departments.reduce((sum, dept) => sum + dept.dailyCrewCost, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-white/70">Avg Rating</span>
          </div>
          <p className="text-white font-medium text-sm">
            {(crewMembers.reduce((sum, m) => sum + m.rating, 0) / crewMembers.length).toFixed(1)}
          </p>
        </div>
      </div>

      {/* AI Insights */}
      {showAIInsights && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">AI Department Intelligence</h2>
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
                  {insight.type === "optimization" && <Zap className="h-4 w-4 text-blue-400" />}
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

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/70" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="on-set">On Set</option>
            <option value="off-duty">Off Duty</option>
            <option value="unavailable">Unavailable</option>
          </select>
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
      {viewMode === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>
      )}

      {viewMode === "grid" && (
        <div
          className={`grid gap-4 ${gridSize === 2 ? "grid-cols-2" : gridSize === 3 ? "grid-cols-3" : gridSize === 4 ? "grid-cols-4" : "grid-cols-5"}`}
        >
          {filteredMembers.map((member) => renderCrewCard(member, expandedCard === member.id))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{member.name}</h3>
                    <p className="text-white/70 text-sm">
                      {member.role} • {member.department} • ${member.dailyRate}/day
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(member.status)}`}
                  >
                    {member.status.replace("-", " ").toUpperCase()}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <MessageSquare className="h-4 w-4 text-white/70" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <Phone className="h-4 w-4 text-white/70" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <Edit className="h-4 w-4 text-white/70" />
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
                  <div
                    className={`w-16 h-16 rounded-xl ${selectedDepartment.color} flex items-center justify-center text-3xl`}
                  >
                    {getDepartmentIcon(selectedDepartment.category)}
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
                  <h3 className="text-white/70 text-sm mb-2">Daily Crew Cost</h3>
                  <p className="text-white font-bold text-2xl">${selectedDepartment.dailyCrewCost}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white/70 text-sm mb-2">Gear Budget</h3>
                  <p className="text-white font-bold text-2xl">${selectedDepartment.gearBudget.toLocaleString()}</p>
                </div>
              </div>

              {/* Department Members */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-4">
                  Department Members ({getDepartmentMembers(selectedDepartment.id).length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getDepartmentMembers(selectedDepartment.id).map((member) => (
                    <div key={member.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {member.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{member.name}</h4>
                          <p className="text-white/70 text-sm">{member.role}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`w-2 h-2 rounded-full ${getStatusColor(member.status).replace("bg-", "bg-")}`}
                            />
                            <span className="text-white/60 text-xs capitalize">{member.status.replace("-", " ")}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">${member.dailyRate}/day</p>
                          <p className="text-white/60 text-xs">${member.hourlyRate}/hr</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60 text-xs">Experience: {member.experience} years</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-white/60 text-xs">{member.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
