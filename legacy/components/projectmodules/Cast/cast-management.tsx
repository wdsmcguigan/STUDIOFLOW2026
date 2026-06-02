"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Edit, Phone, Mail, Calendar, CheckCircle, AlertTriangle, X, Camera, Download } from "lucide-react"

interface CastMember {
  id: number
  name: string
  character: string
  role: string
  status: string
  availability: string
  phone?: string
  email?: string
  agent?: string
  headshot?: string
  resume?: string
  notes?: string
  scenes?: string[]
  wardrobe?: string[]
  callTimes?: { date: string; time: string; location: string }[]
}

interface CastManagementProps {
  searchQuery?: string
  filters?: {
    role: string
    status: string
    availability: string
  }
  projectId?: string
}

const MOCK_CAST_STORE: Record<string, CastMember[]> = {}

export default function CastManagement({
  searchQuery = "",
  filters = { role: "all", status: "all", availability: "all" },
  projectId = "1",
}: CastManagementProps) {
  const [selectedMember, setSelectedMember] = useState<CastMember | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [castMembers, setCastMembers] = useState<CastMember[]>([])

  useEffect(() => {
    if (MOCK_CAST_STORE[projectId]) {
      setCastMembers(MOCK_CAST_STORE[projectId])
      return
    }

    const initialCast: CastMember[] = [
      {
        id: 1,
        name: "John Doe",
        character: "Hero",
        role: "lead",
        status: "active",
        availability: "available",
        phone: "(555) 123-4567",
        email: "john.doe@email.com",
        agent: "CAA - Sarah Johnson",
        headshot: "/placeholder.svg?height=300&width=200&text=John+Doe",
        scenes: ["Scene 1", "Scene 5", "Scene 12"],
        wardrobe: ["Hero Costume", "Casual Wear", "Formal Suit"],
        callTimes: [
          { date: "2024-01-20", time: "6:00 AM", location: "Studio A" },
          { date: "2024-01-22", time: "8:00 AM", location: "Location B" },
        ],
        notes: "Experienced actor with strong action background.",
      },
      {
        id: 2,
        name: "Jane Smith",
        character: "Sidekick",
        role: "supporting",
        status: "inactive",
        availability: "unavailable",
        phone: "(555) 987-6543",
        email: "jane.smith@email.com",
        headshot: "/placeholder.svg?height=300&width=200&text=Jane+Smith",
        scenes: ["Scene 2", "Scene 8"],
        wardrobe: ["Sidekick Outfit", "Street Clothes"],
        notes: "Great chemistry with lead actor.",
      },
      {
        id: 3,
        name: "Peter Jones",
        character: "Villain",
        role: "antagonist",
        status: "active",
        availability: "available",
        phone: "(555) 456-7890",
        email: "peter.jones@email.com",
        headshot: "/placeholder.svg?height=300&width=200&text=Peter+Jones",
        scenes: ["Scene 3", "Scene 9", "Scene 15"],
        wardrobe: ["Villain Costume", "Business Suit"],
        notes: "Method actor, requires preparation time.",
      },
      {
        id: 4,
        name: "Alice Brown",
        character: "Love Interest",
        role: "supporting",
        status: "active",
        availability: "available",
        phone: "(555) 321-0987",
        email: "alice.brown@email.com",
        headshot: "/placeholder.svg?height=300&width=200&text=Alice+Brown",
        scenes: ["Scene 4", "Scene 11"],
        wardrobe: ["Evening Gown", "Casual Dress"],
        notes: "Professional dancer, great for choreographed scenes.",
      },
      {
        id: 5,
        name: "Bob Williams",
        character: "Mentor",
        role: "supporting",
        status: "inactive",
        availability: "unavailable",
        phone: "(555) 654-3210",
        email: "bob.williams@email.com",
        headshot: "/placeholder.svg?height=300&width=200&text=Bob+Williams",
        scenes: ["Scene 6", "Scene 13"],
        wardrobe: ["Wise Man Robes", "Modern Clothes"],
        notes: "Veteran actor with 30+ years experience.",
      },
    ]

    if (projectId === "2") {
      initialCast.shift();
      initialCast[0].name = "Michael Jordan";
    } else if (projectId === "3") {
      initialCast.pop();
      initialCast[0].character = "Surfer Dude";
    }

    MOCK_CAST_STORE[projectId] = initialCast;
    setCastMembers(initialCast);

  }, [projectId])

  useEffect(() => {
    if (castMembers.length > 0 && projectId) {
      MOCK_CAST_STORE[projectId] = castMembers
    }
  }, [castMembers, projectId])

  const filteredCast = castMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.character.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filters.role === "all" || member.role === filters.role
    const matchesStatus = filters.status === "all" || member.status === filters.status
    const matchesAvailability = filters.availability === "all" || member.availability === filters.availability

    return matchesSearch && matchesRole && matchesStatus && matchesAvailability
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "inactive":
        return "bg-red-500"
      case "pending":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "available":
        return "text-green-400"
      case "unavailable":
        return "text-red-400"
      case "limited":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Cast Management</h1>
          <p className="text-white/70">Manage cast members, schedules, and contact information</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Cast Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{castMembers.length}</p>
              <p className="text-white/70 text-sm">Total Cast</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{castMembers.filter((m) => m.status === "active").length}</p>
              <p className="text-white/70 text-sm">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {castMembers.filter((m) => m.availability === "available").length}
              </p>
              <p className="text-white/70 text-sm">Available</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {castMembers.filter((m) => m.availability === "limited").length}
              </p>
              <p className="text-white/70 text-sm">Limited</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cast Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCast.map((member) => (
          <div
            key={member.id}
            className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedMember(member)}
          >
            <div className="relative h-48">
              <img
                src={member.headshot || "/placeholder.svg"}
                alt={member.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(member.status)}`}
                >
                  {member.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-1">{member.name}</h3>
              <p className="text-white/70 text-sm mb-2">as {member.character}</p>
              <p className="text-white/60 text-xs mb-3 capitalize">{member.role}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Availability:</span>
                  <span className={`font-medium capitalize ${getAvailabilityColor(member.availability)}`}>
                    {member.availability}
                  </span>
                </div>
                {member.scenes && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Scenes:</span>
                    <span className="text-white">{member.scenes.length}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-xs">Contact</span>
                  <div className="flex gap-1">
                    {member.phone && (
                      <button className="p-1 rounded hover:bg-white/10 transition-colors">
                        <Phone className="h-3 w-3 text-white/70" />
                      </button>
                    )}
                    {member.email && (
                      <button className="p-1 rounded hover:bg-white/10 transition-colors">
                        <Mail className="h-3 w-3 text-white/70" />
                      </button>
                    )}
                    <button className="p-1 rounded hover:bg-white/10 transition-colors">
                      <Calendar className="h-3 w-3 text-white/70" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cast Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedMember.name}</h2>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <img
                    src={selectedMember.headshot || "/placeholder.svg"}
                    alt={selectedMember.name}
                    className="w-full rounded-lg mb-4"
                  />
                  <div className="space-y-3">
                    <div>
                      <span className="text-white/70 text-sm">Character:</span>
                      <p className="text-white font-medium">{selectedMember.character}</p>
                    </div>
                    <div>
                      <span className="text-white/70 text-sm">Role:</span>
                      <p className="text-white font-medium capitalize">{selectedMember.role}</p>
                    </div>
                    <div>
                      <span className="text-white/70 text-sm">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedMember.status)}`}
                      >
                        {selectedMember.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/70 text-sm">Availability:</span>
                      <p className={`font-medium capitalize ${getAvailabilityColor(selectedMember.availability)}`}>
                        {selectedMember.availability}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-white font-medium mb-3">Contact Information</h3>
                    <div className="space-y-2">
                      {selectedMember.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-white/70" />
                          <span className="text-white">{selectedMember.phone}</span>
                        </div>
                      )}
                      {selectedMember.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-white/70" />
                          <span className="text-white">{selectedMember.email}</span>
                        </div>
                      )}
                      {selectedMember.agent && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-white/70" />
                          <span className="text-white">{selectedMember.agent}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedMember.scenes && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Assigned Scenes</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedMember.scenes.map((scene, index) => (
                          <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                            {scene}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMember.wardrobe && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Wardrobe</h3>
                      <div className="space-y-1">
                        {selectedMember.wardrobe.map((item, index) => (
                          <div key={index} className="text-white/80 text-sm bg-white/5 rounded px-2 py-1">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMember.callTimes && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Upcoming Call Times</h3>
                      <div className="space-y-2">
                        {selectedMember.callTimes.map((call, index) => (
                          <div key={index} className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">{call.date}</p>
                                <p className="text-white/70 text-sm">{call.time}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-white/70 text-sm">{call.location}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMember.notes && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Notes</h3>
                      <p className="text-white/80 text-sm bg-white/5 rounded-lg p-3">{selectedMember.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex gap-3 flex-wrap">
                  <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </button>
                  <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </button>
                  <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Camera className="h-4 w-4" />
                    View Headshots
                  </button>
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                    Download Resume
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
