# StudioFlow v2 - Development Guide

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Running Local Development Server
```bash
npm run dev
```
Access the app at `http://localhost:3000`.

## Architecture Concepts

### Single View Architecture
Unlike traditional Next.js apps using many routes, StudioFlow v2 primarily operates within `app/page.tsx` to maintain a persistent state and "App-like" feel without full page reloads. Views are switched by changing the `currentView` state.

### State Management
Currently, the application uses React `useState` at the top level (`app/page.tsx`) to manage the list of projects and the active session.
**Note**: This state is ephemeral and resets on reload.

### Adding a New Module
1. Create a folder in `components/projectmodules/` (e.g., `MyNewModule`).
2. Create the component file (e.g., `index.tsx`).
3. Import it in `app/page.tsx`.
4. Add a case to the conditional rendering block in `app/page.tsx`:
   ```tsx
   } else if (currentView === "my-new-module") {
       return <MyNewModule projectId={currentProject.id} />
   }
   ```
5. Add a button in the Sidebar or Dashboard to set `currentView("my-new-module")`.

## Key/Common Tasks

### Updating the Project Interface
If you need to add a new field to a Project (e.g., "Director"):
1. Update `Project` interface in `app/page.tsx`.
2. Update `Project` interface in `components/globalmodules/Settings/project-manager.tsx`.
3. Update `Project` interface in `components/hooks/useProjectActions.ts`.
*(Future improvement: Centralize types in `types/index.ts`)*

### Adding Background Presets
Edits are made in `components/projectmodules/Settings/project-settings.tsx` within the `backgroundOptions` array.

```tsx
{
    id: "new-gradient",
    name: "New Gradient",
    type: "gradient",
    value: "linear-gradient(...)",
    thumbnail: "",
    isCustom: false
}
```
