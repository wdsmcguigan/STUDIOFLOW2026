import { ImportForm } from "@/components/scripts/import-form";
import { importScriptAction } from "./actions";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const action = importScriptAction.bind(null, projectId);

  return (
    <>
      <TopBar title="Import script" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <p className="text-sm text-[color:var(--tx-2)] leading-relaxed">
          Paste a{" "}
          <span className="font-medium text-foreground">Fountain</span>{" "}
          screenplay below. StudioFlow parses it into structured scenes
          instantly — nothing is applied until you review the diff.
        </p>
        <Card>
          <CardContent className="pt-4">
            <ImportForm action={action} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
