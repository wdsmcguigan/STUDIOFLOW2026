"use client"

import { useState, useEffect } from "react"
import {
  MapPin,
  Plus,
  Star,
  Phone,
  Mail,
  Calendar,
  Edit,
  Eye,
  Download,
  DollarSign,
  Navigation,
  Home,
  Building,
  Trees,
  Mountain,
  X,
  Users,
} from "lucide-react"

interface Location {
  id: string
  name: string
  type: "interior" | "exterior" | "studio" | "natural" | "urban" | "residential"
  address: string
  coordinates: { lat: number; lng: number }
  status: "available" | "booked" | "pending" | "scouting" | "declined"
  priority: "high" | "medium" | "low"
  contact: {
    owner: string
    phone: string
    email: string
    agent?: string
  }
  details: {
    size: string
    capacity: number
    rate: string
    availability: string[]
    permits: boolean
    insurance: boolean
  }
  amenities: string[]
  media: {
    photos: string[]
    video?: string
    floorPlan?: string
  }
  notes: string
  scoutDate?: string
  shootDates?: string[]
  rating: number
  scenes: string[]
}

interface LocationScoutingProps {
  searchQuery?: string
  filters?: {
    status: string
    type: string
  }
  projectId?: string
}

const MOCK_LOCATIONS_STORE: Record<string, Location[]> = {}

