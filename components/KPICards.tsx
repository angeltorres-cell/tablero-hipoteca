"use client";

import {
  Send,
  CheckCircle,
  MousePointerClick,
  Clock,
  ThumbsUp,
  ClipboardList,
} from "lucide-react";
import { FunnelFilter, KPIs } from "@/lib/types";

interface KPICardsProps {
  kpis: KPIs;
  enviados: number;
  selectedFilter?: FunnelFilter;
  onCardClick?: (key: FunnelFilter) => void;
}

function pct(num: number, denom: number): string {
  if (!denom) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

export default function KPICards({ kpis, onCardClick, selectedFilter }: KPICardsProps) {
  const cards: {
    key: FunnelFilter;
    label: string;
    value: number;
    sub: string | null;
    Icon: React.ElementType;
    color: string;
    bg: string;
  }[] = [
    {
      key: "enviados",
      label: "Enviados",
      value: kpis.enviados,
      sub: null,
      Icon: Send,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
    },
    {
      key: "exitosos",
      label: "Exitosos",
      value: kpis.exitosos,
      sub: pct(kpis.exitosos, kpis.enviados),
      Icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      key: "abrieron_pagina",
      label: "Abrieron la página",
      value: kpis.clicTotal,
      sub: `WA: ${kpis.clicWA} | Com: ${kpis.clicCom}`,
      Icon: MousePointerClick,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      key: "lista_espera",
      label: "Lista espera",
      value: kpis.listaEspera,
      sub: pct(kpis.listaEspera, kpis.enviados),
      Icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      key: "me_interesa",
      label: "Me interesa",
      value: kpis.meInteresa,
      sub: pct(kpis.meInteresa, kpis.listaEspera),
      Icon: ThumbsUp,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-950/40",
    },
    {
      key: "encuestas",
      label: "Encuestas",
      value: kpis.encuestas,
      sub: pct(kpis.encuestas, kpis.meInteresa),
      Icon: ClipboardList,
      color: "text-teal-500",
      bg: "bg-teal-50 dark:bg-teal-950/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(({ key, label, value, sub, Icon, color, bg }) => {
        const isSelected = selectedFilter === key;
        return (
          <button
            key={label}
            onClick={() => onCardClick?.(isSelected ? null : key)}
            className={`text-left bg-white dark:bg-zinc-800/50 rounded-xl p-4 border flex flex-col gap-2 transition-all ${
              isSelected
                ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-300 dark:ring-indigo-700"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500"
            } ${onCardClick ? "cursor-pointer" : ""}`}
          >
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                {label}
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {value.toLocaleString("es-MX")}
              </p>
              {sub && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {sub}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
