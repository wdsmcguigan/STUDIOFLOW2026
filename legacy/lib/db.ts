
import Dexie, { type EntityTable } from 'dexie';

interface TeamMember {
    id?: string;
    name: string;
    role: string;
    avatar: string;
}

export interface InputState {
    sceneScript: string;
    characterDetails: string;
    visualStyle: string;
    locationAssets: { id: string; base64: string; type: string; selected?: boolean }[];
    characterAssets: { id: string; base64: string; type: string; selected?: boolean }[];
    styleAssets: { id: string; base64: string; type: string; selected?: boolean }[];
    generationMode: 'prompt' | 'direct';
    aspectRatio: string;
    selectedModel: string;
    activeTab: 'image' | 'video';
    // Video Specifics
    videoTask?: 'text-to-video' | 'image-to-video' | 'reference-to-video';
    generateAudio?: boolean;
    startFrame?: { id: string; base64: string; type: string; selected?: boolean }[];
    endFrame?: { id: string; base64: string; type: string; selected?: boolean }[];
    subjectReference?: { id: string; base64: string; type: string; selected?: boolean }[];
}

export interface Preset {
    id: string;
    name: string;
    inputs: InputState;
    createdAt: Date;
}

export interface GeneratedAsset {
    id: string;
    type: 'image' | 'video';
    url: string;
    prompt: string;
    timestamp: Date | string;
    model?: string;
    inputs?: InputState;  // Snapshot of inputs for recall
}

export interface ProjectAsset {
    id: string;
    name: string;
    type: "image" | "video" | "audio" | "document" | "other";
    url: string;
    size: string;
    dateAdded: string;
    folderId: string;
    prompt?: string;
    model?: string;
    source?: "uploaded" | "generated";
    generationId?: string;
    tags?: string[];
}

interface Project {
    id: string;
    title: string;
    type?: string;
    status: "development" | "pre-production" | "production" | "post-production" | "completed" | "archived";
    progress?: number;
    budget?: number;
    budgetUsed?: number;
    daysRemaining?: number;
    totalDays?: number;
    director?: string;
    producer?: string;
    genre?: string;
    format?: string;
    lastActivity?: string;
    thumbnail?: string;
    priority?: "high" | "medium" | "low";
    aiInsights?: string[];
    team?: TeamMember[];
    calendars?: string[];
    contacts?: string[];
    backgroundImage?: string;
    backgroundType?: "image" | "gradient" | "color";
    backgroundColor?: string;
    startDate?: string;
    endDate?: string;
    tasks?: { total: number; completed: number; pending: number; blocked: number };
    nextMilestone?: string;
    description?: string;
    // New Fields
    platformType?: 'film' | 'tv' | 'commercial' | 'web';
    summary?: string;
    estimatedBudget?: number;
    // Team
    writer?: string;
    // director already exists
    dop?: string;
    editor?: string;
    agency?: string;
    productionCompany?: string;
    // producer already exists
    executiveProducer?: string;
    // Display
    moduleVisibility?: Record<string, boolean>;

    size?: string; // Keep for compatibility if needed, though not page.tsx interface
    isMock?: boolean;
    generationHistory?: GeneratedAsset[];
    presets?: Preset[];
    assets?: ProjectAsset[];
    folders?: AssetFolder[];
}

export interface AssetFolder {
    id: string;
    name: string;
    parentId: string | null;
    icon?: string;
    color?: string;
}

export const DEFAULT_FOLDERS: AssetFolder[] = [
    { id: "f_dev", name: "Development", parentId: null, icon: "Briefcase", color: "text-blue-400" },
    { id: "f_pre", name: "Preproduction", parentId: null, icon: "ClipboardList", color: "text-indigo-400" },
    { id: "f_vis", name: "PreVisualization", parentId: null, icon: "Eye", color: "text-purple-400" },
    { id: "f_scr", name: "Scripts", parentId: null, icon: "FileText", color: "text-yellow-400" },
    { id: "f_prod", name: "Production", parentId: null, icon: "Camera", color: "text-red-400" },
    { id: "f_post", name: "Post-Production", parentId: null, icon: "MonitorPlay", color: "text-cyan-400" },
    { id: "f_loc", name: "Locations", parentId: null, icon: "MapPin", color: "text-green-400" },
    { id: "f_cast", name: "Characters/Cast", parentId: null, icon: "Users", color: "text-pink-400" },
    { id: "f_foot", name: "Footage", parentId: null, icon: "Film", color: "text-orange-400" },
    { id: "f_vfx", name: "VFX", parentId: null, icon: "Wand2", color: "text-fuchsia-400" },
    { id: "f_gfx", name: "Graphics", parentId: null, icon: "Image", color: "text-teal-400" },
    { id: "f_aud", name: "Audio", parentId: null, icon: "Mic", color: "text-emerald-400" },
    { id: "f_scrn", name: "Screeners", parentId: null, icon: "Tv", color: "text-sky-400" },
    { id: "f_del", name: "Deliveries", parentId: null, icon: "Package", color: "text-lime-400" },
];

