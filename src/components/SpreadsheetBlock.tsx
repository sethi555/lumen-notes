import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export type SheetData = { rows: number; cols: number; cells: Record<string, string> };

const colLabel = (c: number) => String.fromCharCode(65 + c);
const key = (r: number, c: number) => `${colLabel(c)}${r + 1}`;

// Minimal inline formula engine: =SUM(A1:A5), =AVG(...), or numeric refs.
function evaluate(raw: string, cells: Record<string, string>, depth = 0): string {
  if (depth > 20 || !raw.startsWith("=")) return raw;
  const expr = raw.slice(1).trim().toUpperCase();
  const fn = expr.match(/^(SUM|AVG|AVERAGE|MIN|MAX|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
  if (fn) {
    const [, name, a, b] = fn;
    const ca = a.charCodeAt(0) - 65, ra = parseInt(a.slice(1)) - 1;
    const cb = b.charCodeAt(0) - 65, rb = parseInt(b.slice(1)) - 1;
    const nums: number[] = [];
    for (let r = Math.min(ra, rb); r <= Math.max(ra, rb); r++)
      for (let c = Math.min(ca, cb); c <= Math.max(ca, cb); c++) {
        const v = parseFloat(evaluate(cells[key(r, c)] ?? "", cells, depth + 1));
        if (!isNaN(v)) nums.push(v);
      }
    if (!nums.length) return "0";
    const sum = nums.reduce((s, n) => s + n, 0);
    switch (name) {
      case "SUM": return String(sum);
      case "AVG": case "AVERAGE": return String(sum / nums.length);
      case "MIN": return String(Math.min(...nums));
      case "MAX": return String(Math.max(...nums));
      case "COUNT": return String(nums.length);
    }
  }
  // simple arithmetic of cell refs / numbers
  try {
    const replaced = expr.replace(/[A-Z]+\d+/g, (ref) => evaluate(cells[ref] ?? "0", cells, depth + 1) || "0");
    if (/^[\d+\-*/().\s]+$/.test(replaced)) return String(Function(`"use strict";return(${replaced})`)());
  } catch { /* ignore */ }
  return raw;
}

export function SpreadsheetBlock({ value, onChange }: { value: SheetData; onChange: (v: SheetData) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const cells = value.cells;
  const display = useMemo(() => {
    const out: Record<string, string> = {};
    for (let r = 0; r < value.rows; r++) for (let c = 0; c < value.cols; c++) {
      const k = key(r, c);
      out[k] = evaluate(cells[k] ?? "", cells);
    }
    return out;
  }, [cells, value.rows, value.cols]);

  const setCell = (k: string, v: string) => onChange({ ...value, cells: { ...cells, [k]: v } });

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-8 border border-border bg-muted/60" />
            {Array.from({ length: value.cols }, (_, c) => (
              <th key={c} className="border border-border bg-muted/60 px-2 py-1 font-medium text-muted-foreground">{colLabel(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: value.rows }, (_, r) => (
            <tr key={r}>
              <td className="border border-border bg-muted/60 px-2 py-1 text-center text-muted-foreground">{r + 1}</td>
              {Array.from({ length: value.cols }, (_, c) => {
                const k = key(r, c);
                return (
                  <td key={c} className="border border-border p-0">
                    {editing === k ? (
                      <input
                        autoFocus
                        className="w-full bg-background px-2 py-1 outline-none"
                        defaultValue={cells[k] ?? ""}
                        onBlur={(e) => { setCell(k, e.target.value); setEditing(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    ) : (
                      <div className="min-h-[28px] cursor-cell px-2 py-1" onClick={() => setEditing(k)}>{display[k]}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 border-t border-border bg-muted/30 p-2">
        <Button size="sm" variant="ghost" onClick={() => onChange({ ...value, rows: value.rows + 1 })}><Plus className="mr-1 h-3 w-3" />Row</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({ ...value, cols: Math.min(value.cols + 1, 12) })}><Plus className="mr-1 h-3 w-3" />Column</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({ ...value, rows: Math.max(1, value.rows - 1) })}><Trash2 className="mr-1 h-3 w-3" />Row</Button>
      </div>
    </div>
  );
}
