import type { Scene } from "@/lib/scripts/schema";

export function SceneList({
  projectId,
  scriptId,
  scenes,
}: {
  projectId: string;
  scriptId: string;
  scenes: Scene[];
}) {
  if (scenes.length === 0) {
    return <p className="text-muted-foreground">No scenes yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1 pr-3">#</th>
          <th className="py-1 pr-3">I/E</th>
          <th className="py-1 pr-3">Location</th>
          <th className="py-1 pr-3">D/N</th>
          <th className="py-1 pr-3">8ths</th>
          <th className="py-1 pr-3">Synopsis</th>
        </tr>
      </thead>
      <tbody>
        {scenes.map((s) => (
          <tr key={s.id} className={s.status === "omitted" ? "text-muted-foreground line-through" : ""}>
            <td className="py-1 pr-3">
              <a
                href={`/dashboard/${projectId}/scripts/${scriptId}/scenes/${s.id}`}
                className="underline"
              >
                {s.scene_number ?? s.ordinal + 1}
              </a>
              {s.status === "omitted" ? <span className="ml-1 no-underline">(omitted)</span> : null}
            </td>
            <td className="py-1 pr-3">{s.int_ext}</td>
            <td className="py-1 pr-3">{s.location_slug}</td>
            <td className="py-1 pr-3">{s.time_of_day}</td>
            <td className="py-1 pr-3">{s.page_eighths}</td>
            <td className="py-1 pr-3">{s.synopsis}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