interface BudgetLineItem {
    id: string;
    lineNumber: number;
    category: string;
    subcategory: string;
    description: string;
    crew?: number;
    days?: number;
    rate?: number;
    overtime?: number;
    estimatedTotal: number;
    actualTotal: number;
    notes: string;
    aiGenerated: boolean;
    lastUpdated: string;
    source?: string;
    isMock?: boolean;
}

// We'll store budget items flattened, keyed by project ID
interface BudgetLineItemWithProject extends BudgetLineItem {
    projectId: string;
}

const db = new Dexie('StudioFlowDB') as Dexie & {
    projects: EntityTable<Project, 'id'>;
    budgetItems: EntityTable<BudgetLineItemWithProject, 'id'>;
};

// Schema definition
db.version(2).stores({
    projects: 'id, title, status, lastActivity, isMock',
    budgetItems: 'id, projectId, category, subcategory, description, isMock'
});

// Seed function to be called by components if DB is empty
export const seedMockData = async () => {
    const count = await db.projects.count();

    // Check if we need to migrate existing mocks (if they don't have folders)
    if (count > 0) {
        const mocks = await db.projects.where('id').anyOf(['1', '2', '3']).toArray();
        for (const mock of mocks) {
            if (!mock.folders || mock.folders.length === 0) {
                await db.projects.update(mock.id, { folders: DEFAULT_FOLDERS });
            }
        }
        return;
    }

    const mockProjects: Project[] = [
        {
            id: "1",
            title: "Midnight Chronicles",
            status: "production",
            priority: "high",
            progress: 65,
            startDate: "2024-03-01",
            endDate: "2024-08-15",
            budget: 15000000,
            budgetUsed: 8400000,
            team: [
                { id: "1", name: "Sarah J.", role: "Director", avatar: "SJ" },
                { id: "2", name: "Mike R.", role: "Producer", avatar: "MR" },
                { id: "3", name: "Elena K.", role: "DoP", avatar: "EK" },
                { id: "4", name: "David L.", role: "Editor", avatar: "DL" },
            ],
            tasks: { total: 145, completed: 82, pending: 63, blocked: 4 },
            nextMilestone: "Principal Photography Wrap",
            daysRemaining: 42,
            totalDays: 120,
            lastActivity: "2 hours ago",
            thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop",
            description: "A cyberpunk noir thriller set in 2089 Tokyo.",
            backgroundType: "image",
            backgroundImage: "/backgrounds/mountain-peaks.jpg",
            backgroundColor: "",
            calendars: ["cal_1", "cal_2"],
            isMock: true,
            size: "1.2 GB",
            folders: DEFAULT_FOLDERS
        },
        {
            id: "2",
            title: "Urban Legends",
            type: "Series",
            genre: "Horror Anthology",
            format: "Limited Series",
            status: "development",
            priority: "medium",
            progress: 25,
            startDate: "2024-06-01",
            endDate: "2024-12-20",
            budget: 8000000,
            budgetUsed: 450000,
            team: [
                { id: "5", name: "Chris P.", role: "Showrunner", avatar: "CP" },
                { id: "6", name: "Anna M.", role: "Writer", avatar: "AM" },
            ],
            tasks: { total: 85, completed: 20, pending: 60, blocked: 5 },
            nextMilestone: "Script Lockdown",
            daysRemaining: 180,
            totalDays: 200,
            lastActivity: "1 day ago",
            thumbnail: "https://images.unsplash.com/photo-1509347528160-9a9e33742cd4?q=80&w=800&auto=format&fit=crop",
            description: "An anthology series exploring modern urban myths.",
            backgroundType: "gradient",
            backgroundImage: "",
            backgroundColor: "linear-gradient(to right, #243B55, #141E30)",
            calendars: [],
            isMock: true,
            size: "450 MB",
            folders: DEFAULT_FOLDERS
        },
        {
            id: "3",
            title: "Neon Nights",
            type: "Commercial",
            genre: "Tech Commercial",
            format: "30s Spot",
            status: "post-production",
            priority: "low",
            progress: 90,
            budget: 500000,
            budgetUsed: 450000,
            daysRemaining: 5,
            totalDays: 14,
            lastActivity: "1 week ago",
            backgroundType: "color",
            backgroundColor: "#f59e0b",
            description: "High energy tech commercial.",
            isMock: true,
            size: "3.4 GB",
            folders: DEFAULT_FOLDERS
        },
    ];

    await db.projects.bulkAdd(mockProjects);

    // Note: We won't seed budget items here. 
    // We'll let the budget module seed them when a project is opened to allow for dynamic generation 
    // based on the multiplier logic we saw in the original file, 
    // or we can refactor that generator to save to DB on first load.
};

export { db };
export type { Project, BudgetLineItem, BudgetLineItemWithProject };
