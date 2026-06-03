import { ImportForm } from "@/components/scripts/import-form";
import { importScriptAction } from "./actions";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const action = importScriptAction.bind(null, projectId);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Import script</h1>
      <p className="text-sm text-muted-foreground">
        Paste a Fountain screenplay. We parse it into structured scenes instantly.
      </p>
      <ImportForm action={action} />
    </main>
  );
}
