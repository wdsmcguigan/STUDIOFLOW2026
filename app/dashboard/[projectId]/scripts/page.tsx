import { listScripts } from "@/lib/scripts/data";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default async function ScriptsIndexPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const scripts = await listScripts(projectId);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.3px]">Scripts</h1>
        <Link
          href={`/dashboard/${projectId}/import`}
          className="text-sm text-[var(--brand-on)] underline underline-offset-2 hover:text-[var(--brand)]"
        >
          Import script
        </Link>
      </div>

      {scripts.length === 0 ? (
        <p className="text-[var(--tx-2)]">
          No scripts yet —{" "}
          <Link
            className="underline underline-offset-2 hover:text-[var(--brand)]"
            href={`/dashboard/${projectId}/import`}
          >
            import one
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {scripts.map((s) => (
            <li key={s.id}>
              <Link href={`/dashboard/${projectId}/scripts/${s.id}`}>
                <Card className="cursor-pointer p-4 transition-colors hover:bg-[var(--s3)]">
                  <h3 className="font-display font-bold leading-snug">{s.title}</h3>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
