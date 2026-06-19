"use client";

import { DateGrouping } from "@/lib/types";

interface FilterBarProps {
  dateGrouping: DateGrouping;
  onDateGroupingChange: (value: DateGrouping) => void;
  subSegFilter: string;
  onSubSegFilterChange: (value: string) => void;
  subSegOptions: string[];
}

const selectClass =
  "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function FilterBar({
  dateGrouping,
  onDateGroupingChange,
  subSegFilter,
  onSubSegFilterChange,
  subSegOptions,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium">
          Agrupamiento
        </label>
        <select
          className={selectClass}
          value={dateGrouping}
          onChange={(e) => onDateGroupingChange(e.target.value as DateGrouping)}
        >
          <option value="daily">Diario</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensual</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium">
          Sub-segmento
        </label>
        <select
          className={selectClass}
          value={subSegFilter}
          onChange={(e) => onSubSegFilterChange(e.target.value)}
        >
          <option value="all">Todos los sub-segmentos</option>
          {subSegOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
