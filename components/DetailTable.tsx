"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Download } from "lucide-react";
import { DetailRow, Eleccion } from "@/lib/types";

interface DetailTableProps {
  rows: DetailRow[];
}

type SortKey = keyof DetailRow;
type SortDir = "asc" | "desc";

const ELECCION_LABEL: Record<Eleccion, string> = {
  lista_espera:   "Lista espera",
  oferta_estandar:"Oferta estándar",
  me_interesa:    "Me interesa",
  sin_respuesta:  "Sin respuesta",
};

const ELECCION_COLOR: Record<Eleccion, string> = {
  lista_espera:    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  oferta_estandar: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  me_interesa:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  sin_respuesta:   "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const COLUMNS: { key: SortKey; label: string; truncate?: boolean }[] = [
  { key: "dealname",                       label: "Nombre" },
  { key: "nid",                            label: "NID" },
  { key: "cellphone",                      label: "Teléfono" },
  { key: "eleccion",                       label: "Elección" },
  { key: "mensajes_exitosos",              label: "Entregado" },
  { key: "hubspot_owner_id",               label: "Owner" },
  { key: "segmento_seller_mx",             label: "Segmento" },
  { key: "sub_segmento_seller_mx",         label: "Sub-segmento",  truncate: true },
  { key: "razon_de_venta_usuario_gabi_mx", label: "Razón de venta", truncate: true },
  { key: "deal_uuid",                      label: "UUID",          truncate: true },
];

export default function DetailTable({ rows }: DetailTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("dealname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = String(a[sortKey] ?? "");
    const bv = String(b[sortKey] ?? "");
    const cmp = av.localeCompare(bv, "es", { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  async function handleDownload() {
    const { utils, writeFile } = await import("xlsx");

    const excelRows = sorted.map((r) => ({
      "Nombre":          r.dealname || "",
      "NID":             r.nid || "",
      "Teléfono":        r.cellphone || "",
      "Elección":        ELECCION_LABEL[r.eleccion],
      "Entregado":       r.mensajes_exitosos === 1 ? "Sí" : "No",
      "Owner":           r.hubspot_owner_id || "",
      "Segmento":        r.segmento_seller_mx || "",
      "Sub-segmento":    r.sub_segmento_seller_mx || "",
      "Razón de venta":  r.razon_de_venta_usuario_gabi_mx || "",
      "UUID":            r.deal_uuid || "",
    }));

    const ws = utils.json_to_sheet(excelRows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Leads");

    const date = new Date().toISOString().slice(0, 10);
    writeFile(wb, `detalle_leads_CHP_MX_${date}.xlsx`);
  }

  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Detalle por lead
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {rows.length} leads
          </span>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              {COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {sortKey === key ? (
                      sortDir === "asc"
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {sorted.map((row) => (
              <tr
                key={row.deal_uuid}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
              >
                <td className="px-3 py-2.5 text-zinc-900 dark:text-zinc-100 font-medium whitespace-nowrap">
                  {row.dealname || "—"}
                </td>
                <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap font-mono text-xs">
                  {row.nid || "—"}
                </td>
                <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {row.cellphone || "—"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ELECCION_COLOR[row.eleccion]}`}>
                    {ELECCION_LABEL[row.eleccion]}
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {row.mensajes_exitosos === 1 ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Sí
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                      No
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap text-xs">
                  {row.hubspot_owner_id || "—"}
                </td>
                <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {row.segmento_seller_mx || "—"}
                </td>
                <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate">
                  {row.sub_segmento_seller_mx || "—"}
                </td>
                <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate">
                  {row.razon_de_venta_usuario_gabi_mx || "—"}
                </td>
                <td className="px-3 py-2.5 text-zinc-400 dark:text-zinc-500 font-mono text-xs max-w-[140px] truncate">
                  {row.deal_uuid || "—"}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-sm text-zinc-400">
                  Sin datos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
