import {
  BigQueryRow,
  ConversionDataPoint,
  DateGrouping,
  DetailRow,
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

// Like deduplicateByUUID but for LogBoton: prefers whatsapp source over comercial
// so a UUID with both sources counts as whatsapp.
export function deduplicateBotonByUUID(rows: LogBoton[]): LogBoton[] {
  const byUUID = new Map<string, LogBoton>();
  for (const row of rows) {
    const existing = byUUID.get(row.uuid);
    if (!existing) {
      byUUID.set(row.uuid, row);
    } else if (row.source === "whatsapp" && existing.source !== "whatsapp") {
      byUUID.set(row.uuid, row);
    }
  }
  return [...byUUID.values()];
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

  const dedupBoton = deduplicateBotonByUUID(logsBoton).filter((r) =>
    validUUIDs.has(r.uuid),
  );

  // Count unique UUIDs per type_button independently: a UUID can appear with
  // different type_buttons at different times, so we must not deduplicate the
  // whole intro list before splitting — that would drop later-clicked buttons.
  const introFiltered = logsIntro.filter((r) => validUUIDs.has(r.uuid));
  const listaEspera = new Set(
    introFiltered.filter((r) => r.type_button === "lista_espera").map((r) => r.uuid),
  ).size;
  const meInteresa = new Set(
    introFiltered.filter((r) => r.type_button === "me_interesa").map((r) => r.uuid),
  ).size;
  const ofertaEstandar = new Set(
    introFiltered.filter((r) => r.type_button === "oferta_estandar").map((r) => r.uuid),
  ).size;

  const clicWA = dedupBoton.filter((r) => r.source === "whatsapp").length;
  const clicCom = dedupBoton.filter((r) => r.source === "comercial").length;
  const encuestas = [...encuestaUUIDs].filter((uuid) =>
    validUUIDs.has(uuid),
  ).length;

  return {
    ofertados: filtered.length,
    enviados: filtered.filter((r) => r.template_id !== "").length,
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

  const dedupBoton = deduplicateBotonByUUID(logsBoton).filter((r) =>
    validUUIDs.has(r.uuid),
  );
  const filteredEncuestaUUIDs = new Set(
    [...encuestaUUIDs].filter((uuid) => validUUIDs.has(uuid)),
  );

  // Build per-type UUID sets for intro logs so a UUID can count in multiple
  // type_buttons if the user clicked different buttons at different times.
  const introFiltered = logsIntro.filter((r) => validUUIDs.has(r.uuid));
  const listaEsperaUUIDs = new Set(
    introFiltered.filter((r) => r.type_button === "lista_espera").map((r) => r.uuid),
  );
  const meInteresaUUIDs = new Set(
    introFiltered.filter((r) => r.type_button === "me_interesa").map((r) => r.uuid),
  );
  const ofertaEstandarUUIDs = new Set(
    introFiltered.filter((r) => r.type_button === "oferta_estandar").map((r) => r.uuid),
  );

  // Build map for O(1) lookup
  const botonByUUID = new Map(dedupBoton.map((r) => [r.uuid, r]));

  // Group BQ rows by date key (based on fecha_ofertado)
  const groups = new Map<string, BigQueryRow[]>();
  for (const row of filtered) {
    const key = groupDate(row.fecha_ofertado, dateGrouping);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }

  const result: ConversionDataPoint[] = [];

  for (const [date, rows] of groups) {
    const ofertados = rows.length;
    const enviados = rows.filter((r) => r.template_id !== "").length;
    const exitosos = rows.filter((r) => r.mensajes_exitosos === 1).length;
    let clicWA = 0,
      clicCom = 0,
      listaEspera = 0,
      meInteresa = 0,
      ofertaEstandar = 0,
      encuestas = 0;

    for (const row of rows) {
      const uuid = row.deal_uuid;
      const boton = botonByUUID.get(uuid);
      if (boton?.source === "whatsapp") clicWA++;
      if (boton?.source === "comercial") clicCom++;

      if (listaEsperaUUIDs.has(uuid)) listaEspera++;
      if (meInteresaUUIDs.has(uuid)) meInteresa++;
      if (ofertaEstandarUUIDs.has(uuid)) ofertaEstandar++;

      if (filteredEncuestaUUIDs.has(uuid)) encuestas++;
    }

    const pctOf = (n: number) =>
      ofertados > 0 ? Math.round((n / ofertados) * 1000) / 10 : 0;

    result.push({
      date,
      ofertados,
      enviados,
      exitosos,
      clicWA,
      clicCom,
      listaEspera,
      meInteresa,
      ofertaEstandar,
      encuestas,
      pctEnviados: pctOf(enviados),
      pctExitosos: pctOf(exitosos),
      pctClicWA: pctOf(clicWA),
      pctClicCom: pctOf(clicCom),
      pctListaEspera: pctOf(listaEspera),
      pctMeInteresa: pctOf(meInteresa),
      pctOfertaEstandar: pctOf(ofertaEstandar),
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

export function buildDetailRows(
  bqData: BigQueryRow[],
  logsIntro: LogIntro[],
  logsBoton: LogBoton[],
  subSegFilter: string,
): DetailRow[] {
  const filtered =
    subSegFilter === "all"
      ? bqData
      : bqData.filter((r) => r.sub_segmento_seller_mx === subSegFilter);

  const introByUUID = new Map(
    deduplicateByUUID(logsIntro).map((r) => [r.uuid, r]),
  );
  const botonByUUID = new Map(
    deduplicateBotonByUUID(logsBoton).map((r) => [r.uuid, r]),
  );

  return filtered.map((row) => {
    const intro = introByUUID.get(row.deal_uuid);
    const boton = botonByUUID.get(row.deal_uuid);
    return {
      nid: row.nid,
      cellphone: row.cellphone,
      dealname: row.dealname,
      deal_uuid: row.deal_uuid,
      template_id: row.template_id,
      mensajes_exitosos: row.mensajes_exitosos,
      abrieron_pagina: boton !== undefined,
      source_boton: boton?.source ?? null,
      hubspot_owner_id: row.hubspot_owner_id,
      segmento_seller_mx: row.segmento_seller_mx,
      sub_segmento_seller_mx: row.sub_segmento_seller_mx,
      razon_de_venta_usuario_gabi_mx: row.razon_de_venta_usuario_gabi_mx ?? "",
      eleccion: intro?.type_button ?? "sin_respuesta",
    };
  });
}
