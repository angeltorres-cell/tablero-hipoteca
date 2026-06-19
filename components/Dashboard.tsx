"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

import {
  BigQueryRow,
  DataSource,
  DateGrouping,
  FunnelStage,
  LogBoton,
  LogEncuesta,
  LogIntro,
} from "@/lib/types";
import {
  buildDetailRows,
  calculateConversionByDate,
  calculateKPIs,
  filterEncuestasByUUIDs,
  getEncuestaUUIDs,
  getUniqueSubSegments,
} from "@/lib/data-processing";
import {
  generateDemoBigQueryData,
  generateDemoLogsBoton,
  generateDemoLogsEncuestas,
  generateDemoLogsIntro,
} from "@/lib/demo-data";

import FilterBar      from "./FilterBar";
import FunnelChart    from "./FunnelChart";
import KPICards       from "./KPICards";
import ConversionChart from "./ConversionChart";
import DetailTable    from "./DetailTable";
import SetupScreen    from "./SetupScreen";
import SurveyChart    from "./SurveyChart";
import TabNavigation  from "./TabNavigation";

type ApiStatus = "ok" | "error" | "pending";

const FUNNEL_COLORS = [
  "#3F3D91",
  "#89C4E8",
  "#2E7D4F",
  "#C4B95A",
  "#C97B8B",
  "#8B5E9B",
];

