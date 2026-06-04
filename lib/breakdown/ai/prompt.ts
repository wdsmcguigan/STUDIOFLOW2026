export interface BreakdownCatalog {
  categories: string[];
  characters: Array<{ primaryName: string; aliases: string[] }>;
  elements: Array<{ name: string; category: string }>;
}

export function buildBreakdownPrompt(args: {
  sceneText: string;
  catalog: BreakdownCatalog;
}): string {
  const { sceneText, catalog } = args;

  const chars =
    catalog.characters
      .map(
        (c) =>
          `- ${c.primaryName}${c.aliases.length ? ` (aka ${c.aliases.join(", ")})` : ""}`,
      )
      .join("\n") || "- (none yet)";

  const els =
    catalog.elements
      .map((e) => `- ${e.name} [${e.category}]`)
      .join("\n") || "- (none yet)";

  return [
    "You are a film script breakdown assistant. Identify production breakdown items in ONE scene.",
    "Rules:",
    "- Output ONLY items literally supported by the scene text.",
    "- For each item, provide a short verbatim `quote` from the scene (plus a little surrounding prefix/suffix) so it can be anchored.",
    "- Use the EXISTING catalog names below when the same entity appears; do NOT invent new names for things already listed.",
    "- For people, set kind='character' with a presence_type (speaking/silent_featured/background/voice_only); if a name looks like an alias of an existing character, set aliasOf to that character's name.",
    "- For non-human items (props, wardrobe, vehicles, sfx, etc.), set kind='element' with the closest category from the list.",
    "- Optionally include a short `description` (appearance/attributes) for each item.",
    "- Include a confidence (0.0–1.0) for each item reflecting how certain you are it is literally present in the scene.",
    "",
    "Existing element categories:",
    catalog.categories.map((c) => `- ${c}`).join("\n"),
    "",
    "Existing characters:",
    chars,
    "",
    "Existing elements:",
    els,
    "",
    "SCENE TEXT:",
    sceneText,
  ].join("\n");
}
