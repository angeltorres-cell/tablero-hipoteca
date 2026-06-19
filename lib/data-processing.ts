import {
  BigQueryRow,
  ConversionDataPoint,
  DateGrouping,
  KPIs,
  LogBoton,
  LogEncuesta,
  LogIntro,
} from "./types";

export function deduplicateByUUID<
  T extends { uuid: string; fecha: string; hora: string },
>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => {
    const ak = `${a.fecha}T${a.hora}`;
    const bk = `${b.fecha}T${b.hora}`;
    return ak.localeCompare(bk);
  });
  const seen = new Set<string>();
  return sorted.filter((row) => {
    if (seen.has(row.uuid)) return false;
    seen.add(row.uuid);
    return true;
  });
}

export function groupDate(dateStr: string, mode: DateGrouping): string {
  // Handle both "YYYY-MM-DDTHH:mm:ss" and "YYYY-MM-DD" formats
  const isoStr = dateStr.replace(" ", "T").split(".")[0];
  const date = new Date(isoStr.endsWith("Z") ? isoStr : isoStr + "Z");
  if (isNaN(date.getTime())) return dateStr.slice(0, 10);

  if (mode === "monthly") return isoStr.slice(0, 7);

  if (mode === "weekly") {
    const utcDay = date.getUTCDay(); // 0=Sun
    const diff = utcDay === 0 ? -6 : 1 - utcDay;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + diff);
    return `Sem ${monday.toISOString().slice(0, 10)}`;
  }

  return isoStr.slice(0, 10); // daily
}

function filterBQ(bqData: BigQueryRow[], subSegFilter: string): BigQueryRow[] {
  return subSegFilter === "all"
    ? bqData
    : bqData.filter((r) => r.sub_segmento_seller_mx === subSegFilter);
}

export function calculateKPIs(
  bqData: BigQueryRow[],
  logsBoton: LogBoton[],
  logsIntro: LogIntro[],
  encuestaUUIDs: Set<string>,
  subSegFilter: string,
): KPIs {
  const filtered = filterBQ(bqData, subSegFilter);
  const validUUIDs = new Set(filtered.map((r) => r.deal_uuid));

  const dedupBoton = deduplicateByUUID(logsBoton).filter((r) =>
    validUUIDs.has(r.uuid),
  );
  const dedupIntro = deduplicateByUUID(logsIntro).filter((r) =>
    validUUIDs.has(r.uuid),
  );

  const clicWA = dedupBoton.filter((r) => r.source === "whatsapp").length;
  const clicCom = dedupBoton.filter((r) => r.source === "comercial").length;
  const listaEspera = dedupIntro.filter(
    (r) => r.type_button === "lista_espera",
  ).length;
  const meInteresa = dedupIntro.filter(
    (r) => r.type_button === "me_interesa",
  ).length;
  const ofertaEstandar = dedupIntro.filter(
    (r) => r.type_button === "oferta_estandar",
  ).length;
  const encuestas = [...encuestaUUIDs].filter((uuid) =>
    validUUIDs.has(uuid),
  ).length;

  return {
    enviados: filtered.length,
    exitosos: filtered.filter((r) => r.mensajes_exitosos === 1).length,
    clicWA,
    clicCom,
    clicTotal: clicWA + clicCom,
    listaEspera,
    meInteresa,
    ofertaEstandar,
    encuestas,
  };
}

export function calculateConversionByDate(
  bqData: BigQueryRow[],
  logsBoton: LogBoton[],
  logsIntro: LogIntro[],
  encuestaUUIDs: Set<string>,
  dateGrouping: DateGrouping,
  subSegFilter: string,
): ConversionDataPoint[] {
  const filtered = filterBQ(bqData, subSegFilter);
  const validUUIDs = new Set(filtered.map((r) => r.deal_uuid));

  const dedupBoton = deduplicateByUUID(logsBoton).filter((r) =>
    validUUIDs.has(r.uuid),
  );
  const dedupIntro = deduplicateByUUID(logsIntro).filter((r) =>
    validUUIDs.has(r.uuid),
  );
  const filteredEncuestaUUIDs = new Set(
    [...encuestaUUIDs].filter((uuid) => validUUIDs.has(uuid)),
  );

  // Build maps for O(1) lookup
  const botonByUUID = new Map(dedupBoton.map((r) => [r.uuid, r]));
  const introByUUID = new Map(dedupIntro.map((r) => [r.uuid, r]));

  // Group BQ rows by date key
  const groups = new Map<string, BigQueryRow[]>();
  for (const row of filtered) {
    const key = groupDate(row.created_at, dateGrouping);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }

  const result: ConversionDataPoint[] = [];

  for (const [date, rows] of groups) {
    const enviados = rows.length;
    const exitosos = rows.filter((r) => r.mensajes_exitosos === 1).length;
    let clicWA = 0,
      clicCom = 0,
      listaEspera = 0,
      meInteresa = 0,
      encuestas = 0;

    for (const row of rows) {
      const uuid = row.deal_uuid;
      const boton = botonByUUID.get(uuid);
      if (boton?.source === "whatsapp") clicWA++;
      if (boton?.source === "comercial") clicCom++;

      const intro = introByUUID.get(uuid);
      if (intro?.type_button === "lista_espera") listaEspera++;
      if (intro?.type_button === "me_interesa") meInteresa++;

      if (filteredEncuestaUUIDs.has(uuid)) encuestas++;
    }

    const pctOf = (n: number) =>
      enviados > 0 ? Math.round((n / enviados) * 1000) / 10 : 0;

    result.push({
      date,
      enviados,
      exitosos,
      clicWA,
      clicCom,
      listaEspera,
      meInteresa,
      encuestas,
      pctExitosos: pctOf(exitosos),
      pctClicWA: pctOf(clicWA),
      pctClicCom: pctOf(clicCom),
      pctListaEspera: pctOf(listaEspera),
      pctMeInteresa: pctOf(meInteresa),
      pctEncuestas:
        meInteresa > 0
          ? Math.round((encuestas / meInteresa) * 1000) / 10
          : 0,
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function getUniqueSubSegments(bqData: BigQueryRow[]): string[] {
  const seen = new Set<string>();
  for (const row of bqData) {
    if (row.sub_segmento_seller_mx) seen.add(row.sub_segmento_seller_mx);
  }
  return [...seen].sort();
}

export function getEncuestaUUIDs(encuestas: LogEncuesta[]): Set<string> {
  return new Set(encuestas.map((r) => r.uuid));
}

export function filterEncuestasByUUIDs(
  encuestas: LogEncuesta[],
  validUUIDs: Set<string>,
): LogEncuesta[] {
  return encuestas.filter((r) => validUUIDs.has(r.uuid));
}
