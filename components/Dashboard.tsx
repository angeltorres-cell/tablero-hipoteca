"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Wifi, WifiOff, X } from "lucide-react";

import {
  BigQueryRow,
  DataSource,
  DateGrouping,
  FunnelFilter,
  FunnelStage,
  LogBoton,
  LogEncuesta,
  LogIntro,
} from "@/lib/types";
import {
  buildDetailRows,
  calculateConversionByDate,
  calculateKPIs,
  deduplicateByUUID,
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

import FilterBar       from "./FilterBar";
import FunnelChart     from "./FunnelChart";
import KPICards        from "./KPICards";
import ConversionChart from "./ConversionChart";
import DetailTable     from "./DetailTable";
import OwnerChart      from "./OwnerChart";
import SetupScreen     from "./SetupScreen";
import SurveyChart     from "./SurveyChart";
import TabNavigation   from "./TabNavigation";

type ApiStatus = "ok" | "error" | "pending";

const FUNNEL_COLORS = ["#3F3D91", "#89C4E8", "#2E7D4F", "#C4B95A", "#C97B8B", "#8B5E9B"];

// Maps funnel stage index → FunnelFilter key (lista espera funnel)
const FUNNEL_MAIN_KEYS: FunnelFilter[] = [
  "ofertados", "enviados", "exitosos", "abrieron_pagina", "lista_espera", "me_interesa", "encuestas",
];
// Maps funnel stage index → FunnelFilter key (oferta estándar funnel)
const FUNNEL_OFERTA_KEYS: FunnelFilter[] = [
  "ofertados", "enviados", "exitosos", "abrieron_pagina", "oferta_estandar",
];

const FILTER_LABELS: Record<NonNullable<FunnelFilter>, string> = {
  ofertados:       "Ofertados",
  enviados:        "Mensajes enviados",
  exitosos:        "Mensajes exitosos",
  abrieron_pagina: "Abrieron la página",
  lista_espera:    "Lista de espera",
  me_interesa:     "Me interesa",
  encuestas:       "Encuestas respondidas",
  oferta_estandar: "Oferta estándar",
};

export default function Dashboard() {
  const [bqData,        setBqData]        = useState<BigQueryRow[]>([]);
  const [logsBoton,     setLogsBoton]     = useState<LogBoton[]>([]);
  const [logsIntro,     setLogsIntro]     = useState<LogIntro[]>([]);
  const [logsEncuestas, setLogsEncuestas] = useState<LogEncuesta[]>([]);
  const [dataSource,    setDataSource]    = useState<DataSource>("loading");
  const [apiStatus,     setApiStatus]     = useState<ApiStatus>("pending");
  const [dateGrouping,  setDateGrouping]  = useState<DateGrouping>("daily");
  const [subSegFilter,  setSubSegFilter]  = useState("all");
  const [activeTab,     setActiveTab]     = useState(0);
  const [funnelFilter,       setFunnelFilter]       = useState<FunnelFilter>(null);
  const [ownerFilter,        setOwnerFilter]        = useState<string | null>(null);
  const [conversionChannel,  setConversionChannel]  = useState<"whatsapp" | "comercial">("whatsapp");

  const loadData = async () => {
    setDataSource("loading");
    setApiStatus("pending");
    setFunnelFilter(null);
    setOwnerFilter(null);
    try {
      const res  = await fetch("/api/data");
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
      setBqData(json.bq_data ?? []);
      setLogsBoton(json.logs_boton ?? []);
      setLogsIntro(json.logs_intro ?? []);
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

  // ── Derived data ─────────────────────────────────────────────────────────
  const encuestaUUIDs = useMemo(() => getEncuestaUUIDs(logsEncuestas), [logsEncuestas]);
  const subSegOptions = useMemo(() => getUniqueSubSegments(bqData), [bqData]);

  const kpis = useMemo(
    () => calculateKPIs(bqData, logsBoton, logsIntro, encuestaUUIDs, subSegFilter),
    [bqData, logsBoton, logsIntro, encuestaUUIDs, subSegFilter],
  );

  const filteredValidUUIDs = useMemo(() => {
    const f = subSegFilter === "all" ? bqData : bqData.filter(r => r.sub_segmento_seller_mx === subSegFilter);
    return new Set(f.map(r => r.deal_uuid));
  }, [bqData, subSegFilter]);

  // Set of UUIDs that opened the page (clicked button)
  const clickedUUIDs = useMemo(
    () => new Set(deduplicateByUUID(logsBoton).filter(r => filteredValidUUIDs.has(r.uuid)).map(r => r.uuid)),
    [logsBoton, filteredValidUUIDs],
  );

  // Set of UUIDs for which a WhatsApp message was sent (template_id populated)
  const enviadosUUIDs = useMemo(
    () => new Set(bqData.filter(r => filteredValidUUIDs.has(r.deal_uuid) && r.template_id !== "").map(r => r.deal_uuid)),
    [bqData, filteredValidUUIDs],
  );

  const funnelStages: FunnelStage[] = useMemo(() => [
    { label: "Ofertados",             value: kpis.ofertados,   color: FUNNEL_COLORS[0] },
    { label: "Mensajes enviados",     value: kpis.enviados,    color: FUNNEL_COLORS[1] },
    { label: "Mensajes exitosos",     value: kpis.exitosos,    color: FUNNEL_COLORS[2] },
    { label: "Abrieron la página",    value: kpis.clicTotal,   color: FUNNEL_COLORS[3] },
    { label: "Lista de espera",       value: kpis.listaEspera, color: FUNNEL_COLORS[4] },
    { label: "Me interesa",           value: kpis.meInteresa,  color: FUNNEL_COLORS[5] },
    { label: "Encuestas respondidas", value: kpis.encuestas,   color: FUNNEL_COLORS[5] },
  ], [kpis]);

  const funnelStagesOferta: FunnelStage[] = useMemo(() => [
    { label: "Ofertados",          value: kpis.ofertados,      color: FUNNEL_COLORS[0] },
    { label: "Mensajes enviados",  value: kpis.enviados,       color: FUNNEL_COLORS[1] },
    { label: "Mensajes exitosos",  value: kpis.exitosos,       color: FUNNEL_COLORS[2] },
    { label: "Abrieron la página", value: kpis.clicTotal,      color: FUNNEL_COLORS[3] },
    { label: "Oferta estándar",    value: kpis.ofertaEstandar, color: FUNNEL_COLORS[4] },
  ], [kpis]);

  const detailRows = useMemo(
    () => buildDetailRows(bqData, logsIntro, logsBoton, subSegFilter),
    [bqData, logsIntro, logsBoton, subSegFilter],
  );

  // Filter detail table based on funnel selection and/or owner
  const filteredDetailRows = useMemo(() => {
    let rows = detailRows;
    if (funnelFilter) {
      switch (funnelFilter) {
        case "ofertados":       break; // all rows are ofertados
        case "enviados":        rows = rows.filter(r => enviadosUUIDs.has(r.deal_uuid)); break;
        case "exitosos":        rows = rows.filter(r => r.mensajes_exitosos === 1); break;
        case "abrieron_pagina": rows = rows.filter(r => clickedUUIDs.has(r.deal_uuid)); break;
        case "lista_espera":    rows = rows.filter(r => r.eleccion === "lista_espera"); break;
        case "me_interesa":     rows = rows.filter(r => r.eleccion === "me_interesa"); break;
        case "encuestas":       rows = rows.filter(r => encuestaUUIDs.has(r.deal_uuid)); break;
        case "oferta_estandar": rows = rows.filter(r => r.eleccion === "oferta_estandar"); break;
        default: break;
      }
    }
    if (ownerFilter) {
      rows = rows.filter(r => r.hubspot_owner_id === ownerFilter);
    }
    return rows;
  }, [detailRows, funnelFilter, ownerFilter, clickedUUIDs, encuestaUUIDs, enviadosUUIDs]);

  const conversionData = useMemo(
    () => calculateConversionByDate(bqData, logsBoton, logsIntro, encuestaUUIDs, dateGrouping, subSegFilter),
    [bqData, logsBoton, logsIntro, encuestaUUIDs, dateGrouping, subSegFilter],
  );

  const filteredEncuestas = useMemo(
    () => filterEncuestasByUUIDs(logsEncuestas, filteredValidUUIDs),
    [logsEncuestas, filteredValidUUIDs],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleFunnelStageClick(keys: FunnelFilter[], index: number) {
    const key = keys[index] ?? null;
    setFunnelFilter(prev => (prev === key ? null : key));
    setActiveTab(0);
  }

  function handleKPICardClick(key: FunnelFilter) {
    setFunnelFilter(key);
    setActiveTab(0);
  }

  // ── Funnel selected index from current filter ─────────────────────────────
  const mainFunnelSelected = funnelFilter ? FUNNEL_MAIN_KEYS.indexOf(funnelFilter) : null;
  const ofertaFunnelSelected = funnelFilter ? FUNNEL_OFERTA_KEYS.indexOf(funnelFilter) : null;

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
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
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              dataSource === "live"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            }`}>
              {dataSource === "live" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
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

        {dataSource === "demo" && (
          <SetupScreen apiStatus={apiStatus} onReload={loadData} />
        )}

        <FilterBar
          dateGrouping={dateGrouping}
          onDateGroupingChange={setDateGrouping}
          subSegFilter={subSegFilter}
          onSubSegFilterChange={setSubSegFilter}
          subSegOptions={subSegOptions}
        />

        {/* KPI cards — clicables para filtrar la tabla */}
        <KPICards
          kpis={kpis}
          enviados={kpis.enviados}
          selectedFilter={funnelFilter}
          onCardClick={handleKPICardClick}
        />

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="pb-8">

          {/* ── Tab 0: Funnel ─────────────────────────────────────────────── */}
          {activeTab === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                  <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Funnel — Lista de espera
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                    Haz clic en una etapa para filtrar la tabla
                  </p>
                  <FunnelChart
                    stages={funnelStages}
                    selectedIndex={mainFunnelSelected === -1 ? null : mainFunnelSelected}
                    onStageClick={(i) => handleFunnelStageClick(FUNNEL_MAIN_KEYS, i)}
                  />
                </div>
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                  <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Funnel — Oferta estándar
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                    Haz clic en una etapa para filtrar la tabla
                  </p>
                  <FunnelChart
                    stages={funnelStagesOferta}
                    selectedIndex={ofertaFunnelSelected === -1 ? null : ofertaFunnelSelected}
                    onStageClick={(i) => handleFunnelStageClick(FUNNEL_OFERTA_KEYS, i)}
                  />
                </div>
              </div>

              {/* Gráfico por comercial */}
              <OwnerChart
                rows={detailRows}
                selectedOwner={ownerFilter}
                onOwnerClick={(owner) => setOwnerFilter(owner || null)}
              />

              {/* Tabla con filtros activos */}
              <div>
                {(funnelFilter || ownerFilter) && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      Filtrando:
                    </span>
                    {funnelFilter && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                        {FILTER_LABELS[funnelFilter]}
                        <button onClick={() => setFunnelFilter(null)} className="ml-0.5 hover:text-indigo-900">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {ownerFilter && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-medium">
                        {ownerFilter}
                        <button onClick={() => setOwnerFilter(null)} className="ml-0.5 hover:text-violet-900">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      {filteredDetailRows.length} de {detailRows.length} leads
                    </span>
                  </div>
                )}
                <DetailTable rows={filteredDetailRows} />
              </div>
            </div>
          )}

          {/* ── Tab 1: Conversión (WhatsApp / Comercial) ─────────────────── */}
          {activeTab === 1 && (
            <div className="space-y-6">
              {/* Selector de canal */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Canal:</span>
                <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                  <button
                    onClick={() => setConversionChannel("whatsapp")}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      conversionChannel === "whatsapp"
                        ? "bg-indigo-600 text-white"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setConversionChannel("comercial")}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-zinc-200 dark:border-zinc-700 ${
                      conversionChannel === "comercial"
                        ? "bg-amber-500 text-white"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Comercial
                  </button>
                </div>
              </div>

              {conversionChannel === "whatsapp" ? (
                <>
                  <ConversionChart
                    data={conversionData}
                    title="Conversión Lista de espera — WhatsApp"
                    subtitle="Leads que abrieron la página vía WhatsApp y se registraron en lista de espera"
                    bars={[
                      { dataKey: "ofertados",   name: "Ofertados",    color: "#3F3D91" },
                      { dataKey: "enviados",    name: "Enviados",     color: "#378ADD" },
                      { dataKey: "exitosos",    name: "Exitosos",     color: "#1D9E75" },
                      { dataKey: "clicWA",      name: "Abrieron (WA)", color: "#7F77DD" },
                      { dataKey: "listaEspera", name: "Lista espera", color: "#D85A30" },
                    ]}
                    lines={[
                      { dataKey: "pctClicWA",       name: "% Abrieron página (WA)", color: "#7F77DD", dashed: true },
                      { dataKey: "pctListaEspera",  name: "% Lista espera",         color: "#E24B4A" },
                    ]}
                  />
                  <ConversionChart
                    data={conversionData}
                    title="Conversión Oferta estándar — WhatsApp"
                    subtitle="Leads que abrieron la página vía WhatsApp y eligieron la oferta estándar"
                    bars={[
                      { dataKey: "ofertados",      name: "Ofertados",      color: "#3F3D91" },
                      { dataKey: "enviados",       name: "Enviados",       color: "#378ADD" },
                      { dataKey: "exitosos",       name: "Exitosos",       color: "#1D9E75" },
                      { dataKey: "clicWA",         name: "Abrieron (WA)",  color: "#7F77DD" },
                      { dataKey: "ofertaEstandar", name: "Oferta estándar", color: "#EF9F27" },
                    ]}
                    lines={[
                      { dataKey: "pctClicWA",         name: "% Abrieron página (WA)", color: "#7F77DD", dashed: true },
                      { dataKey: "pctOfertaEstandar", name: "% Oferta estándar",       color: "#E24B4A" },
                    ]}
                  />
                </>
              ) : (
                <>
                  <ConversionChart
                    data={conversionData}
                    title="Conversión Lista de espera — Comercial"
                    subtitle="Leads que abrieron la página vía link comercial y se registraron en lista de espera"
                    bars={[
                      { dataKey: "ofertados",   name: "Ofertados",      color: "#3F3D91" },
                      { dataKey: "enviados",    name: "Enviados",       color: "#378ADD" },
                      { dataKey: "exitosos",    name: "Exitosos",       color: "#1D9E75" },
                      { dataKey: "clicCom",     name: "Abrieron (Com)", color: "#EF9F27" },
                      { dataKey: "listaEspera", name: "Lista espera",   color: "#D85A30" },
                    ]}
                    lines={[
                      { dataKey: "pctClicCom",      name: "% Abrieron página (Com)", color: "#EF9F27", dashed: true },
                      { dataKey: "pctListaEspera",  name: "% Lista espera",           color: "#E24B4A" },
                    ]}
                  />
                  <ConversionChart
                    data={conversionData}
                    title="Conversión Oferta estándar — Comercial"
                    subtitle="Leads que abrieron la página vía link comercial y eligieron la oferta estándar"
                    bars={[
                      { dataKey: "ofertados",      name: "Ofertados",      color: "#3F3D91" },
                      { dataKey: "enviados",       name: "Enviados",       color: "#378ADD" },
                      { dataKey: "exitosos",       name: "Exitosos",       color: "#1D9E75" },
                      { dataKey: "clicCom",        name: "Abrieron (Com)", color: "#EF9F27" },
                      { dataKey: "ofertaEstandar", name: "Oferta estándar", color: "#C97B8B" },
                    ]}
                    lines={[
                      { dataKey: "pctClicCom",        name: "% Abrieron página (Com)", color: "#EF9F27", dashed: true },
                      { dataKey: "pctOfertaEstandar", name: "% Oferta estándar",        color: "#E24B4A" },
                    ]}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Tab 2: Me interesa → Encuestas ───────────────────────────── */}
          {activeTab === 2 && (
            <ConversionChart
              data={conversionData}
              title="Me interesa → Encuestas"
              subtitle="Conversión desde interés declarado hasta encuesta completada"
              bars={[
                { dataKey: "meInteresa", name: "Me interesa", color: "#EF9F27" },
                { dataKey: "encuestas",  name: "Encuestas",   color: "#D4537E" },
              ]}
              lines={[
                { dataKey: "pctEncuestas", name: "% Encuestas vs Me interesa", color: "#1D9E75" },
              ]}
            />
          )}

          {/* ── Tab 3: Respuestas encuestas ───────────────────────────────── */}
          {activeTab === 3 && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  Respuestas de encuestas
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Distribución de respuestas por pregunta — solo leads ofertados
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
