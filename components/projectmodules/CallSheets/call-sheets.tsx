"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Phone,
  Mail,
  Car,
  Camera,
  Utensils,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  Download,
  Share2,
  Bell,
  Star,
  X,
  Sun,
  CloudRain,
  Thermometer,
} from "lucide-react"

interface CallSheetItem {
  id: number
  title: string
  date: string
  callTime: string
  wrapTime?: string
  location: string
  address: string
  weather?: {
    condition: string
    temperature: string
    precipitation?: string
  }
  scenes: string[]
  cast: {
    name: string
    character: string
    callTime: string
    pickupTime?: string
    notes?: string
  }[]
  crew: {
    department: string
    members: string[]
    callTime: string
  }[]
  equipment: {
    category: string
    items: string[]
    responsible: string
  }[]
  catering: {
    breakfast?: string
    lunch?: string
    dinner?: string
    craftyLocation?: string
  }
  transportation: {
    basecamp: string
    parking: string
    shuttles?: string[]
  }
  contacts: {
    name: string
    role: string
    phone: string
    email?: string
  }[]
  notes: string
  status: "draft" | "sent" | "confirmed" | "completed"
  createdBy: string
  createdAt: string
  lastModified: string
  recipients?: string[]
}

interface CallSheetsProps {
  searchQuery?: string
  filters?: {
    status: string
    date?: string
  }
  projectId?: string
}

const MOCK_CALL_STORE: Record<string, CallSheetItem[]> = {}

