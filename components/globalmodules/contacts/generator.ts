import { Contact, ContactType, AvailabilityStatus } from "./types";

const FIRST_NAMES = [
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
    "Christopher", "Daniel", "Paul", "Mark", "Donald", "George", "Kenneth", "Steven", "Edward", "Brian",
    "Michelle", "Lisa", "Betty", "Dorothy", "Sandra", "Ashley", "Kimberly", "Donna", "Emily", "Carol",
    "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Laura", "Sharon", "Cynthia", "Kathleen", "Amy",
    "Shirley", "Angela", "Helen", "Anna", "Brenda", "Pamela", "Nicole", "Emma", "Samantha", "Katherine",
    "Christine", "Debra", "Rachel", "Catherine", "Carolyn", "Janet", "Ruth", "Maria", "Heather", "Diane",
    "Virginia", "Julie", "Joyce", "Victoria", "Olivia", "Kelly", "Christina", "Lauren", "Joan", "Evelyn",
    "Judith", "Megan", "Cheryl", "Andrea", "Hannah", "Martha", "Jacqueline", "Frances", "Gloria", "Ann"
];

const LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor",
    "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson",
    "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "Hernandez", "King",
    "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson", "Carter",
    "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins",
    "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey",
    "Rivera", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez",
    "James", "Watson", "Brooks", "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes", "Ross",
    "Henderson", "Coleman", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores", "Washington",
    "Butler", "Simmons", "Foster", "Gonzales", "Bryant", "Alexander", "Russell", "Griffin", "Diaz", "Hayes"
];

const CITIES = ["Los Angeles, CA", "New York, NY", "Atlanta, GA", "London, UK", "Vancouver, BC", "Austin, TX", "Chicago, IL"];

const ROLES_BY_DEPT: Record<string, string[]> = {
    "Production": ["Set PA", "Office PA", "Truck PA", "Driver", "Production Secretary", "Key Set PA", "Intern"],
    "Camera": ["Camera Loader", "Digital Utility", "Video Assist", "Trainee"],
    "G&E": ["Lamp Operator", "Grip", "Rigging Grip", "Genny Operator"],
    "Art": ["Set Dresser", "Art PA", "Swing", "Prop Assistant"],
    "Wardrobe": ["Costumer", "Stitcher", "Shopper"],
    "HMU": ["Makeup Artist", "Hair Stylist", "Assistant HMU"],
    "Locations": ["Unit Scout", "Assistant Location Manager", "Parking Coordinator"],
    "Post-Production": ["Post PA", "Assistant Editor", "Logger", "Transcriptionist"],
    "Talent": ["Stand-in", "Photo Double", "Background", "Stunt Performer"]
};

// Helper to get random item from array
const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate a random ID
const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

export const generateContact = (
    projectId: string,
    type: ContactType,
    specificDept?: string,
    specificRole?: string
): Contact => {
    const firstName = getRandom(FIRST_NAMES);
    const lastName = getRandom(LAST_NAMES);
    const name = `${firstName} ${lastName}`;

    const department = specificDept || getRandom(Object.keys(ROLES_BY_DEPT));
    const role = specificRole || getRandom(ROLES_BY_DEPT[department] || ["Assistant"]);
    const city = getRandom(CITIES);

    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const rating = Math.floor(Math.random() * 3) + 3; // 3 to 5

    const availability: AvailabilityStatus = getRandom(["available", "busy", "unavailable", "unknown"]);

    return {
        id: generateId("gen"),
        name,
        role,
        department,
        emails: [{ value: email, type: "work", primary: true }],
        phones: [{ value: `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`, type: "mobile", primary: true }],
        addresses: [],
        location: city,
        rating,
        skills: ["General Production", "Hard Working"],
        availability,
        projects: [projectId],
        type,
        verified: false,
        isMock: true
    };
};

export const generateCrewList = (count: number, projectId: string, departments?: string[]): Contact[] => {
    return Array.from({ length: count }).map(() => {
        const dept = departments ? getRandom(departments) : undefined;
        return generateContact(projectId, "crew", dept);
    });
};

export const generateCastList = (count: number, projectId: string): Contact[] => {
    return Array.from({ length: count }).map(() => {
        return generateContact(projectId, "cast", "Talent", getRandom(["Day Player", "Background", "Stunt Performer", "Featured Extra"]));
    });
};


