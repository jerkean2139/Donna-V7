export interface MetricTile {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "cyan" | "violet" | "mint" | "amber" | "default";
}

const accentClass: Record<NonNullable<MetricTile["accent"]>, string> = {
  cyan: "text-cyan",
  violet: "text-violet",
  mint: "text-mint",
  amber: "text-amber",
  default: "text-text-primary",
};

export function MetricTiles({ tiles }: { tiles: MetricTile[] }) {
  return (
    <section
      aria-label="Workspace metrics"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
    >
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-border-default bg-bg-surface-1 p-5">
          <h3 className="font-display text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            {tile.label}
          </h3>
          <p className={`mt-2 font-display text-3xl font-bold ${accentClass[tile.accent ?? "default"]}`}>
            {tile.value}
          </p>
          {tile.hint && <p className="mt-1 font-mono text-[10px] text-text-muted">{tile.hint}</p>}
        </div>
      ))}
    </section>
  );
}
