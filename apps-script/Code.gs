/*
 * ================================================================
 * INSTRUCCIONES DE DESPLIEGUE
 * ================================================================
 * 1. Ve a https://script.google.com → abre este proyecto
 * 2. Reemplaza el contenido del archivo con este código
 * 3. Panel izquierdo → "Servicios" (+) → "BigQuery API" → Añadir
 *    (si ya lo hiciste antes, ya está habilitado)
 * 4. Desplegar → Nueva implementación
 *      · Tipo: Aplicación web
 *      · Ejecutar como: Yo
 *      · Quién puede acceder: Cualquier persona (incluidos anónimos)
 *    → Copia la URL nueva y actualiza APPS_SCRIPT_URL en .env.local
 * ================================================================
 */

var SPREADSHEET_ID = '12y3HLeV6s30yoFteZsuwKdCK-Q_C8NxzgujBhA-mqD8';
var BQ_PROJECT     = 'sellers-main-prod';

var QUERY =
  'WITH ofertados AS (\n' +
  '  SELECT\n' +
  '    nid,\n' +
  '    TIMESTAMP_SUB(fecha, INTERVAL 5 HOUR) AS fecha_ofertado,\n' +
  '    dealname,\n' +
  '    sub_segmento_seller_mx,\n' +
  '    d.deal_uuid\n' +
  '  FROM `sellers-main-prod.hubspot.historical` AS h\n' +
  '  LEFT JOIN `sellers-main-prod.hubspot.deals` AS d USING (nid)\n' +
  "  WHERE propiedad = 'dealstage'\n" +
  "    AND valor = '1066441580'\n" +
  "    AND fecha >= '2026-06-17'\n" +
  '    AND sub_segmento_seller_mx IN (\n' +
  "      'Cambio de Casa - Sin destino definido, explorando opciones',\n" +
  "      'Cambio de Casa - Destino definido, mudanza pendiente',\n" +
  "      'Cambio laboral / ciudad / país',\n" +
  "      'Cambio de Casa - Mudados'\n" +
  '    )\n' +
  '),\n' +
  'enviados AS (\n' +
  '  SELECT\n' +
  '    w.cellphone,\n' +
  '    CAST(w.nid AS STRING) AS nid,\n' +
  "    CASE WHEN w.message_status IN ('delivered', 'read') THEN 1 ELSE 0 END AS mensajes_exitosos,\n" +
  '    w.template_id,\n' +
  '    TO_JSON_STRING(w.additional_data) AS additional_data,\n' +
  '    CAST(d.hubspot_owner_id AS STRING) AS hubspot_owner_id,\n' +
  '    d.segmento_seller_mx,\n' +
  '    d.razon_de_venta_usuario_gabi_mx\n' +
  '  FROM `sellers-main-prod.mx_rds_staging.habi_notifications_whatsapp_messages` AS w\n' +
  '  LEFT JOIN `sellers-main-prod.hubspot.deals` AS d\n' +
  '    ON CAST(w.nid AS STRING) = CAST(d.nid AS STRING)\n' +
  "  WHERE w.template_id = 'envio_oferta_liquidez_mx_angeltorres_12jun26'\n" +
  ')\n' +
  'SELECT\n' +
  "  FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', o.fecha_ofertado) AS fecha_ofertado,\n" +
  '  e.cellphone,\n' +
  '  o.dealname,\n' +
  '  CAST(o.nid AS STRING) AS nid,\n' +
  '  o.deal_uuid,\n' +
  '  e.mensajes_exitosos,\n' +
  '  e.template_id,\n' +
  '  e.additional_data,\n' +
  '  e.hubspot_owner_id,\n' +
  '  e.segmento_seller_mx,\n' +
  '  o.sub_segmento_seller_mx,\n' +
  '  e.razon_de_venta_usuario_gabi_mx\n' +
  'FROM ofertados AS o\n' +
  'LEFT JOIN enviados AS e ON CAST(o.nid AS STRING) = e.nid';


// ── Entry point ──────────────────────────────────────────────────────────────

function doGet() {
  try {
    var bqData     = queryBigQuery_();
    var sheetsData = readSheets_();

    var payload = {
      bq_data:        bqData,
      logs_boton:     sheetsData.logs_boton,
      logs_intro:     sheetsData.logs_intro,
      logs_encuestas: sheetsData.logs_encuestas
    };

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ── BigQuery ─────────────────────────────────────────────────────────────────
// Usamos Jobs.insert (async) en lugar de Jobs.query (sync) porque
// Jobs.query ignora useLegacySql:false en algunos entornos de Apps Script,
// lo que provoca que la query se ejecute como Legacy SQL y falle con
// los identificadores entre comillas invertidas.

function queryBigQuery_() {
  // 1. Enviar el job
  var job = BigQuery.Jobs.insert({
    configuration: {
      query: {
        query:        QUERY,
        useLegacySql: false,
        location:     'US'
      }
    }
  }, BQ_PROJECT);

  var jobId = job.jobReference.jobId;

  // 2. Esperar a que termine (máx. ~60 s, revisando cada 2 s)
  for (var i = 0; i < 30; i++) {
    Utilities.sleep(2000);
    var status = BigQuery.Jobs.get(BQ_PROJECT, jobId);
    if (status.status.state === 'DONE') {
      if (status.status.errorResult) {
        throw new Error('BigQuery: ' + status.status.errorResult.message);
      }
      break;
    }
    if (i === 29) {
      throw new Error('BigQuery: timeout después de 60 segundos.');
    }
  }

  // 3. Leer resultados con paginación
  var allRows   = [];
  var schema    = null;
  var pageToken = undefined;

  do {
    var opts = { location: 'US', maxResults: 1000 };
    if (pageToken) opts.pageToken = pageToken;

    var page = BigQuery.Jobs.getQueryResults(BQ_PROJECT, jobId, opts);
    if (!schema && page.schema) schema = page.schema.fields;
    allRows   = allRows.concat(parseRows_(page.rows || [], schema || []));
    pageToken = page.pageToken;
  } while (pageToken);

  return allRows;
}

function parseRows_(rows, schema) {
  return rows.map(function (row) {
    var obj = {};
    (row.f || []).forEach(function (field, i) {
      obj[schema[i].name] = (field.v !== null && field.v !== undefined) ? field.v : '';
    });
    return obj;
  });
}

// Función de prueba: ejecútala manualmente desde el editor para
// verificar que BigQuery responde antes de desplegar.
function testQuery() {
  try {
    var rows = queryBigQuery_();
    Logger.log('✓ BigQuery OK — ' + rows.length + ' filas');
    if (rows.length > 0) Logger.log('Primera fila: ' + JSON.stringify(rows[0]));
  } catch (err) {
    Logger.log('✗ Error: ' + String(err));
  }
}


// ── Google Sheets ─────────────────────────────────────────────────────────────

function readSheets_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return {
    logs_boton:     sheetToObjects_(ss, 'logs_boton'),
    logs_intro:     sheetToObjects_(ss, 'Logs_intro'),
    logs_encuestas: sheetToObjects_(ss, 'Logs_encuestas')
  };
}

function sheetToObjects_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  return data.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (header, i) {
      var val = row[i];
      if (val instanceof Date) {
        obj[String(header)] = Utilities.formatDate(val, 'UTC', 'yyyy-MM-dd');
      } else {
        obj[String(header)] = (val !== null && val !== undefined) ? String(val) : '';
      }
    });
    return obj;
  });
}
