"use client";

import { useMemo, useState } from "react";
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
import { DateGrouping, DetailRow } from "@/lib/types";
import { groupDate } from "@/lib/data-processing";

interface OwnerChartProps {
  rows: DetailRow[];
  dateGrouping: DateGrouping;
  onBarClick?: (uuids: Set<string> | null, label?: string) => void;
}

const LEADER_MAP: Record<string, string> = {
  "joseperez@tuhabi.mx":        "David Franco",
  "leonardoalvarado@tuhabi.mx": "David Franco",
  "adairlara@tuhabi.mx":        "David Franco",
  "carlospatricio@tuhabi.mx":   "David Franco",
  "abidaelperez@tuhabi.mx":     "David Franco",
  "dianaminero@tuhabi.mx":      "David Franco",
  "fernandatejeda@tuhabi.mx":   "David Franco",
  "deliamarquez@tuhabi.mx":     "David Franco",

  "lorenadelgado@tuhabi.mx":    "David López",
  "silviagonzalez@tuhabi.mx":   "David López",
  "kevinarizona@tuhabi.mx":     "David López",
  "joseplascencia@tuhabi.mx":   "David López",
  "rubenlugo@tuhabi.mx":        "David López",
  "axelponce@tuhabi.mx":        "David López",
  "monicarios@tuhabi.mx":       "David López",
  "lizethmartinez@tuhabi.mx":   "David López",

  "diegoquevedo@tuhabi.mx":     "Manuel Chávez",
  "lorenacastrejon@tuhabi.mx":  "Manuel Chávez",
  "ericsanchez@tuhabi.mx":      "Manuel Chávez",
  "anthonygarcia@tuhabi.mx":    "Manuel Chávez",
  "danielroedel@tuhabi.mx":     "Manuel Chávez",
  "kassandrazepeda@tuhabi.mx":  "Manuel Chávez",

  "nestorjuarez@tuhabi.mx":     "María Bocardo",
  "erickvillasana@tuhabi.mx":   "María Bocardo",
  "uriesramirez@tuhabi.mx":     "María Bocardo",
  "carlosalmanza@tuhabi.mx":    "María Bocardo",
  "lilijasso@tuhabi.mx":        "María Bocardo",
};

const ALL_LEADERS = [
  "Todos",
  "David Franco",
  "David López",
  "Manuel Chávez",
  "María Bocardo",
] as const;
type Leader = (typeof ALL_LEADERS)[number];

type MetricKey =
  | "ofertados"
  | "exitosos"
  | "abrieron"
  | "oferta_estandar"
  | "lista_espera";

const METRIC_LABELS: Record<MetricKey, string> = {
  ofertados:       "Ofertados",
  exitosos:        "Envíos exitosos",
  abrieron:        "Abrieron la página",
  oferta_estandar: "Oferta estándar",
  lista_espera:    "Lista de espera",
};

type DateStats = {
  date: string;
  ofertados: number;
  exitosos: number;
  abrieron: number;
  oferta_estandar: number;
  lista_espera: number;
};

type DateUUIDs = Record<MetricKey, string[]>;

