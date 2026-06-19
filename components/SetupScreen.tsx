"use client";

import { AlertCircle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";

type Status = "ok" | "error" | "pending";

interface SetupScreenProps {
  apiStatus: Status;
  onReload: () => void;
}

const STATUS_LABEL: Record<Status, string> = {
  ok:      "conectado",
  error:   "error de conexión",
  pending: "conectando…",
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "ok")      return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "error")   return <AlertCircle  className="h-3.5 w-3.5 text-red-500" />;
  return <Loader2 className="h-3.5 w-3.5 text-zinc-400 animate-spin" />;
}

export default function SetupScreen({ apiStatus, onReload }: SetupScreenProps) {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Mostrando datos demo — Apps Script no configurado
          </p>

          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <StatusIcon status={apiStatus} />
            <span>
              Apps Script: <span className="font-medium">{STATUS_LABEL[apiStatus]}</span>
            </span>
          </div>

          <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
            Despliega{" "}
            <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              apps-script/Code.gs
            </code>{" "}
            en{" "}
            <span className="font-medium">script.google.com</span> y añade la URL
            de la implementación como{" "}
            <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              APPS_SCRIPT_URL
            </code>{" "}
            en{" "}
            <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              .env.local
            </code>
            .
          </p>

          <button
            onClick={onReload}
            className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar conexión
          </button>
        </div>
      </div>
    </div>
  );
}
