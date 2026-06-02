# Issues and Todo List

## Current Limitations

### Data Persistence
- **Issue**: All data (Projects, Tasks, Settings) is stored in React State (`useState`) in `app/page.tsx`.
- **Impact**: Refreshing the browser resets the application to the initial mock data.
- **Fix**: Implement LocalStorage persistence or a backend database (Supabase/Firebase/Postgres).

### Type Duplication
- **Issue**: The `Project` interface is defined in multiple files (`page.tsx`, `project-manager.tsx`, `useProjectActions.ts`).
- **Impact**: Maintaining consistency is difficult; changing a field requires edits in 3+ places.
- **Fix**: Move shared interfaces to a `types/` directory.

### Asset Management
- **Issue**: Asset uploads are simulated.
- **Impact**: Files are not actually uploaded to a server.
- **Fix**: Integrate with an object storage provider (AWS S3, Vercel Blob).

### Export Functionality
- **Issue**: The `exportProject` function creates a ZIP but uses mock assets.
- **Fix**: Connect to the real `AssetManagement` system to pull actual files.

## Known Bugs
- **Dev Server Port**: Occasionally `npm run dev` locks slightly, requiring `rm -rf .next/dev/lock` or killing the process on port 3000/3010 manually.
- **Hover Menus**: Sometimes the hover menu on project cards can be tricky to click if the mouse moves too fast (requires precise padding/margin handling).

## Future Roadmap
1. **Backend Integration**: Move to a real DB.
2. **Auth**: Implement Clerk or NextAuth.
3. **Real-time**: Use WebSockets for collaboration on Scripts/Schedules.
4. **Mobile Responsiveness**: Optimize complex tables (Budget, Schedule) for mobile views.