export default function CallSheets({ searchQuery = "", filters = { status: "all", date: "all" }, projectId = "1" }: CallSheetsProps) {
  const [selectedCallSheet, setSelectedCallSheet] = useState<CallSheetItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [callSheets, setCallSheets] = useState<CallSheetItem[]>([])

  useEffect(() => {
    if (MOCK_CALL_STORE[projectId]) {
      setCallSheets(MOCK_CALL_STORE[projectId])
      return
    }

    const initialCallSheets: CallSheetItem[] = [
      {
        id: 1,
        title: "Day 1 - Hero Introduction Scene",
        date: "2024-03-15",
        callTime: "6:00 AM",
        wrapTime: "8:00 PM",
        location: "Downtown Office Building",
        address: "123 Business Ave, Los Angeles, CA 90210",
        weather: {
          condition: "Sunny",
          temperature: "75°F",
          precipitation: "0%",
        },
        scenes: ["Scene 1A", "Scene 1B", "Scene 2A"],
        cast: [
          {
            name: "John Doe",
            character: "Hero",
            callTime: "6:00 AM",
            pickupTime: "5:30 AM",
            notes: "Wardrobe fitting at 6:30 AM",
          },
          {
            name: "Jane Smith",
            character: "Love Interest",
            callTime: "10:00 AM",
            pickupTime: "9:30 AM",
          },
        ],
        crew: [
          {
            department: "Camera",
            members: ["Mike Johnson (DP)", "Sarah Wilson (1st AC)", "Tom Brown (2nd AC)"],
            callTime: "5:30 AM",
          },
          {
            department: "Sound",
            members: ["Lisa Davis (Sound Mixer)", "Bob Miller (Boom Op)"],
            callTime: "6:00 AM",
          },
        ],
        equipment: [
          {
            category: "Camera",
            items: ["RED Komodo 6K", "Zeiss CP.3 Lens Set", "Steadicam"],
            responsible: "Mike Johnson",
          },
          {
            category: "Lighting",
            items: ["ARRI SkyPanel S60", "Aputure 300D", "Bounce Boards"],
            responsible: "Alex Chen",
          },
        ],
        catering: {
          breakfast: "6:30 AM - Continental breakfast",
          lunch: "1:00 PM - Hot lunch buffet",
          craftyLocation: "Basecamp tent",
        },
        transportation: {
          basecamp: "Parking Lot B - 125 Business Ave",
          parking: "Street parking available on Business Ave",
          shuttles: ["Shuttle runs every 15 minutes from basecamp to set"],
        },
        contacts: [
          {
            name: "Director - Peter Jones",
            role: "Director",
            phone: "(555) 123-4567",
            email: "peter.jones@production.com",
          },
          {
            name: "1st AD - Mary Brown",
            role: "1st Assistant Director",
            phone: "(555) 987-6543",
            email: "mary.brown@production.com",
          },
        ],
        notes: "Early morning start. Please arrive on time. Weather looks good for outdoor scenes.",
        status: "sent",
        createdBy: "Mary Brown",
        createdAt: "2024-03-10",
        lastModified: "2024-03-12",
        recipients: ["cast@production.com", "crew@production.com"],
      },
      {
        id: 2,
        title: "Day 2 - Action Sequence",
        date: "2024-03-16",
        callTime: "7:00 AM",
        wrapTime: "9:00 PM",
        location: "Warehouse District",
        address: "456 Industrial Blvd, Los Angeles, CA 90211",
        weather: {
          condition: "Partly Cloudy",
          temperature: "68°F",
          precipitation: "10%",
        },
        scenes: ["Scene 5A", "Scene 5B", "Scene 6A"],
        cast: [
          {
            name: "John Doe",
            character: "Hero",
            callTime: "7:00 AM",
            pickupTime: "6:30 AM",
            notes: "Stunt rehearsal at 7:30 AM",
          },
          {
            name: "Peter Wilson",
            character: "Villain",
            callTime: "9:00 AM",
            pickupTime: "8:30 AM",
          },
        ],
        crew: [
          {
            department: "Stunts",
            members: ["Jack Thompson (Stunt Coordinator)", "Emma Davis (Stunt Double)"],
            callTime: "6:30 AM",
          },
          {
            department: "Special Effects",
            members: ["David Lee (SFX Supervisor)", "Anna Garcia (Pyrotechnician)"],
            callTime: "7:00 AM",
          },
        ],
        equipment: [
          {
            category: "Safety",
            items: ["Safety Harnesses", "Crash Mats", "Fire Extinguishers"],
            responsible: "Jack Thompson",
          },
          {
            category: "Special Effects",
            items: ["Smoke Machines", "Pyrotechnic Charges", "Safety Barriers"],
            responsible: "David Lee",
          },
        ],
        catering: {
          breakfast: "7:30 AM - Hot breakfast",
          lunch: "1:30 PM - BBQ lunch",
          dinner: "7:00 PM - Dinner boxes",
          craftyLocation: "Catering truck on Industrial Blvd",
        },
        transportation: {
          basecamp: "Warehouse parking lot",
          parking: "Designated crew parking in lot",
          shuttles: ["No shuttles needed - walking distance"],
        },
        contacts: [
          {
            name: "Stunt Coordinator - Jack Thompson",
            role: "Stunt Coordinator",
            phone: "(555) 456-7890",
            email: "jack.thompson@stunts.com",
          },
          {
            name: "Safety Officer - Lisa Park",
            role: "Safety Officer",
            phone: "(555) 321-0987",
            email: "lisa.park@safety.com",
          },
        ],
        notes: "Action-heavy day with stunts and pyrotechnics. Safety briefing at 7:15 AM mandatory for all crew.",
        status: "confirmed",
        createdBy: "Mary Brown",
        createdAt: "2024-03-11",
        lastModified: "2024-03-13",
        recipients: ["cast@production.com", "crew@production.com", "stunts@production.com"],
      },
      {
        id: 3,
        title: "Day 3 - Interior Dialogue Scenes",
        date: "2024-03-17",
        callTime: "8:00 AM",
        wrapTime: "6:00 PM",
        location: "Studio Stage 5",
        address: "789 Studio Way, Los Angeles, CA 90212",
        weather: {
          condition: "Indoor",
          temperature: "72°F (Climate Controlled)",
        },
        scenes: ["Scene 8A", "Scene 8B", "Scene 9A", "Scene 10A"],
        cast: [
          {
            name: "Jane Smith",
            character: "Love Interest",
            callTime: "8:00 AM",
            notes: "Hair and makeup at 8:30 AM",
          },
          {
            name: "Bob Williams",
            character: "Mentor",
            callTime: "10:00 AM",
          },
        ],
        crew: [
          {
            department: "Camera",
            members: ["Mike Johnson (DP)", "Sarah Wilson (1st AC)"],
            callTime: "7:30 AM",
          },
          {
            department: "Lighting",
            members: ["Alex Chen (Gaffer)", "Chris Taylor (Best Boy)"],
            callTime: "7:00 AM",
          },
        ],
        equipment: [
          {
            category: "Camera",
            items: ["ARRI Alexa Mini", "Master Prime Lenses", "Dolly Track"],
            responsible: "Mike Johnson",
          },
        ],
        catering: {
          breakfast: "8:30 AM - Continental breakfast",
          lunch: "1:00 PM - Catered lunch",
          craftyLocation: "Stage 5 craft services area",
        },
        transportation: {
          basecamp: "Studio parking structure",
          parking: "Assigned parking spaces",
          shuttles: ["Golf cart available for equipment transport"],
        },
        contacts: [
          {
            name: "Stage Manager - Tom Wilson",
            role: "Stage Manager",
            phone: "(555) 654-3210",
            email: "tom.wilson@studio.com",
          },
        ],
        notes: "Controlled studio environment. Multiple dialogue scenes scheduled.",
        status: "draft",
        createdBy: "Mary Brown",
        createdAt: "2024-03-12",
        lastModified: "2024-03-12",
      },
    ]

    if (projectId === "2") {
      initialCallSheets.shift();
      initialCallSheets[0].title = "Day 1 - NYC Shot";
      initialCallSheets[0].location = "New York Street";
    } else if (projectId === "3") {
      initialCallSheets.pop();
      initialCallSheets[0].title = "Day 1 - Beach Setup";
    }

    MOCK_CALL_STORE[projectId] = initialCallSheets;
    setCallSheets(initialCallSheets);
  }, [projectId])

  useEffect(() => {
    if (callSheets.length > 0 && projectId) {
      MOCK_CALL_STORE[projectId] = callSheets
    }
  }, [callSheets, projectId])

  const filteredCallSheets = callSheets.filter((sheet) => {
    const matchesSearch =
      sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.scenes.some((scene) => scene.toLowerCase().includes(searchQuery.toLowerCase())) ||
      sheet.notes.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filters.status === "all" || sheet.status === filters.status
    const matchesDate = !filters.date || filters.date === "all" || sheet.date === filters.date

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500"
      case "sent":
        return "bg-blue-500"
      case "confirmed":
        return "bg-green-500"
      case "completed":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "sunny":
        return <Sun className="h-4 w-4 text-yellow-400" />
      case "partly cloudy":
        return <CloudRain className="h-4 w-4 text-gray-400" />
      case "cloudy":
        return <CloudRain className="h-4 w-4 text-gray-500" />
      case "rainy":
        return <CloudRain className="h-4 w-4 text-blue-400" />
      default:
        return <Thermometer className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Call Sheets</h1>
          <p className="text-white/70">Manage daily production schedules and information</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Call Sheet
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{callSheets.length}</p>
              <p className="text-white/70 text-sm">Total Call Sheets</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{callSheets.filter((s) => s.status === "sent").length}</p>
              <p className="text-white/70 text-sm">Sent</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {callSheets.filter((s) => s.status === "confirmed").length}
              </p>
              <p className="text-white/70 text-sm">Confirmed</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {callSheets.filter((s) => s.status === "completed").length}
              </p>
              <p className="text-white/70 text-sm">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call Sheets List */}
      <div className="space-y-4">
        {filteredCallSheets.map((sheet) => (
          <div
            key={sheet.id}
            className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedCallSheet(sheet)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">{sheet.title}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(sheet.status)}`}
                  >
                    {sheet.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-white/70 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{sheet.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{sheet.callTime}</span>
                    {sheet.wrapTime && <span>- {sheet.wrapTime}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{sheet.location}</span>
                  </div>
                  {sheet.weather && (
                    <div className="flex items-center gap-2">
                      {getWeatherIcon(sheet.weather.condition)}
                      <span>{sheet.weather.temperature}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Eye className="h-4 w-4 text-white/70" />
                </button>
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Edit className="h-4 w-4 text-white/70" />
                </button>
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Share2 className="h-4 w-4 text-white/70" />
                </button>
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Download className="h-4 w-4 text-white/70" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-white font-medium mb-2">Scenes</h4>
                <div className="flex flex-wrap gap-1">
                  {sheet.scenes.map((scene, index) => (
                    <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                      {scene}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Cast ({sheet.cast.length})</h4>
                <div className="text-white/70 text-sm">
                  {sheet.cast.slice(0, 2).map((member, index) => (
                    <div key={index}>
                      {member.name} ({member.character})
                    </div>
                  ))}
                  {sheet.cast.length > 2 && <div className="text-white/50">+{sheet.cast.length - 2} more</div>}
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Crew Departments</h4>
                <div className="text-white/70 text-sm">
                  {sheet.crew.slice(0, 2).map((dept, index) => (
                    <div key={index}>
                      {dept.department} ({dept.members.length})
                    </div>
                  ))}
                  {sheet.crew.length > 2 && <div className="text-white/50">+{sheet.crew.length - 2} more</div>}
                </div>
              </div>
            </div>

            {sheet.notes && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-white/70 text-sm">{sheet.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Call Sheet Detail Modal */}
      {selectedCallSheet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedCallSheet.title}</h2>
                <button
                  onClick={() => setSelectedCallSheet(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="text-white/70 text-sm">Date</span>
                  </div>
                  <p className="text-white font-medium">{selectedCallSheet.date}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-green-400" />
                    <span className="text-white/70 text-sm">Call Time</span>
                  </div>
                  <p className="text-white font-medium">{selectedCallSheet.callTime}</p>
                  {selectedCallSheet.wrapTime && (
                    <p className="text-white/70 text-sm">Wrap: {selectedCallSheet.wrapTime}</p>
                  )}
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span className="text-white/70 text-sm">Location</span>
                  </div>
                  <p className="text-white font-medium">{selectedCallSheet.location}</p>
                  <p className="text-white/70 text-xs">{selectedCallSheet.address}</p>
                </div>
                {selectedCallSheet.weather && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {getWeatherIcon(selectedCallSheet.weather.condition)}
                      <span className="text-white/70 text-sm">Weather</span>
                    </div>
                    <p className="text-white font-medium">{selectedCallSheet.weather.condition}</p>
                    <p className="text-white/70 text-sm">{selectedCallSheet.weather.temperature}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Cast */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Cast
                    </h3>
                    <div className="space-y-2">
                      {selectedCallSheet.cast.map((member, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">{member.name}</span>
                            <span className="text-white/70 text-sm">{member.callTime}</span>
                          </div>
                          <p className="text-white/70 text-sm mb-1">as {member.character}</p>
                          {member.pickupTime && <p className="text-white/60 text-xs">Pickup: {member.pickupTime}</p>}
                          {member.notes && <p className="text-white/60 text-xs mt-1">{member.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crew */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Crew
                    </h3>
                    <div className="space-y-2">
                      {selectedCallSheet.crew.map((dept, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{dept.department}</span>
                            <span className="text-white/70 text-sm">{dept.callTime}</span>
                          </div>
                          <div className="space-y-1">
                            {dept.members.map((member, memberIndex) => (
                              <p key={memberIndex} className="text-white/70 text-sm">
                                {member}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Equipment */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Equipment</h3>
                    <div className="space-y-2">
                      {selectedCallSheet.equipment.map((category, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{category.category}</span>
                            <span className="text-white/70 text-sm">{category.responsible}</span>
                          </div>
                          <div className="space-y-1">
                            {category.items.map((item, itemIndex) => (
                              <p key={itemIndex} className="text-white/70 text-sm">
                                • {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Catering */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Utensils className="h-5 w-5" />
                      Catering
                    </h3>
                    <div className="bg-white/5 rounded-lg p-3 space-y-2">
                      {selectedCallSheet.catering.breakfast && (
                        <p className="text-white/70 text-sm">
                          <span className="text-white font-medium">Breakfast:</span>{" "}
                          {selectedCallSheet.catering.breakfast}
                        </p>
                      )}
                      {selectedCallSheet.catering.lunch && (
                        <p className="text-white/70 text-sm">
                          <span className="text-white font-medium">Lunch:</span> {selectedCallSheet.catering.lunch}
                        </p>
                      )}
                      {selectedCallSheet.catering.dinner && (
                        <p className="text-white/70 text-sm">
                          <span className="text-white font-medium">Dinner:</span> {selectedCallSheet.catering.dinner}
                        </p>
                      )}
                      {selectedCallSheet.catering.craftyLocation && (
                        <p className="text-white/70 text-sm">
                          <span className="text-white font-medium">Craft Services:</span>{" "}
                          {selectedCallSheet.catering.craftyLocation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transportation */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Transportation
                    </h3>
                    <div className="bg-white/5 rounded-lg p-3 space-y-2">
                      <p className="text-white/70 text-sm">
                        <span className="text-white font-medium">Basecamp:</span>{" "}
                        {selectedCallSheet.transportation.basecamp}
                      </p>
                      <p className="text-white/70 text-sm">
                        <span className="text-white font-medium">Parking:</span>{" "}
                        {selectedCallSheet.transportation.parking}
                      </p>
                      {selectedCallSheet.transportation.shuttles && (
                        <div>
                          <span className="text-white font-medium">Shuttles:</span>
                          {selectedCallSheet.transportation.shuttles.map((shuttle, index) => (
                            <p key={index} className="text-white/70 text-sm ml-2">
                              • {shuttle}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contacts */}
              <div className="mt-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Important Contacts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedCallSheet.contacts.map((contact, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3">
                      <p className="text-white font-medium">{contact.name}</p>
                      <p className="text-white/70 text-sm mb-1">{contact.role}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-white/70" />
                          <span className="text-white/70">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-white/70" />
                            <span className="text-white/70">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedCallSheet.notes && (
                <div className="mt-6">
                  <h3 className="text-white font-semibold mb-3">Notes</h3>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/80">{selectedCallSheet.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex gap-3 flex-wrap">
                  <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                    Edit Call Sheet
                  </button>
                  <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Share2 className="h-4 w-4" />
                    Send to Cast & Crew
                  </button>
                  <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                  <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Bell className="h-4 w-4" />
                    Send Reminder
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
