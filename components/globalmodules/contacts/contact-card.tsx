import {
    Mail,
    Phone,
    MapPin,
    Star,
    Building,
    User,
    Camera,
    Briefcase,
    Award
} from "lucide-react";
import { Contact, ContactType } from "./types";

interface ContactCardProps {
    contact: Contact;
    onClick: (contact: Contact) => void;
    showType?: boolean;
}

export default function ContactCard({ contact, onClick, showType = true }: ContactCardProps) {
    const getTypeIcon = (type: ContactType) => {
        switch (type) {
            case "cast": return User;
            case "crew": return Camera;
            case "vendor": return Building;
            case "client": return Briefcase;
            case "agent": return Award;
            case "producer": return Award;
            case "executive": return Briefcase;
            case "location": return MapPin;
            default: return User;
        }
    };

    const getAvailabilityColor = (availability: string) => {
        switch (availability) {
            case "available": return "bg-green-500";
            case "busy": return "bg-yellow-500";
            case "unavailable": return "bg-red-500";
            case "unknown": return "bg-gray-400";
            default: return "bg-gray-500";
        }
    };

    const TypeIcon = getTypeIcon(contact.type);

    // Safety getters for primary info
    const primaryEmail = contact.emails && contact.emails.find(e => e.primary) ? contact.emails.find(e => e.primary)?.value : contact.emails?.[0]?.value;
    const primaryPhone = contact.phones && contact.phones.find(p => p.primary) ? contact.phones.find(p => p.primary)?.value : contact.phones?.[0]?.value;

    return (
        <div
            className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors cursor-pointer relative group flex flex-col h-full"
            onClick={() => onClick(contact)}
        >
            {contact.isMock && (
                <div className="absolute top-2 right-2 opacity-100 transition-opacity">
                    <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-500/30">MOCK</span>
                </div>
            )}

            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 w-full">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                        {contact.avatar || contact.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                        <h3 className="text-white font-medium text-sm truncate" title={contact.name}>{contact.name}</h3>
                        <p className="text-white/70 text-xs truncate" title={contact.role}>{contact.role}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 text-xs text-white/70 mb-3 flex-grow">
                {showType && (
                    <div className="flex items-center gap-2">
                        <TypeIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate capitalize">{contact.type}</span>
                    </div>
                )}
                {contact.company && (
                    <div className="flex items-center gap-2">
                        <Building className="h-3 w-3 shrink-0" />
                        <span className="truncate">{contact.company}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{contact.location}</span>
                </div>
                {primaryEmail && (
                    <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{primaryEmail}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                <div className="flex">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={`h-3 w-3 ${i < contact.rating ? "text-yellow-400 fill-current" : "text-gray-400"}`}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(contact.availability)}`}></div>
                    <span className="text-xs text-white/60 capitalize">{contact.availability}</span>
                </div>
            </div>
        </div>
    );
}
