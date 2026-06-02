"use client"

import { useState } from "react"
import {
    Users,
    Search,
    Plus,
    Phone,
    Mail,
    MapPin,
    Star,
    Edit,
    Filter,
    MoreHorizontal,
    User,
    Building,
    Camera,
    Briefcase,
    Award,
    MessageSquare,
    ExternalLink,
    X,
    Folder,
    Trash2,
    Save,
    Tag
} from "lucide-react"
import { useContacts } from "./use-contacts"
import { Contact, ContactType } from "./types"
import ContactCard from "./contact-card"

interface ContactsManagerProps {
    currentProject?: any
}

export default function ContactsManager({ currentProject }: ContactsManagerProps) {
    const { contacts, showMockData, toggleShowMockData, addContact, updateContact, deleteContact } = useContacts()
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<ContactType | "all">("all")
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [showProjectOnly, setShowProjectOnly] = useState(false)

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<Partial<Contact>>({})

    const getTypeIcon = (type: ContactType) => {
        switch (type) {
            case "cast": return User
            case "crew": return Camera
            case "vendor": return Building
            case "client": return Briefcase
            case "agent": return Award
            case "producer": return Award
            case "executive": return Briefcase
            case "location": return MapPin
            default: return User
        }
    }

    const getAvailabilityColor = (availability: string) => {
        switch (availability) {
            case "available": return "bg-green-500"
            case "busy": return "bg-yellow-500"
            case "unavailable": return "bg-red-500"
            case "unknown": return "bg-gray-400"
            default: return "bg-gray-500"
        }
    }

    const filteredContacts = contacts.filter((contact) => {
        const matchesType = filterType === "all" || contact.type === filterType
        const matchesSearch =
            contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
            contact.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesProject = !showProjectOnly || !currentProject || (contact.projects && contact.projects.includes(currentProject.id))

        return matchesType && matchesSearch && matchesProject
    })

    const handleContactClick = (contact: Contact) => {
        setSelectedContact(contact)
        setIsEditing(false)
        setEditForm({})
    }

    const handleStartEdit = () => {
        if (selectedContact) {
            setEditForm(JSON.parse(JSON.stringify(selectedContact))) // Deep copy for arrays
            setIsEditing(true)
        }
    }

    const handleSaveEdit = () => {
        if (selectedContact && editForm) {
            updateContact(selectedContact.id, editForm)
            setSelectedContact({ ...selectedContact, ...editForm } as Contact)
            setIsEditing(false)
        }
    }

    // Helpers for displaying primary info
    const getPrimaryEmail = (contact: Contact) => contact.emails?.find(e => e.primary)?.value || contact.emails?.[0]?.value || "";
    const getPrimaryPhone = (contact: Contact) => contact.phones?.find(p => p.primary)?.value || contact.phones?.[0]?.value || "";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white mb-2">Contacts Manager</h1>
                        {!showMockData && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">Mock Data Hidden</span>
                        )}
                    </div>
                    <p className="text-white/70">Manage your production network and industry connections</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                        <Plus className="h-4 w-4" />
                        Add Contact
                    </button>
                    <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                        <Users className="h-4 w-4" />
                        Import
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                    { label: "Total Contacts", value: contacts.length, icon: Users, color: "text-blue-400" },
                    { label: "Cast & Talent", value: contacts.filter((c) => c.type === "cast").length, icon: User, color: "text-purple-400" },
                    { label: "Crew", value: contacts.filter((c) => c.type === "crew").length, icon: Camera, color: "text-green-400" },
                    { label: "Vendors", value: contacts.filter((c) => c.type === "vendor").length, icon: Building, color: "text-yellow-400" },
                    { label: "Available", value: contacts.filter((c) => c.availability === "available").length, icon: Star, color: "text-green-400" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            <span className="text-white/70 text-sm">{stat.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters and Search */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 w-80"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="bg-white/10 border border-white/20 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                    >
                        <option value="all">All Types</option>
                        <option value="cast">Cast & Talent</option>
                        <option value="crew">Crew</option>
                        <option value="vendor">Vendors</option>
                        <option value="client">Clients</option>
                        <option value="agent">Agents</option>
                        <option value="producer">Producers</option>
                        <option value="executive">Executives</option>
                        <option value="location">Locations</option>
                    </select>
                    <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Filter className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:text-white"
                            }`}
                    >
                        <Users className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:text-white"
                            }`}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Contacts Grid/List */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 min-h-[600px] p-6">
                {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/50 py-20">
                        <Users className="h-12 w-12 mb-4 opacity-50" />
                        <p>No contacts found.</p>
                        {!showMockData && <p className="text-sm mt-2">Mock data is currently hidden.</p>}
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredContacts.map((contact) => (
                            <ContactCard
                                key={contact.id}
                                contact={contact}
                                onClick={handleContactClick}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredContacts.map((contact) => {
                            const TypeIcon = getTypeIcon(contact.type)
                            return (
                                <div
                                    key={contact.id}
                                    className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                                    onClick={() => handleContactClick(contact)}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                                        {contact.avatar || contact.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-white font-medium truncate">{contact.name}</h3>
                                            {contact.isMock && (
                                                <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-500/30">MOCK</span>
                                            )}
                                        </div>
                                        <p className="text-white/70 text-sm truncate">
                                            {contact.role} {contact.company ? `• ${contact.company}` : ""}
                                        </p>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2 px-4 text-white/70 text-sm">
                                        <TypeIcon className="h-4 w-4" />
                                        <span className="capitalize">{contact.type}</span>
                                    </div>
                                    <div className="hidden lg:flex items-center gap-4 text-sm text-white/70">
                                        <span className="truncate w-32">{contact.location}</span>
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-3 w-3 ${i < contact.rating ? "text-yellow-400 fill-current" : "text-gray-400"}`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1 w-24">
                                            <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(contact.availability)}`}></div>
                                            <span className="capitalize">{contact.availability}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Contact Detail Modal */}
            {selectedContact && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                                        {selectedContact.avatar || selectedContact.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xl font-bold text-white mb-1 w-full"
                                                value={editForm.name || ""}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        ) : (
                                            <h2 className="text-2xl font-bold text-white">{selectedContact.name}</h2>
                                        )}

                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white/70 w-1/2"
                                                    placeholder="Role"
                                                    value={editForm.role || ""}
                                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                                />
                                                <input
                                                    type="text"
                                                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white/70 w-1/2"
                                                    placeholder="Details..."
                                                    value={editForm.department || ""}
                                                    onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-white/70">{selectedContact.role} • {selectedContact.department}</p>
                                        )}

                                        {selectedContact.isMock && (
                                            <span className="mt-1 inline-block bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-500/30">MOCK DATA</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {isEditing ? (
                                        <button
                                            onClick={handleSaveEdit}
                                            className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                                            title="Save Changes"
                                        >
                                            <Save className="h-6 w-6" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleStartEdit}
                                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                                            title="Edit Contact"
                                        >
                                            <Edit className="h-6 w-6" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setSelectedContact(null)}
                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-white font-medium mb-2">Contact Information</h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-white/50" />
                                                {isEditing ? (
                                                    // Ideally manage array of emails (add/remove), but for MVP just edit first one
                                                    <input
                                                        type="email"
                                                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white flex-1"
                                                        // Safety: create new arrow if needed
                                                        value={editForm.emails?.[0]?.value || ""}
                                                        onChange={e => {
                                                            const newEmails = [...(editForm.emails || [])];
                                                            if (newEmails.length === 0) newEmails.push({ value: "", type: "work", primary: true });
                                                            newEmails[0] = { ...newEmails[0], value: e.target.value };
                                                            setEditForm({ ...editForm, emails: newEmails });
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-white">{getPrimaryEmail(selectedContact)}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-white/50" />
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white flex-1"
                                                        value={editForm.phones?.[0]?.value || ""}
                                                        onChange={e => {
                                                            const newPhones = [...(editForm.phones || [])];
                                                            if (newPhones.length === 0) newPhones.push({ value: "", type: "work", primary: true });
                                                            newPhones[0] = { ...newPhones[0], value: e.target.value };
                                                            setEditForm({ ...editForm, phones: newPhones });
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-white">{getPrimaryPhone(selectedContact)}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-white/50" />
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white flex-1"
                                                        value={editForm.location || ""}
                                                        onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                                    />
                                                ) : (
                                                    <span className="text-white">{selectedContact.location}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-white/50" />
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white flex-1"
                                                        value={editForm.company || ""}
                                                        onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                                                    />
                                                ) : (
                                                    <span className="text-white">{selectedContact.company || "-"}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-white font-medium">Skills</h3>
                                            {isEditing && <span className="text-xs text-white/50">(Comma separated)</span>}
                                        </div>
                                        {isEditing ? (
                                            <textarea
                                                className="bg-white/10 border border-white/20 rounded p-2 text-white w-full text-sm h-20"
                                                value={editForm.skills?.join(", ") || ""}
                                                onChange={e => setEditForm({ ...editForm, skills: e.target.value.split(",").map(s => s.trim()) })}
                                            />
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedContact.skills.map((skill, i) => (
                                                    <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-white font-medium mb-2">Rating & Availability</h3>
                                        <div className="space-y-4">

                                            {/* Rating */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/70 text-sm w-20">Rating:</span>
                                                {isEditing ? (
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                type="button"
                                                                onClick={() => setEditForm({ ...editForm, rating: star })}
                                                                className="focus:outline-none"
                                                            >
                                                                <Star className={`h-4 w-4 ${star <= (editForm.rating || 0) ? "text-yellow-400 fill-current" : "text-gray-600"}`} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`h-4 w-4 ${i < selectedContact.rating ? "text-yellow-400 fill-current" : "text-gray-400"}`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Availability */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/70 text-sm w-20">Status:</span>
                                                {isEditing ? (
                                                    <select
                                                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                                                        value={editForm.availability}
                                                        onChange={e => setEditForm({ ...editForm, availability: e.target.value as any })}
                                                    >
                                                        <option value="available">Available</option>
                                                        <option value="busy">Busy</option>
                                                        <option value="unavailable">Unavailable</option>
                                                        <option value="unknown">Unknown</option>
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <div
                                                            className={`w-2 h-2 rounded-full ${getAvailabilityColor(selectedContact.availability)}`}
                                                        ></div>
                                                        <span className="text-white capitalize">{selectedContact.availability}</span>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-white font-medium mb-2">Notes</h3>
                                        {isEditing ? (
                                            <textarea
                                                className="w-full bg-white/10 border border-white/20 rounded p-3 text-white text-sm min-h-[100px]"
                                                value={editForm.notes || ""}
                                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-white/80 text-sm bg-white/5 rounded p-3 min-h-[60px]">{selectedContact.notes || "No notes."}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3 border-t border-white/10 pt-6">
                                <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Send Email
                                </button>
                                <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Call
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
