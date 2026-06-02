import { Contact } from "./types";
import {
    generateCrewList, generateCastList, generateVendorList, generateAgentList,
    generateExecutiveList, generateClientList, generatePostVendorList,
    generateATLList, generateLocationDeptList, generateProdCompanyList
} from "./generator";

// =========================================================================
// MANUAL "KEY PLAYERS" (High Detail)
// =========================================================================

const MANUAL_AGENTS: Contact[] = [
    {
        id: "agt_1", name: "Ari Gold", role: "Senior Agent", department: "Representation", company: "Miller Gold Agency",
        emails: [{ value: "ari@millergold.example.com", type: "work", primary: true }],
        phones: [{ value: "+1 (555) 000-1111", type: "mobile", primary: true }],
        addresses: [{ street: "123 Wilshire Blvd", city: "Beverly Hills", state: "CA", zip: "90210", country: "USA", type: "work" }],
        location: "Beverly Hills, CA", rating: 5, skills: ["Negotiation", "Packaging"], availability: "busy",
        notes: "Don't call him before 9am.", type: "agent", verified: true, isMock: true
    },
    {
        id: "agt_2", name: "Susie Myerson", role: "Talent Manager", department: "Representation", company: "Myerson Mgmt",
        emails: [{ value: "susie@myerson.example.com", type: "work", primary: true }],
        phones: [], addresses: [], location: "New York, NY", rating: 5, skills: ["Career Strategy"], availability: "available",
        type: "agent", verified: true, isMock: true
    },
    {
        id: "agt_3", name: "Dan Gordon", role: "Literary Agent", department: "Representation", company: "CAA",
        emails: [{ value: "d.gordon@caa.example.com", type: "work", primary: true }],
        phones: [], addresses: [], location: "Los Angeles, CA", rating: 4, skills: ["Script Sales"], availability: "busy",
        type: "agent", verified: true, isMock: true
    }
];

const MANUAL_CAST: Contact[] = [
    {
        id: "cast_lead_1", name: "Tom Cruise (Mock)", role: "Actor (Lead)", department: "Talent",
        emails: [], phones: [], addresses: [], location: "Los Angeles, CA", rating: 5, skills: ["Stunts", "Acting"], availability: "unavailable",
        projects: ["1"], type: "cast", verified: true, isMock: true
    },
    {
        id: "cast_lead_2", name: "Meryl Streep (Mock)", role: "Actor (Lead)", department: "Talent",
        emails: [], phones: [], addresses: [], location: "New York, NY", rating: 5, skills: ["Drama", "Accents"], availability: "busy",
        projects: ["1"], type: "cast", verified: true, isMock: true
    },
    {
        id: "cast_supp_1", name: "Viola Davis (Mock)", role: "Actor (Supporting)", department: "Talent",
        emails: [], phones: [], addresses: [], location: "Los Angeles, CA", rating: 5, skills: ["Drama"], availability: "available",
        projects: ["1"], type: "cast", verified: true, isMock: true
    },
    {
        id: "cast_supp_2", name: "Pedro Pascal (Mock)", role: "Actor (Supporting)", department: "Talent",
        emails: [], phones: [], addresses: [], location: "Los Angeles, CA", rating: 5, skills: ["Action"], availability: "busy",
        projects: ["1", "2"], type: "cast", verified: true, isMock: true
    }
];

// =========================================================================
// PROJECT 1: Midnight Chronicles (Production Phase)
// =========================================================================
const PROJECT_1_KEY_CREW: Contact[] = [
    {
        id: "mc_prod_1", name: "Sarah Jenkins", role: "Unit Production Manager", department: "Production",
        emails: [{ value: "sarah.j.upm@example.com", type: "work", primary: true }],
        phones: [{ value: "+1 (555) 010-1001", type: "mobile", primary: true }],
        addresses: [], location: "Los Angeles, CA", rating: 5, skills: ["Budgeting", "Union Contracts"], availability: "busy", notes: "Strict but fair.", projects: ["1"], type: "crew", verified: true, isMock: true
    },
    {
        id: "mc_cam_1", name: "Elena Rodriguez", role: "Director of Photography", department: "Camera",
        emails: [{ value: "elena.dp@lumina.com", type: "work", primary: true }],
        phones: [], addresses: [], location: "New York, NY", rating: 5, skills: ["Lighting", "Arri Alexa"], availability: "unavailable", projects: ["1"], type: "crew", verified: true, isMock: true
    },
    {
        id: "mc_ge_1", name: "Mike Kowalski", role: "Key Grip", department: "G&E",
        emails: [{ value: "mike.grip@example.com", type: "work", primary: true }],
        phones: [], addresses: [], location: "Chicago, IL", rating: 5, skills: ["Rigging"], availability: "available", projects: ["1"], type: "crew", verified: true, isMock: true
    },
];

