"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Edit,
  Eye,
  ShieldCheck,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Settings,
  Key,
  UserPlus,
  UserMinus,
  Crown,
  X,
  MapPin,
  Globe,
} from "lucide-react"

interface User {
  id: number
  name: string
  email: string
  role: "admin" | "editor" | "viewer" | "contributor" | "manager"
  department: string
  status: "active" | "inactive" | "pending" | "suspended"
  avatar?: string
  phone?: string
  location?: string
  timezone?: string
  lastLogin?: string
  joinDate: string
  permissions: string[]
  projects: string[]
  notes?: string
  isOnline?: boolean
  loginCount?: number
  storageUsed?: string
  storageLimit?: string
}

interface UserManagementProps {
  searchQuery?: string
  filters?: {
    department: string
    status: string
    role?: string
  }
  projectId?: string
}

const MOCK_USER_STORE: Record<string, User[]> = {}

export default function UserManagement({
  searchQuery = "",
  filters = { department: "all", status: "all", role: "all" },
  projectId = "1",
}: UserManagementProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (MOCK_USER_STORE[projectId]) {
      setUsers(MOCK_USER_STORE[projectId])
      return
    }

    const initialUsers: User[] = [
      {
        id: 1,
        name: "John Doe",
        email: "john.doe@example.com",
        role: "admin",
        department: "IT",
        status: "active",
        avatar: "/placeholder.svg?height=100&width=100&text=JD",
        phone: "+1 (555) 123-4567",
        location: "New York, NY",
        timezone: "EST",
        lastLogin: "2024-01-20 14:30",
        joinDate: "2023-01-15",
        permissions: ["full_access", "user_management", "system_settings", "billing"],
        projects: ["Project Alpha", "Project Beta", "Project Gamma"],
        notes: "Senior administrator with full system access",
        isOnline: true,
        loginCount: 1247,
        storageUsed: "2.4 GB",
        storageLimit: "10 GB",
      },
      {
        id: 2,
        name: "Jane Smith",
        email: "jane.smith@example.com",
        role: "editor",
        department: "Marketing",
        status: "active",
        avatar: "/placeholder.svg?height=100&width=100&text=JS",
        phone: "+1 (555) 987-6543",
        location: "Los Angeles, CA",
        timezone: "PST",
        lastLogin: "2024-01-20 09:15",
        joinDate: "2023-03-22",
        permissions: ["content_edit", "media_upload", "project_access"],
        projects: ["Project Beta", "Project Delta"],
        notes: "Lead content editor for marketing materials",
        isOnline: false,
        loginCount: 892,
        storageUsed: "1.8 GB",
        storageLimit: "5 GB",
      },
      {
        id: 3,
        name: "Peter Jones",
        email: "peter.jones@example.com",
        role: "viewer",
        department: "Sales",
        status: "active",
        avatar: "/placeholder.svg?height=100&width=100&text=PJ",
        phone: "+1 (555) 456-7890",
        location: "Chicago, IL",
        timezone: "CST",
        lastLogin: "2024-01-19 16:45",
        joinDate: "2023-06-10",
        permissions: ["view_only", "download_assets"],
        projects: ["Project Alpha"],
        notes: "Sales team member with view-only access",
        isOnline: false,
        loginCount: 234,
        storageUsed: "0.5 GB",
        storageLimit: "2 GB",
      },
      {
        id: 4,
        name: "Mary Brown",
        email: "mary.brown@example.com",
        role: "manager",
        department: "HR",
        status: "active",
        avatar: "/placeholder.svg?height=100&width=100&text=MB",
        phone: "+1 (555) 321-0987",
        location: "Austin, TX",
        timezone: "CST",
        lastLogin: "2024-01-20 11:20",
        joinDate: "2023-02-28",
        permissions: ["user_management", "project_management", "reports"],
        projects: ["Project Gamma", "Project Delta", "Project Epsilon"],
        notes: "HR manager overseeing team coordination",
        isOnline: true,
        loginCount: 567,
        storageUsed: "3.1 GB",
        storageLimit: "8 GB",
      },
      {
        id: 5,
        name: "David Wilson",
        email: "david.wilson@example.com",
        role: "contributor",
        department: "Design",
        status: "pending",
        avatar: "/placeholder.svg?height=100&width=100&text=DW",
        phone: "+1 (555) 654-3210",
        location: "Seattle, WA",
        timezone: "PST",
        joinDate: "2024-01-18",
        permissions: ["content_create", "media_upload"],
        projects: ["Project Epsilon"],
        notes: "New team member pending approval",
        isOnline: false,
        loginCount: 3,
        storageUsed: "0.1 GB",
        storageLimit: "3 GB",
      },
    ]

    if (projectId === "2") {
      initialUsers.pop();
      initialUsers[0].name = "Project 2 Admin";
    } else if (projectId === "3") {
      initialUsers.shift();
      initialUsers[0].name = "Project 3 Viewer";
    }

    MOCK_USER_STORE[projectId] = initialUsers;
    setUsers(initialUsers);

  }, [projectId])

  useEffect(() => {
    if (users.length > 0 && projectId) {
      MOCK_USER_STORE[projectId] = users;
    }
  }, [users, projectId])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment =
      filters.department === "all" || user.department.toLowerCase() === filters.department.toLowerCase()
    const matchesStatus = filters.status === "all" || user.status === filters.status
    const matchesRole = !filters.role || filters.role === "all" || user.role === filters.role

    return matchesSearch && matchesDepartment && matchesStatus && matchesRole
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "inactive":
        return "bg-gray-500"
      case "pending":
        return "bg-yellow-500"
      case "suspended":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-400" />
      case "manager":
        return <ShieldCheck className="h-4 w-4 text-blue-400" />
      case "editor":
        return <Edit className="h-4 w-4 text-green-400" />
      case "contributor":
        return <UserPlus className="h-4 w-4 text-purple-400" />
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-400" />
      default:
        return <Users className="h-4 w-4 text-gray-400" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-yellow-400"
      case "manager":
        return "text-blue-400"
      case "editor":
        return "text-green-400"
      case "contributor":
        return "text-purple-400"
      case "viewer":
        return "text-gray-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-white/70">Manage team members, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-white/70 text-sm">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{users.filter((u) => u.status === "active").length}</p>
              <p className="text-white/70 text-sm">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{users.filter((u) => u.status === "pending").length}</p>
              <p className="text-white/70 text-sm">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Globe className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{users.filter((u) => u.isOnline).length}</p>
              <p className="text-white/70 text-sm">Online</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{users.filter((u) => u.role === "admin").length}</p>
              <p className="text-white/70 text-sm">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
              }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
              }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Users Grid */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedUser(user)}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <img
                      src={user.avatar || "/placeholder.svg"}
                      alt={user.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{user.name}</h3>
                    <p className="text-white/70 text-sm mb-1">{user.email}</p>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span className={`text-sm font-medium capitalize ${getRoleColor(user.role)}`}>{user.role}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Department:</span>
                    <span className="text-white">{user.department}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(user.status)}`}
                    >
                      {user.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Projects:</span>
                    <span className="text-white">{user.projects.length}</span>
                  </div>
                  {user.lastLogin && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Last Login:</span>
                      <span className="text-white text-xs">{user.lastLogin}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-xs">Storage Used</span>
                    <span className="text-white text-xs">
                      {user.storageUsed} / {user.storageLimit}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-white/20 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full"
                      style={{
                        width: `${user.storageUsed && user.storageLimit
                            ? (Number.parseFloat(user.storageUsed) / Number.parseFloat(user.storageLimit)) * 100
                            : 0
                          }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users List */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedUser(user)}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={user.avatar || "/placeholder.svg"}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {user.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{user.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(user.status)}`}
                    >
                      {user.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/70">
                    <span>{user.email}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      <span className={`capitalize ${getRoleColor(user.role)}`}>{user.role}</span>
                    </div>
                    <span>•</span>
                    <span>{user.department}</span>
                    <span>•</span>
                    <span>{user.projects.length} projects</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-white/70 text-sm mb-1">
                    {user.lastLogin ? `Last login: ${user.lastLogin}` : "Never logged in"}
                  </div>
                  <div className="text-white/60 text-xs">Joined: {user.joinDate}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <Eye className="h-4 w-4 text-white/70" />
                  </button>
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <Edit className="h-4 w-4 text-white/70" />
                  </button>
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <Settings className="h-4 w-4 text-white/70" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedUser.name}</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={selectedUser.avatar || "/placeholder.svg"}
                        alt={selectedUser.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                      {selectedUser.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{selectedUser.name}</h3>
                      <p className="text-white/70 mb-2">{selectedUser.email}</p>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(selectedUser.role)}
                        <span className={`font-medium capitalize ${getRoleColor(selectedUser.role)}`}>
                          {selectedUser.role}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedUser.status)}`}
                        >
                          {selectedUser.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-white/70" />
                        <span className="text-white">{selectedUser.email}</span>
                      </div>
                      {selectedUser.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-white/70" />
                          <span className="text-white">{selectedUser.phone}</span>
                        </div>
                      )}
                      {selectedUser.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-white/70" />
                          <span className="text-white">{selectedUser.location}</span>
                        </div>
                      )}
                      {selectedUser.timezone && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-white/70" />
                          <span className="text-white">{selectedUser.timezone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Account Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Department:</span>
                        <span className="text-white">{selectedUser.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Join Date:</span>
                        <span className="text-white">{selectedUser.joinDate}</span>
                      </div>
                      {selectedUser.lastLogin && (
                        <div className="flex justify-between">
                          <span className="text-white/70">Last Login:</span>
                          <span className="text-white">{selectedUser.lastLogin}</span>
                        </div>
                      )}
                      {selectedUser.loginCount && (
                        <div className="flex justify-between">
                          <span className="text-white/70">Login Count:</span>
                          <span className="text-white">{selectedUser.loginCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-3">Permissions</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.permissions.map((permission, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                          {permission.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Projects</h3>
                    <div className="space-y-1">
                      {selectedUser.projects.map((project, index) => (
                        <div key={index} className="text-white/80 text-sm bg-white/5 rounded px-2 py-1">
                          {project}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Storage Usage</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">Used:</span>
                        <span className="text-white">
                          {selectedUser.storageUsed} / {selectedUser.storageLimit}
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${selectedUser.storageUsed && selectedUser.storageLimit
                                ? (
                                  Number.parseFloat(selectedUser.storageUsed) /
                                  Number.parseFloat(selectedUser.storageLimit)
                                ) * 100
                                : 0
                              }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {selectedUser.notes && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Notes</h3>
                      <p className="text-white/80 text-sm bg-white/5 rounded-lg p-3">{selectedUser.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex gap-3 flex-wrap">
                  <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                    Edit User
                  </button>
                  <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Key className="h-4 w-4" />
                    Reset Password
                  </button>
                  <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Settings className="h-4 w-4" />
                    Permissions
                  </button>
                  <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Mail className="h-4 w-4" />
                    Send Message
                  </button>
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                    <UserMinus className="h-4 w-4" />
                    Deactivate
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
