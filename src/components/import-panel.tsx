"use client";

import { useMemo, useState, useTransition } from "react";
import { importTires } from "@/app/actions/catalog";
import { FormMessage } from "@/components/auth-shell";
import { IMPORT_FIELDS, guessMapping, mapRows, type ColumnMapping, type ImportField } from "@/lib/import";
import { formatPrice, formatTireSize } from "@/lib/tires";
import type { Supplier } from "@/lib/types";

type Sheet = { headers: string[]; rows: Record<string, unknown>[] };

const MAX_ROWS = 5000;

async function readFile(file: File): Promise<Sheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { default: readXlsxFile } = await import("read-excel-file");
    const matrix = await readXlsxFile(file);
    const [head = [], ...body] = matrix;
    const headers = head.map((h, i) => (h == null || String(h).trim() === "" ? `Columna ${i + 1}` : String(h).trim()));
    const rows = body
      .filter((r) => r.some((c) => c != null && String(c).trim() !== ""))
      .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null])));
    return { headers, rows };
  }
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h, i) => h.trim() || `Columna ${i + 1}`,
  });
  return { headers: result.meta.fields ?? [], rows: result.data };
}

export function ImportPanel({ suppliers, onDone }: { suppliers: Supplier[]; onDone: (imported?: number) => void }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const results = useMemo(() => (sheet ? mapRows(sheet.rows, mapping) : []), [sheet, mapping]);
  const valid = results.filter((r) => r.tire);
  const invalid = results.filter((r) => r.error);

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError("El archivo supera 10 MB.");
    if (!/\.(csv|txt|xlsx)$/i.test(file.name)) return setError("Formato no soportado. Usa .csv o .xlsx.");
    try {
      const data = await readFile(file);
      if (data.rows.length === 0) return setError("El archivo no tiene filas.");
      if (data.rows.length > MAX_ROWS) return setError(`Máximo ${MAX_ROWS} filas por importación.`);
      setSheet(data);
      setMapping(guessMapping(data.headers));
    } catch {
      setError("No se pudo leer el archivo.");
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await importTires({ supplierId: supplierId || null, tires: valid.map((r) => r.tire!) });
      if (res.error) setError(res.error);
      else onDone(res.imported);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase">Importar catálogo</h1>
        <button type="button" className="btn-ghost" onClick={() => onDone()}>
          Volver
        </button>
      </div>
      <p className="text-ink-soft">
        Sube la tarifa de tu proveedor en CSV o Excel (.xlsx). Las filas con referencia que ya existan se actualizan
        (precio y stock); el resto se añaden.
      </p>

      <label className="card flex cursor-pointer flex-col items-center gap-1 border-dashed p-6 text-center">
        <span className="font-semibold">{sheet ? "Cambiar archivo" : "Elegir archivo"}</span>
        <span className="text-sm text-ink-soft">.csv o .xlsx · máximo {MAX_ROWS} filas</span>
        <input
          type="file"
          accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      <FormMessage error={error} />

      {sheet && (
        <>
          <section className="card space-y-3 p-4">
            <h2 className="font-display text-xl font-bold uppercase">Columnas</h2>
            <p className="text-sm text-ink-soft">
              Indica qué columna corresponde a cada dato. Basta con la medida completa o con ancho, perfil y llanta.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={`map-${f.key}`}>
                    {f.label}
                  </label>
                  <select
                    id={`map-${f.key}`}
                    className="input py-2"
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [f.key as ImportField]: e.target.value || undefined }))
                    }
                  >
                    <option value="">— ninguna —</option>
                    {sheet.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div>
              <label className="label" htmlFor="import-supplier">
                Proveedor de este catálogo
              </label>
              <select id="import-supplier" className="input py-2" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="card space-y-2 p-4">
            <h2 className="font-display text-xl font-bold uppercase">Vista previa</h2>
            <p className="text-sm">
              <strong className="text-ok">{valid.length} válidas</strong>
              {invalid.length > 0 && <strong className="ml-2 text-danger">{invalid.length} con errores</strong>}
            </p>
            <ul className="space-y-1 text-sm">
              {valid.slice(0, 5).map((r) => (
                <li key={r.row}>
                  <span className="size-tag">{formatTireSize(r.tire!)}</span> {r.tire!.brand} {r.tire!.model} ·{" "}
                  {formatPrice(r.tire!.price)} · stock {r.tire!.stock}
                </li>
              ))}
            </ul>
            {invalid.length > 0 && (
              <details className="text-sm text-danger">
                <summary className="cursor-pointer">Ver errores</summary>
                <ul className="mt-1 space-y-0.5">
                  {invalid.slice(0, 30).map((r) => (
                    <li key={r.row}>
                      Fila {r.row}: {r.error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <button type="button" disabled={pending || valid.length === 0} onClick={submit} className="btn-primary w-full py-3 text-base">
            {pending ? "Importando…" : `Importar ${valid.length} neumáticos`}
          </button>
        </>
      )}
    </div>
  );
}
