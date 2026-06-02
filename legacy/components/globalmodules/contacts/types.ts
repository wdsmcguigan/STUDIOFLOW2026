export type ContactType = "cast" | "crew" | "vendor" | "client" | "agent" | "producer" | "executive" | "location";

export type AvailabilityStatus = "available" | "busy" | "unavailable" | "unknown";

export interface SocialLinks {
    linkedin?: string;
    imdb?: string;
    website?: string;
    instagram?: string;
    twitter?: string;
}

export interface ContactEmail {
    value: string;
    type: "work" | "personal" | "other";
    primary?: boolean;
}

export interface ContactPhone {
    value: string;
    type: "mobile" | "work" | "home" | "other";
    primary?: boolean;
}

export interface ContactAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    type: "work" | "home" | "other";
}

export interface Contact {
    id: string;
    name: string;
    role: string;
    company?: string;
    department: string;
    location: string;

    // Refactored for scalability
    emails: ContactEmail[];
    phones: ContactPhone[];
    addresses: ContactAddress[];

    // Legacy accessors (optional, for backward compat if needed, but we'll try to migrate fully)
    // We will remove the direct 'email', 'phone', 'location' string fields 
    // and use the arrays instead in the UI.

    avatar?: string;
    rating: number;
    projects?: string[];
    skills: string[];
    availability: AvailabilityStatus;
    lastContact?: string;
    notes?: string;
    socialLinks?: SocialLinks;
    type: ContactType;
    verified: boolean;
    isMock?: boolean;

    // Future sync support
    externalIds?: Record<string, string>; // e.g., { google: "resourceName/123", studiobinder: "id_456" }
    metadata?: Record<string, any>; // e.g., { lastSync: "2024-01-01", etag: "..." }
}