// Generate Filler Crew for Project 1 (Production Needs)
const PROJECT_1_FILLER_CREW = generateCrewList(40, "1", ["Production", "Camera", "G&E", "Art", "Wardrobe", "HMU", "Sound"]);
const PROJECT_1_FILLER_CAST = generateCastList(15, "1");
const PROJECT_1_VENDORS = generateVendorList(10, "1"); // Increased vendor count


// =========================================================================
// PROJECT 2: Urban Legends (Development Phase)
// =========================================================================
const PROJECT_2_KEY_CREW: Contact[] = [
    {
        id: "ul_wri_1", name: "Arthur Penhaligon", role: "Head Writer", department: "Writing",
        emails: [{ value: "arthur@example.com", type: "work", primary: true }],
        phones: [{ value: "+1 (555) 010-2001", type: "mobile", primary: true }],
        addresses: [], location: "London, UK", rating: 5, skills: ["Show Bible"], availability: "available", projects: ["2"], type: "crew", verified: true, isMock: true
    },
    {
        id: "ul_prod_1", name: "Evelyn Sterling", role: "Creative Producer", department: "Production",
        emails: [{ value: "evelyn@example.com", type: "work", primary: true }],
        phones: [], addresses: [], location: "New York, NY", rating: 4, skills: ["Development"], availability: "unknown", projects: ["2"], type: "producer", verified: true, isMock: true
    },
];
const PROJECT_2_FILLER_CREW = generateCrewList(15, "2", ["Production", "Locations", "Art"]);
const PROJECT_2_EXECUTIVES = generateExecutiveList(8, "2"); // Studio Execs watching development
const PROJECT_2_CLIENTS = generateClientList(4, "2");

// =========================================================================
// PROJECT 3: Neon Nights (Post-Production Phase)
// =========================================================================
const PROJECT_3_KEY_CREW: Contact[] = [
    {
        id: "nn_post_1", name: "Gary Postman", role: "Post Supervisor", department: "Post-Production",
        emails: [{ value: "gary@example.com", type: "work", primary: true }],
        phones: [], addresses: [], location: "Los Angeles, CA", rating: 5, skills: ["Workflow"], availability: "busy", projects: ["3"], type: "crew", verified: true, isMock: true
    },
    {
        id: "nn_edit_1", name: "David Cutter", role: "Lead Editor", department: "Post-Production",
        emails: [{ value: "david@example.com", type: "work", primary: true }],
        phones: [], addresses: [], location: "Los Angeles, CA", rating: 5, skills: ["Avid"], availability: "busy", projects: ["3"], type: "crew", verified: true, isMock: true
    }
];
const PROJECT_3_FILLER_CREW = generateCrewList(20, "3", ["Post-Production"]);
const PROJECT_3_VENDORS = generateVendorList(6, "3"); // VFX Houses, Sound Stages
const PROJECT_3_CLIENTS = generateClientList(3, "3"); // Distributors awaiting delivery

// =========================================================================
// GENERAL / SHARED
// =========================================================================
const SHARED_AGENTS = generateAgentList(10); // More agents


// =========================================================================
// NEW SPECIALIZED ROLES
// =========================================================================
const ADDITIONAL_ATL = generateATLList(12, "1"); // Producers/Directors across projects (defaulting to 1 for lists)
const ADDITIONAL_LOCATIONS = generateLocationDeptList(10, "1");
const ADDITIONAL_POST_VENDORS = generatePostVendorList(12, "3");
const PROD_COMPANIES = generateProdCompanyList(8);

// =========================================================================
// MERGE ALL
// =========================================================================
export const MOCK_CONTACTS: Contact[] = [
    ...MANUAL_AGENTS,
    ...SHARED_AGENTS,
    ...MANUAL_CAST,
    ...PROJECT_1_KEY_CREW,
    ...PROJECT_1_FILLER_CREW,
    ...PROJECT_1_FILLER_CAST,
    ...PROJECT_1_VENDORS,
    ...PROJECT_2_KEY_CREW,
    ...PROJECT_2_FILLER_CREW,
    ...PROJECT_2_EXECUTIVES,
    ...PROJECT_2_CLIENTS,
    ...PROJECT_3_KEY_CREW,
    ...PROJECT_3_FILLER_CREW,
    ...PROJECT_3_VENDORS,
    ...PROJECT_3_CLIENTS,

    // New Additions
    ...ADDITIONAL_ATL,
    ...ADDITIONAL_LOCATIONS,
    ...ADDITIONAL_POST_VENDORS,
    ...PROD_COMPANIES
];

