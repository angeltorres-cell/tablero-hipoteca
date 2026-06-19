"use client";

import {
  Send,
  CheckCircle,
  MousePointerClick,
  Clock,
  ThumbsUp,
  ClipboardList,
} from "lucide-react";
import { KPIs } from "@/lib/types";

interface KPICardsProps {
  kpis: KPIs;
  enviados: number;
}

function pct(num: number, denom: number): string {
  if (!denom) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

const cardClass =
  "bg-white dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 flex flex-col gap-2";

export default function KPICards({ kpis }: KPICardsProps) {
  const cards = [
    {
      label: "Enviados",
      value: kpis.enviados,
      sub: null,
      Icon: Send,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
    },
    {
      label: "Exitosos",
      value: kpis.exitosos,
      sub: pct(kpis.exitosos, kpis.enviados),
      Icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Clic botón",
      value: kpis.clicTotal,
      sub: `WA: ${kpis.clicWA} | Com: ${kpis.clicCom}`,
      Icon: MousePointerClick,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      label: "Lista espera",
      value: kpis.listaEspera,
      sub: pct(kpis.listaEspera, kpis.enviados),
      Icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "Me interesa",
      value: kpis.meInteresa,
      sub: pct(kpis.meInteresa, kpis.listaEspera),
      Icon: ThumbsUp,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-950/40",
    },
    {
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
      {cards.map(({ label, value, sub, Icon, color, bg }) => (
        <div key={label} className={cardClass}>
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
        </div>
      ))}
    </div>
  );
}
