# Standard Best Practices

## Code Style & Structure

### React Components
- **Functional Components**: Use functional components with Hooks. Avoid Class components.
- **Props Interface**: Always define a TypeScript interface for props.
  ```tsx
  interface MyComponentProps {
      title: string;
      isActive?: boolean;
  }
  ```
- **Lucide Icons**: Use `lucide-react` for all icons to maintain design consistency.

### Styling
- **Tailwind CSS**: Use utility classes for styling. Avoid inline `style={{}}` unless dynamic values (like gradients) are required.
- **Colors**: Use the established palette (slate/zinc for dark mode backgrounds, blue/purple for accents).
- **Glassmorphism**: Use `bg-white/10 backdrop-blur-md` for panels and overlays to match the "StudioFlow" aesthetic.

## Accessibility (A11y)
- **Buttons**: Ensure all buttons have `aria-label` if they contain only icons.
- **Colors**: Maintain sufficient contrast for text (text-white vs text-white/50).
- **Keyboard Nav**: Ensure custom interactive elements (like custom dropdowns) are focusable and usable via keyboard.

## Performance
- **Image Optimization**: Use `next/image` for images to leverage lazy loading and optimization.
- **Code Splitting**: Since we use a large `page.tsx` with conditional rendering, ensure heavy components are dynamically imported if the bundle size grows too large (using `next/dynamic`).
- **Memoization**: Use `useMemo` for expensive calculations (like filtering large project lists) and `useCallback` for functions passed down to children to prevent unnecessary re-renders.

## Git Workflow
- **Commits**: Use descriptive commit messages (e.g., "feat: add gradient backgrounds", "fix: project deletion bug").
- **Branches**: Create feature branches (`feat/new-module`) rather than pushing directly to main.