function buildDateData(
  rows: DetailRow[],
  dateGrouping: DateGrouping,
  lider: Leader,
) {
  const statsMap = new Map<string, DateStats>();
  const uuidsMap = new Map<string, DateUUIDs>();

  const filtered =
    lider === "Todos"
      ? rows
      : rows.filter(
          (r) =>
            LEADER_MAP[(r.hubspot_owner_id ?? "").toLowerCase()] === lider,
        );

  for (const row of filtered) {
    const date = groupDate(row.fecha_ofertado, dateGrouping);
    if (!statsMap.has(date)) {
      statsMap.set(date, {
        date,
        ofertados: 0,
        exitosos: 0,
        abrieron: 0,
        oferta_estandar: 0,
        lista_espera: 0,
      });
      uuidsMap.set(date, {
        ofertados: [],
        exitosos: [],
        abrieron: [],
        oferta_estandar: [],
        lista_espera: [],
      });
    }
    const s = statsMap.get(date)!;
    const u = uuidsMap.get(date)!;

    s.ofertados++;
    u.ofertados.push(row.deal_uuid);

    if (row.mensajes_exitosos === 1) {
      s.exitosos++;
      u.exitosos.push(row.deal_uuid);
    }
    if (row.abrieron_pagina) {
      s.abrieron++;
      u.abrieron.push(row.deal_uuid);
    }
    if (row.eleccion === "oferta_estandar") {
      s.oferta_estandar++;
      u.oferta_estandar.push(row.deal_uuid);
    }
    if (row.eleccion === "lista_espera") {
      s.lista_espera++;
      u.lista_espera.push(row.deal_uuid);
    }
  }

  const stats = [...statsMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return { stats, uuidsMap };
}

const OFERTA_BARS: { key: MetricKey; label: string; color: string }[] = [
  { key: "ofertados",       label: "Ofertados",          color: "#3F3D91" },
  { key: "exitosos",        label: "Envíos exitosos",    color: "#2E7D4F" },
  { key: "abrieron",        label: "Abrieron la página", color: "#C4B95A" },
  { key: "oferta_estandar", label: "Oferta estándar",    color: "#EF9F27" },
];

const LISTA_BARS: { key: MetricKey; label: string; color: string }[] = [
  { key: "ofertados",  label: "Ofertados",          color: "#3F3D91" },
  { key: "exitosos",   label: "Envíos exitosos",    color: "#2E7D4F" },
  { key: "abrieron",   label: "Abrieron la página", color: "#C4B95A" },
  { key: "lista_espera", label: "Lista de espera",  color: "#C97B8B" },
];

function SubChart({
  data,
  bars,
  title,
  subtitle,
  selectedDate,
  onBarClick,
}: {
  data: DateStats[];
  bars: typeof OFERTA_BARS;
  title: string;
  subtitle: string;
  selectedDate: string | null;
  onBarClick: (date: string, metric: MetricKey) => void;
}) {
  const minWidth = Math.max(600, data.length * 96);

  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
        {title}
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{subtitle}</p>
      {/* Custom legend in defined order */}
      <div className="flex flex-wrap gap-4 mb-3">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: bar.color }}
            />
            {bar.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 20, left: 0, bottom: 48 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                angle={-40}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
                formatter={(value, name) => [value, name]}
              />
              {bars.map((bar) => (
                <Bar
                  key={bar.key}
                  dataKey={bar.key}
                  name={bar.label}
                  fill={bar.color}
                  barSize={14}
                  radius={[3, 3, 0, 0]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(entry: any) => onBarClick(entry.payload?.date as string, bar.key)}
                  style={{ cursor: "pointer" }}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.date}
                      opacity={
                        selectedDate && selectedDate !== entry.date ? 0.25 : 1
                      }
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function OwnerChart({
  rows,
  dateGrouping,
  onBarClick,
}: OwnerChartProps) {
  const [selectedLider, setSelectedLider] = useState<Leader>("Todos");
  const [selectedCell, setSelectedCell] = useState<{
    date: string;
    metric: MetricKey;
  } | null>(null);

  const { stats, uuidsMap } = useMemo(
    () => buildDateData(rows, dateGrouping, selectedLider),
    [rows, dateGrouping, selectedLider],
  );

  function handleBarClick(date: string, metric: MetricKey) {
    if (selectedCell?.date === date && selectedCell?.metric === metric) {
      setSelectedCell(null);
      onBarClick?.(null);
      return;
    }
    const uuids = uuidsMap.get(date)?.[metric] ?? [];
    setSelectedCell({ date, metric });
    onBarClick?.(new Set(uuids), `${date} — ${METRIC_LABELS[metric]}`);
  }

  function handleLiderChange(lider: Leader) {
    setSelectedLider(lider);
    setSelectedCell(null);
    onBarClick?.(null);
  }

  if (!stats.length) return null;

  const selectedDate = selectedCell?.date ?? null;

  return (
    <div className="space-y-4">
      {/* Leader filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Filtrar por líder:
        </span>
        {ALL_LEADERS.map((lider) => (
          <button
            key={lider}
            onClick={() => handleLiderChange(lider)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedLider === lider
                ? "bg-indigo-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600"
            }`}
          >
            {lider}
          </button>
        ))}
      </div>

      <SubChart
        data={stats}
        bars={OFERTA_BARS}
        title="Histórico por fecha — Oferta estándar"
        subtitle="Haz clic en una barra para filtrar la tabla de abajo"
        selectedDate={selectedDate}
        onBarClick={handleBarClick}
      />

      <SubChart
        data={stats}
        bars={LISTA_BARS}
        title="Histórico por fecha — Lista de espera"
        subtitle="Haz clic en una barra para filtrar la tabla de abajo"
        selectedDate={selectedDate}
        onBarClick={handleBarClick}
      />
    </div>
  );
}
