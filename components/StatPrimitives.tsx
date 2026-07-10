export function StatTile({
  label,
  value,
  hint,
  accent,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** Category dot beside the label. */
  accent?: string;
  /** Colors the value itself, to flag an at-risk number. */
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-ink-3">
        {accent && (
          <span aria-hidden className="size-1.5 rounded-full" style={{ background: accent }} />
        )}
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold tracking-tight text-ink"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="grid h-40 place-items-center">
      <p className="text-sm text-ink-3">{message}</p>
    </div>
  );
}
