"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DetailRow } from "@/lib/types";

interface OwnerChartProps {
  rows: DetailRow[];
  selectedOwner?: string | null;
  onOwnerClick?: (ownerFull: string) => void;
}

const ELECCION_COLORS: Record<string, string> = {
  lista_espera:    "#3F3D91",
  me_interesa:     "#C97B8B",
  oferta_estandar: "#EF9F27",
  sin_respuesta:   "#D1D5DB",
};

const STACK_KEYS = ["lista_espera", "me_interesa", "oferta_estandar", "sin_respuesta"] as const;

export default function OwnerChart({ rows, selectedOwner, onOwnerClick }: OwnerChartProps) {
  const ownerMap = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const owner = row.hubspot_owner_id || "Sin asignar";
    if (!ownerMap.has(owner)) ownerMap.set(owner, {});
    const counts = ownerMap.get(owner)!;
    counts[row.eleccion] = (counts[row.eleccion] ?? 0) + 1;
  }

  const data = [...ownerMap.entries()]
    .map(([owner, counts]) => ({
      owner,                                          // email completo en eje Y
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      lista_espera:    counts.lista_espera    ?? 0,
      me_interesa:     counts.me_interesa     ?? 0,
      oferta_estandar: counts.oferta_estandar ?? 0,
      sin_respuesta:   counts.sin_respuesta   ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  if (!data.length) return null;

  const barHeight = 36;
  const chartHeight = Math.max(120, data.length * barHeight + 40);
  const hasSelection = !!selectedOwner;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(chartData: any) {
    if (!onOwnerClick) return;
    const owner: string | undefined = chartData?.activePayload?.[0]?.payload?.owner;
    if (owner) onOwnerClick(owner === selectedOwner ? "" : owner);
  }

  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
        Negocios por comercial
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        {onOwnerClick ? "Haz clic en una barra para filtrar la tabla — " : ""}
        Desglose por elección del lead
      </p>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
          onClick={handleClick}
          style={{ cursor: onOwnerClick ? "pointer" : "default" }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" strokeOpacity={0.6} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="owner"
            width={210}
            tick={{ fontSize: 10, fill: "#374151" }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                lista_espera: "Lista espera",
                me_interesa: "Me interesa",
                oferta_estandar: "Oferta estándar",
                sin_respuesta: "Sin respuesta",
              };
              const n = String(name ?? "");
              return [value, labels[n] ?? n];
            }}
          />
          {STACK_KEYS.map((key, ki) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={ELECCION_COLORS[key]}
              radius={ki === STACK_KEYS.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
              barSize={22}
            >
              {data.map((entry) => {
                const dimmed = hasSelection && entry.owner !== selectedOwner;
                return (
                  <Cell
                    key={entry.owner}
                    fill={ELECCION_COLORS[key]}
                    opacity={dimmed ? 0.25 : 1}
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-3">
        {[
          { key: "lista_espera",    label: "Lista espera" },
          { key: "me_interesa",     label: "Me interesa" },
          { key: "oferta_estandar", label: "Oferta estándar" },
          { key: "sin_respuesta",   label: "Sin respuesta" },
        ].map(({ key, label }) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: ELECCION_COLORS[key] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
