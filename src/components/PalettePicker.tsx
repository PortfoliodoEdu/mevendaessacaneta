import { cn } from "@/lib/utils";

export type PaletteId = "p1" | "p2" | "p3" | "p4" | "p5" | "p6";

const palettes: { id: PaletteId; label: string }[] = [
  { id: "p1", label: "Sky / Pink" },
  { id: "p2", label: "Mint / Cyan" },
  { id: "p3", label: "Lemon / Orange" },
  { id: "p4", label: "Lavender / Purple" },
  { id: "p5", label: "Rose / Red" },
  { id: "p6", label: "Green / Neon" },
];

export function PalettePicker({
  value,
  onChange,
}: {
  value: PaletteId;
  onChange: (v: PaletteId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {palettes.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn(
            "rounded-2xl border border-border bg-card p-3 text-left transition-all",
            "active:scale-[0.99] touch-manipulation tap-highlight-none",
            value === p.id && "ring-2 ring-primary ring-offset-2"
          )}
        >
          <div className={cn("rounded-xl h-10 w-full mb-2", "palette-swatch")} data-palette={p.id} />
          <div className="text-sm font-semibold text-foreground">{p.label}</div>
          <div className="text-xs text-muted-foreground">Pastel + Neon</div>
        </button>
      ))}
    </div>
  );
}

