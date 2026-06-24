export function InstructionsBlock({ text, title = "Instructions" }: { text: string; title?: string }) {
  const lines = (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <section className="bg-primary-soft/40 border border-primary/20 rounded-xl p-4 space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-primary">{title}</h2>
      <ul className="text-[11px] text-foreground/80 space-y-1 list-disc pl-4">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </section>
  );
}