export default function LocationScouting({
  searchQuery = "",
  filters = { status: "all", type: "all" },
  projectId = "1",
}: LocationScoutingProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid")
  const [locations, setLocations] = useState<Location[]>([])

  // Sample location data
  useEffect(() => {
    if (MOCK_LOCATIONS_STORE[projectId]) {
      setLocations(MOCK_LOCATIONS_STORE[projectId])
      return
    }

    const initialLocations: Location[] = [
      {
        id: "1",
        name: "Downtown Loft Studio",
        type: "interior",
        address: "123 Industrial Blvd, Los Angeles, CA 90028",
        coordinates: { lat: 34.0522, lng: -118.2437 },
        status: "booked",
        priority: "high",
        contact: {
          owner: "Metro Studios LLC",
          phone: "+1 (555) 123-4567",
          email: "bookings@metrostudios.com",
          agent: "Location Agency - Sarah Kim",
        },
        details: {
          size: "3,500 sq ft",
          capacity: 50,
          rate: "$2,500/day",
          availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          permits: true,
          insurance: true,
        },
        amenities: ["Parking", "WiFi", "Power", "HVAC", "Kitchen", "Bathroom", "Loading Dock"],
        media: {
          photos: [
            "/placeholder.svg?height=300&width=400&text=Loft+Main+Room",
            "/placeholder.svg?height=300&width=400&text=Loft+Kitchen",
            "/placeholder.svg?height=300&width=400&text=Loft+Exterior",
          ],
          video: "loft-walkthrough.mp4",
          floorPlan: "loft-floorplan.pdf",
        },
        notes: "Perfect for modern apartment scenes. Great natural light from large windows.",
        scoutDate: "2024-01-10",
        shootDates: ["2024-02-15", "2024-02-16", "2024-02-17"],
        rating: 5,
        scenes: ["INT. SARAH'S APARTMENT - DAY", "INT. SARAH'S APARTMENT - NIGHT"],
      },
      {
        id: "2",
        name: "Griffith Observatory",
        type: "exterior",
        address: "2800 E Observatory Rd, Los Angeles, CA 90027",
        coordinates: { lat: 34.1184, lng: -118.3004 },
        status: "pending",
        priority: "high",
        contact: {
          owner: "City of Los Angeles",
          phone: "+1 (555) 987-6543",
          email: "permits@lacity.org",
        },
        details: {
          size: "Public Space",
          capacity: 100,
          rate: "$5,000/day + permits",
          availability: ["Sat", "Sun"],
          permits: false,
          insurance: true,
        },
        amenities: ["Parking", "Restrooms", "Security", "Iconic Views"],
        media: {
          photos: [
            "/placeholder.svg?height=300&width=400&text=Observatory+Exterior",
            "/placeholder.svg?height=300&width=400&text=Observatory+View",
            "/placeholder.svg?height=300&width=400&text=Observatory+Interior",
          ],
        },
        notes: "Iconic LA location. Requires city permits and coordination with public access.",
        scoutDate: "2024-01-12",
        rating: 5,
        scenes: ["EXT. OBSERVATORY - SUNSET", "EXT. OBSERVATORY - NIGHT"],
      },
      {
        id: "3",
        name: "Venice Beach Boardwalk",
        type: "exterior",
        address: "Venice Beach Boardwalk, Venice, CA 90291",
        coordinates: { lat: 33.985, lng: -118.4695 },
        status: "scouting",
        priority: "medium",
        contact: {
          owner: "Venice Beach Recreation",
          phone: "+1 (555) 456-7890",
          email: "filming@venicebeach.org",
        },
        details: {
          size: "2 mile boardwalk",
          capacity: 200,
          rate: "$3,000/day",
          availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          permits: false,
          insurance: true,
        },
        amenities: ["Public Access", "Restrooms", "Food Vendors", "Parking (Limited)"],
        media: {
          photos: [
            "/placeholder.svg?height=300&width=400&text=Venice+Boardwalk",
            "/placeholder.svg?height=300&width=400&text=Venice+Beach",
            "/placeholder.svg?height=300&width=400&text=Venice+Pier",
          ],
        },
        notes: "Vibrant beach location with street performers and vendors. Crowded on weekends.",
        scoutDate: "2024-01-20",
        rating: 4,
        scenes: ["EXT. BEACH BOARDWALK - DAY"],
      },
      {
        id: "4",
        name: "Historic Downtown Office",
        type: "interior",
        address: "456 Spring St, Los Angeles, CA 90013",
        coordinates: { lat: 34.0522, lng: -118.25 },
        status: "available",
        priority: "medium",
        contact: {
          owner: "Heritage Properties",
          phone: "+1 (555) 321-0987",
          email: "leasing@heritage.com",
          agent: "Downtown Locations - Mike Chen",
        },
        details: {
          size: "2,000 sq ft",
          capacity: 30,
          rate: "$1,800/day",
          availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          permits: true,
          insurance: true,
        },
        amenities: ["Elevator", "WiFi", "Power", "HVAC", "Conference Room", "Reception Area"],
        media: {
          photos: [
            "/placeholder.svg?height=300&width=400&text=Office+Reception",
            "/placeholder.svg?height=300&width=400&text=Office+Conference",
            "/placeholder.svg?height=300&width=400&text=Office+Exterior",
          ],
          floorPlan: "office-floorplan.pdf",
        },
        notes: "Classic 1920s architecture. Perfect for period pieces or modern corporate scenes.",
        rating: 4,
        scenes: ["INT. POLICE STATION - DAY", "INT. DETECTIVE'S OFFICE - NIGHT"],
      },
    ]

    if (projectId === "2") {
      initialLocations.shift();
      initialLocations[0].name = "Central Park";
      initialLocations[0].address = "New York, NY";
    } else if (projectId === "3") {
      initialLocations.pop();
      initialLocations[0].name = "Santa Monica Pier";
    }

    MOCK_LOCATIONS_STORE[projectId] = initialLocations;
    setLocations(initialLocations);
  }, [projectId])

  useEffect(() => {
    if (locations.length > 0 && projectId) {
      MOCK_LOCATIONS_STORE[projectId] = locations
    }
  }, [locations, projectId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500"
      case "booked":
        return "bg-blue-500"
      case "pending":
        return "bg-yellow-500"
      case "scouting":
        return "bg-purple-500"
      case "declined":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "interior":
        return <Home className="h-4 w-4" />
      case "exterior":
        return <Trees className="h-4 w-4" />
      case "studio":
        return <Building className="h-4 w-4" />
      case "natural":
        return <Mountain className="h-4 w-4" />
      case "urban":
        return <Building className="h-4 w-4" />
      case "residential":
        return <Home className="h-4 w-4" />
      default:
        return <MapPin className="h-4 w-4" />
    }
  }

  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.scenes.some((scene) => scene.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = filters.status === "all" || location.status === filters.status
    const matchesType = filters.type === "all" || location.type === filters.type

    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Location Scouting</h1>
          <p className="text-white/70">Discover and manage filming locations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded text-sm transition-colors ${viewMode === "grid" ? "bg-white/20 text-white" : "text-white/70"
                }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1 rounded text-sm transition-colors ${viewMode === "map" ? "bg-white/20 text-white" : "text-white/70"
                }`}
            >
              Map
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{locations.length}</p>
              <p className="text-white/70 text-sm">Total Locations</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{locations.filter((l) => l.status === "booked").length}</p>
              <p className="text-white/70 text-sm">Booked</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{locations.filter((l) => l.status === "scouting").length}</p>
              <p className="text-white/70 text-sm">Scouting</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">$12K</p>
              <p className="text-white/70 text-sm">Daily Budget</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <div className="flex flex-col md:flex-row gap-4"></div>
      </div>

      {/* Locations Grid */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map((location) => (
            <div
              key={location.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedLocation(location)}
            >
              <div className="relative h-48">
                <img
                  src={location.media.photos[0] || "/placeholder.svg"}
                  alt={location.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(location.status)}`}
                  >
                    {location.status.toUpperCase()}
                  </span>
                </div>
                <div className="absolute top-3 left-3">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full p-2">{getTypeIcon(location.type)}</div>
                </div>
                <div className="absolute bottom-3 left-3">
                  <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-white text-xs">{location.rating}</span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-1">{location.name}</h3>
                <p className="text-white/70 text-sm mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.address}
                </p>
                <p className="text-white/60 text-xs mb-3 capitalize">
                  {location.type} • {location.details.size}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Rate:</span>
                    <span className="text-white font-medium">{location.details.rate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Capacity:</span>
                    <span className="text-white">{location.details.capacity} people</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Permits:</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${location.details.permits ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {location.details.permits ? "Required" : "Not Required"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-xs">
                      {location.scenes.length} scene{location.scenes.length !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-1">
                      <button className="p-1 rounded hover:bg-white/10 transition-colors">
                        <Phone className="h-3 w-3 text-white/70" />
                      </button>
                      <button className="p-1 rounded hover:bg-white/10 transition-colors">
                        <Mail className="h-3 w-3 text-white/70" />
                      </button>
                      <button className="p-1 rounded hover:bg-white/10 transition-colors">
                        <Navigation className="h-3 w-3 text-white/70" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map View Placeholder */}
      {viewMode === "map" && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center">
          <MapPin className="h-16 w-16 text-white/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Map View</h3>
          <p className="text-white/70 mb-4">Interactive map showing all location pins with detailed information</p>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
            Load Interactive Map
          </button>
        </div>
      )}

      {/* Location Detail Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedLocation.name}</h2>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              {/* Photo Gallery */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {selectedLocation.media.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo || "/placeholder.svg"}
                    alt={`${selectedLocation.name} ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-2">Location Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Type:</span>
                        <span className="text-white capitalize">{selectedLocation.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Status:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedLocation.status)}`}
                        >
                          {selectedLocation.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Size:</span>
                        <span className="text-white">{selectedLocation.details.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Capacity:</span>
                        <span className="text-white">{selectedLocation.details.capacity} people</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Rate:</span>
                        <span className="text-white">{selectedLocation.details.rate}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-2">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-white/70" />
                        <span className="text-white">{selectedLocation.contact.owner}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-white/70" />
                        <span className="text-white">{selectedLocation.contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-white/70" />
                        <span className="text-white">{selectedLocation.contact.email}</span>
                      </div>
                      {selectedLocation.contact.agent && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-white/70" />
                          <span className="text-white">{selectedLocation.contact.agent}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-2">Address</h3>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-white/70 mt-0.5" />
                      <span className="text-white text-sm">{selectedLocation.address}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLocation.amenities.map((amenity, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-2">Availability</h3>
                    <div className="flex gap-2 flex-wrap">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <span
                          key={day}
                          className={`px-2 py-1 rounded text-xs ${selectedLocation.details.availability.includes(day)
                              ? "bg-green-500 text-white"
                              : "bg-white/20 text-white/70"
                            }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-2">Requirements</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70 text-sm">Permits Required:</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${selectedLocation.details.permits ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}
                        >
                          {selectedLocation.details.permits ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70 text-sm">Insurance Required:</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${selectedLocation.details.insurance ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}
                        >
                          {selectedLocation.details.insurance ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-2">Assigned Scenes</h3>
                    <div className="space-y-1">
                      {selectedLocation.scenes.map((scene, index) => (
                        <div key={index} className="text-white/80 text-sm bg-white/5 rounded px-2 py-1">
                          {scene}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedLocation.notes && (
                    <div>
                      <h3 className="text-white font-medium mb-2">Notes</h3>
                      <p className="text-white/80 text-sm bg-white/5 rounded-lg p-3">{selectedLocation.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex gap-3 flex-wrap">
                  <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                    Edit Location
                  </button>
                  <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Calendar className="h-4 w-4" />
                    Book Location
                  </button>
                  <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Eye className="h-4 w-4" />
                    Schedule Scout
                  </button>
                  <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Eye className="h-4 w-4" />
                    Schedule Scout
                  </button>
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                    <Navigation className="h-4 w-4" />
                    Get Directions
                  </button>
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                    Download Files
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
