# StudioFlow v2 - Application Structure

## Overview
StudioFlow v2 is a Next.js 14+ application built with TypeScript and Tailwind CSS. It is designed as a single-page application (SPA) feeling dashboard for film production management.

## Directory Structure

```
studio-flow-ui-V0/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main Dashboard logic & View Router
│   ├── globals.css             # Global styles & Tailwind directives
│   └── loading.tsx             # Loading states
├── components/                 # React Components
│   ├── ui/                     # Reusable UI primitives (buttons, inputs, etc.)
│   ├── hooks/                  # Custom React Hooks
│   │   └── useProjectActions.ts # Project CRUD & Export Actions
│   ├── globalmodules/          # Modules available globally
│   │   ├── Settings/           # Global Settings & Project Manager
│   │   │   ├── global-settings.tsx
│   │   │   └── project-manager.tsx
│   │   ├── contacts-manager.tsx
│   │   └── original-calendar.tsx # Global Calendar
│   ├── projectmodules/         # Modules specific to a single project
│   │   ├── Analytics/
│   │   ├── Assets/             # Asset Management
│   │   ├── Budget/
│   │   ├── CallSheets/
│   │   ├── Cast/
│   │   ├── Dailies/
│   │   ├── Gear/
│   │   ├── Legal/
│   │   ├── Locations/
│   │   ├── Moodboard/
│   │   ├── PostProduction/
│   │   ├── Schedule/
│   │   ├── Script/
│   │   ├── Settings/           # Project-Specific Settings
│   │   │   └── project-settings.tsx
│   │   ├── Storyboard/
│   │   ├── Team/
│   │   ├── Users/
│   │   └── VFX/
│   ├── global-tasks-system.tsx # Cross-project task management
│   ├── ai-generation-system.tsx # AI tools interface
│   └── theme-provider.tsx
└── public/                     # Static assets
```

## Key Components

### `app/page.tsx`
This is the heart of the application. It handles:
- **State Management**: `projects`, `currentProject`, `currentView`, `searchQuery`.
- **View Routing**: Conditionally renders components based on `currentView` (e.g., Dashboard, Calendar, Project Settings).
- **Project Creation**: Contains the `createNewProject` logic.
- **Search Logic**: Global and module-specific search filtering.

### `GlobalSettings` & `ProjectManager`
Located in `components/globalmodules/Settings`.
- **GlobalSettings**: Manages app-wide preferences.
- **ProjectManager**: A centralized view to Create, Archive, Export, and Delete projects.

### `ProjectSettings`
Located in `components/projectmodules/Settings`.
- Handles project-specific metadata (Title, Genre, Status).
- **Backgrounds**: Allows selecting gradients or images that update the dashboard thumbnail.

### `useProjectActions` Hook
Centralizes logic for:
- **Exporting**: Zipping project data (using JSZip).
- **Archiving/Deleting**: functionality (currently mock-connected in `ProjectManager`).

## Data Flow
- **Projects**: Stored in local state in `page.tsx` (mock data initiated there).
- **Updates**: `onUpdateProject` callbacks bubble up changes from components like `ProjectSettings` to `page.tsx`.
- **Navigation**: Controlled by `currentView` state in `page.tsx`.
