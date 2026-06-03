import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/projects/schema";

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p className="text-muted-foreground">No projects yet. Create your first above.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <li key={p.id}>
          <Card className="p-4">
            <h3 className="font-medium">{p.title}</h3>
            <p className="text-sm text-muted-foreground">{p.status}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