const VENDOR_TYPES = ["Catering", "Security", "Transportation", "Equipment Rental", "Medical", "Location Services", "Post Services"];
const VENDOR_NAMES = [
    "Star Catering", "Safe Set Security", "Apex Rentals", "Cinema Vehicles", "Set Medics", "Loco Locations",
    "Pixel Perfect", "Audio Wizards", "Crafty Craft", "Pro Props", "Light & Grip Co", "Prime Lens Rental"
];
const AGENCIES = ["CAA", "WME", "UTA", "Gersh", "Paradigm", "ICM Partners", "A3 Artists Agency"];
const STUDIOS = ["Warner Bros", "Universal", "Netflix", "Apple TV+", "Amazon Studios", "Paramount", "Disney", "Sony Pictures"];
const POST_VENDOR_TYPES = ["VFX House", "Color Grade", "Sound Mix", "Dailies Processing", "Online Editor", "Music Licensing", "Foley Studio"];
const ATL_ROLES = ["Director", "Executive Producer", "Line Producer", "Co-Producer", "Associate Producer", "Showrunner"];
const PROD_COMPANY_NAMES = ["Bad Robot", "A24", "Blumhouse", "Plan B", "Legendary", "Monkeypaw", "Lucasfilm", "Imagine Entertainment"];

export const generateVendorList = (count: number, projectId: string): Contact[] => {
    return Array.from({ length: count }).map(() => {
        const vendorType = getRandom(VENDOR_TYPES);
        const companyName = getRandom(VENDOR_NAMES);
        // Ensure name implies it's a rep or the company itself
        const contact = generateContact(projectId, "vendor", "Vendors", vendorType);
        return {
            ...contact,
            company: companyName,
            name: `${companyName} Rep (${contact.name.split(' ')[0]})` // e.g. "Apex Rentals Rep (John)"
        };
    });
};

export const generateAgentList = (count: number): Contact[] => {
    return Array.from({ length: count }).map(() => {
        const agency = getRandom(AGENCIES);
        return {
            ...generateContact("1", "agent", "Representation", getRandom(["Talent Agent", "Literary Agent", "Below-the-Line Agent"])),
            company: agency,
            projects: ["1", "2", "3"] // Agents exist outside projects generally, but linked for visibility
        };
    });
};

export const generateExecutiveList = (count: number, projectId: string): Contact[] => {
    return Array.from({ length: count }).map(() => {
        const studio = getRandom(STUDIOS);
        return {
            ...generateContact(projectId, "executive", "Executive", getRandom(["Studio Executive", "VP Development", "Production Executive"])),
            company: studio
        };
    });
};

export const generateClientList = (count: number, projectId: string): Contact[] => {
    return Array.from({ length: count }).map(() => {
        const company = getRandom(STUDIOS);
        return {
            ...generateContact(projectId, "client", "Distribution", getRandom(["Distributor", "Brand Rep", "Marketing Lead"])),
            company: company
        };
    });
};

export const generatePostVendorList = (count: number, projectId: string): Contact[] => {
    return Array.from({ length: count }).map(() => {
        const service = getRandom(POST_VENDOR_TYPES);
        const companyName = getRandom(VENDOR_NAMES); // Using generic vendor names for now
        const contact = generateContact(projectId, "vendor", "Post-Production", service);
        return {
            ...contact,
            company: companyName,
            name: `${companyName} ${service} Rep`
        };
    });
};

export const generateATLList = (count: number, projectId: string): Contact[] => {
    return Array.from({ length: count }).map(() => {
        return generateContact(projectId, "producer", "Production", getRandom(ATL_ROLES));
    });
};

export const generateLocationDeptList = (count: number, projectId: string): Contact[] => {
    return Array.from({ length: count }).map(() => {
        return generateContact(projectId, "location", "Locations", getRandom(["Location Manager", "Assistant Location Manager", "Location Scout", "Location Assistant"]));
    });
};

export const generateProdCompanyList = (count: number): Contact[] => {
    return Array.from({ length: count }).map(() => {
        const company = getRandom(PROD_COMPANY_NAMES);
        return {
            ...generateContact("1", "producer", "Production", "Development Executive"),
            company: company,
            department: "Production Company"
        };
    });
};