export default function Dashboard() {
  const [bqData,         setBqData]         = useState<BigQueryRow[]>([]);
  const [logsBoton,      setLogsBoton]      = useState<LogBoton[]>([]);
  const [logsIntro,      setLogsIntro]      = useState<LogIntro[]>([]);
  const [logsEncuestas,  setLogsEncuestas]  = useState<LogEncuesta[]>([]);
  const [dataSource,     setDataSource]     = useState<DataSource>("loading");
  const [apiStatus,      setApiStatus]      = useState<ApiStatus>("pending");
  const [dateGrouping,   setDateGrouping]   = useState<DateGrouping>("daily");
  const [subSegFilter,   setSubSegFilter]   = useState("all");
  const [activeTab,      setActiveTab]      = useState(0);

  const loadData = async () => {
    setDataSource("loading");
    setApiStatus("pending");

    try {
      const res  = await fetch("/api/data");
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      setBqData(json.bq_data        ?? []);
      setLogsBoton(json.logs_boton  ?? []);
      setLogsIntro(json.logs_intro  ?? []);
      setLogsEncuestas(json.logs_encuestas ?? []);
      setDataSource("live");
      setApiStatus("ok");
    } catch {
      setBqData(generateDemoBigQueryData());
      setLogsBoton(generateDemoLogsBoton());
      setLogsIntro(generateDemoLogsIntro());
      setLogsEncuestas(generateDemoLogsEncuestas());
      setDataSource("demo");
      setApiStatus("error");
    }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data (memoized) ──────────────────────────────────────────────
  const encuestaUUIDs = useMemo(
    () => getEncuestaUUIDs(logsEncuestas),
    [logsEncuestas],
  );

  const subSegOptions = useMemo(
    () => getUniqueSubSegments(bqData),
    [bqData],
  );

  const kpis = useMemo(
    () => calculateKPIs(bqData, logsBoton, logsIntro, encuestaUUIDs, subSegFilter),
    [bqData, logsBoton, logsIntro, encuestaUUIDs, subSegFilter],
  );

  const funnelStages: FunnelStage[] = useMemo(
    () => [
      { label: "Mensajes enviados",     value: kpis.enviados,    color: FUNNEL_COLORS[0] },
      { label: "Mensajes exitosos",     value: kpis.exitosos,    color: FUNNEL_COLORS[1] },
      { label: "Abrieron la página",      value: kpis.clicTotal,   color: FUNNEL_COLORS[2] },
      { label: "Lista de espera",       value: kpis.listaEspera, color: FUNNEL_COLORS[3] },
      { label: "Me interesa",           value: kpis.meInteresa,  color: FUNNEL_COLORS[4] },
      { label: "Encuestas respondidas", value: kpis.encuestas,   color: FUNNEL_COLORS[5] },
    ],
    [kpis],
  );

  const funnelStagesOferta: FunnelStage[] = useMemo(
    () => [
      { label: "Mensajes enviados",  value: kpis.enviados,       color: FUNNEL_COLORS[0] },
      { label: "Mensajes exitosos",  value: kpis.exitosos,       color: FUNNEL_COLORS[1] },
      { label: "Abrieron la página", value: kpis.clicTotal,      color: FUNNEL_COLORS[2] },
      { label: "Oferta estándar",    value: kpis.ofertaEstandar, color: FUNNEL_COLORS[3] },
    ],
    [kpis],
  );

  const detailRows = useMemo(
    () => buildDetailRows(bqData, logsIntro, subSegFilter),
    [bqData, logsIntro, subSegFilter],
  );

  const conversionData = useMemo(
    () =>
      calculateConversionByDate(
        bqData, logsBoton, logsIntro, encuestaUUIDs, dateGrouping, subSegFilter,
      ),
    [bqData, logsBoton, logsIntro, encuestaUUIDs, dateGrouping, subSegFilter],
  );

  const filteredValidUUIDs = useMemo(() => {
    const filtered =
      subSegFilter === "all"
        ? bqData
        : bqData.filter((r) => r.sub_segmento_seller_mx === subSegFilter);
    return new Set(filtered.map((r) => r.deal_uuid));
  }, [bqData, subSegFilter]);

  const filteredEncuestas = useMemo(
    () => filterEncuestasByUUIDs(logsEncuestas, filteredValidUUIDs),
    [logsEncuestas, filteredValidUUIDs],
  );

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (dataSource === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-sm">Cargando datos…</span>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Resultados experimento Cancelación de hipoteca anticipada [MX]
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              WhatsApp — Plantilla:{" "}
              <code className="font-mono text-xs">
                envio_oferta_liquidez_mx_angeltorres_12jun26
              </code>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                dataSource === "live"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              }`}
            >
              {dataSource === "live"
                ? <Wifi className="h-3 w-3" />
                : <WifiOff className="h-3 w-3" />}
              {dataSource === "live" ? "Datos en vivo" : "Datos demo"}
            </span>

            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recargar
            </button>
          </div>
        </div>

        {/* Setup / error banner */}
        {dataSource === "demo" && (
          <SetupScreen apiStatus={apiStatus} onReload={loadData} />
        )}

        {/* Filters */}
        <FilterBar
          dateGrouping={dateGrouping}
          onDateGroupingChange={setDateGrouping}
          subSegFilter={subSegFilter}
          onSubSegFilterChange={setSubSegFilter}
          subSegOptions={subSegOptions}
        />

        {/* KPI cards */}
        <KPICards kpis={kpis} enviados={kpis.enviados} />

        {/* Tabs */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        <div className="pb-8">
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Dos funnels lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                  <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Funnel — Lista de espera
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                    Leads que se registraron para el nuevo producto
                  </p>
                  <FunnelChart stages={funnelStages} />
                </div>

                <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                  <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Funnel — Oferta estándar
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                    Leads que prefirieron la oferta estándar
                  </p>
                  <FunnelChart stages={funnelStagesOferta} />
                </div>
              </div>

              {/* Tabla de detalle */}
              <DetailTable rows={detailRows} />
            </div>
          )}

          {activeTab === 1 && (
            <ConversionChart
              data={conversionData}
              title="Conversión por fuente WhatsApp"
              subtitle="Leads agrupados por fecha de envío del mensaje"
              bars={[
                { dataKey: "enviados",    name: "Enviados",     color: "#378ADD" },
                { dataKey: "exitosos",    name: "Exitosos",     color: "#1D9E75" },
                { dataKey: "clicWA",      name: "Clic WA",      color: "#7F77DD" },
                { dataKey: "listaEspera", name: "Lista espera", color: "#D85A30" },
              ]}
              line={{ dataKey: "pctListaEspera", name: "% Lista espera", color: "#E24B4A" }}
            />
          )}

          {activeTab === 2 && (
            <ConversionChart
              data={conversionData}
              title="Conversión por fuente comercial"
              subtitle="Leads agrupados por fecha de envío del mensaje"
              bars={[
                { dataKey: "enviados",    name: "Enviados",       color: "#378ADD" },
                { dataKey: "exitosos",    name: "Exitosos",       color: "#1D9E75" },
                { dataKey: "clicCom",     name: "Clic comercial", color: "#EF9F27" },
                { dataKey: "listaEspera", name: "Lista espera",   color: "#D85A30" },
              ]}
              line={{ dataKey: "pctListaEspera", name: "% Lista espera", color: "#E24B4A" }}
            />
          )}

          {activeTab === 3 && (
            <ConversionChart
              data={conversionData}
              title="Me interesa → Encuestas"
              subtitle="Conversión desde interés declarado hasta encuesta completada"
              bars={[
                { dataKey: "meInteresa", name: "Me interesa", color: "#EF9F27" },
                { dataKey: "encuestas",  name: "Encuestas",   color: "#D4537E" },
              ]}
              line={{ dataKey: "pctEncuestas", name: "% Encuestas vs Me interesa", color: "#1D9E75" }}
            />
          )}

          {activeTab === 4 && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  Respuestas de encuestas
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Solo preguntas de selección múltiple —{" "}
                  {new Set(filteredEncuestas.map((r) => r.uuid)).size} respondentes
                </p>
              </div>
              <SurveyChart encuestas={filteredEncuestas} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
