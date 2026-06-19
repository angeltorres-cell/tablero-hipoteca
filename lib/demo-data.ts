import { BigQueryRow, LogBoton, LogIntro, LogEncuesta } from "./types";

const SUB_SEGMENTS = ["Premium", "Estándar", "Masivo"] as const;
const DAYS = [
  "2026-06-12",
  "2026-06-13",
  "2026-06-14",
  "2026-06-15",
  "2026-06-16",
  "2026-06-17",
  "2026-06-18",
];

export function generateDemoBigQueryData(): BigQueryRow[] {
  const rows: BigQueryRow[] = [];
  for (let i = 0; i < 150; i++) {
    const uuid = `uuid-${String(i).padStart(4, "0")}`;
    const day = DAYS[i % DAYS.length];
    const hour = String(8 + (i % 10)).padStart(2, "0");
    const minute = String((i * 7) % 60).padStart(2, "0");
    const second = String((i * 13) % 60).padStart(2, "0");
    rows.push({
      created_at: `${day}T${hour}:${minute}:${second}`,
      cellphone: `521${String(5500000000 + i)}`,
      dealname: `Deal ${uuid}`,
      nid: String(1000000 + i),
      deal_uuid: uuid,
      mensajes_exitosos: i % 8 !== 0 ? 1 : 0,
      template_id: "envio_oferta_liquidez_mx_angeltorres_12jun26",
      additional_data: "{}",
      hubspot_owner_id: String(100 + (i % 5)),
      segmento_seller_mx: "Hipoteca",
      sub_segmento_seller_mx: SUB_SEGMENTS[i % 3],
      razon_de_venta_usuario_gabi_mx: ["Tasas altas", "Liquidez", "Cambio de propiedad", "Otro", ""][i % 5],
    });
  }
  return rows;
}

export function generateDemoLogsBoton(): LogBoton[] {
  const logs: LogBoton[] = [];
  for (let i = 0; i < 60; i++) {
    const uuid = `uuid-${String(i).padStart(4, "0")}`;
    const day = DAYS[i % DAYS.length];
    const hour = String(9 + (i % 8)).padStart(2, "0");
    const minute = String((i * 11) % 60).padStart(2, "0");
    logs.push({
      fecha: day,
      hora: `${hour}:${minute}:00`,
      uuid,
      source: i % 3 === 0 ? "comercial" : "whatsapp",
    });
  }
  // Duplicate records (later, opposite source) for first 10 UUIDs — dedup should discard these
  for (let i = 0; i < 10; i++) {
    const uuid = `uuid-${String(i).padStart(4, "0")}`;
    logs.push({
      fecha: DAYS[(i + 3) % DAYS.length],
      hora: `16:${String(i * 5).padStart(2, "0")}:00`,
      uuid,
      source: i % 3 === 0 ? "whatsapp" : "comercial",
    });
  }
  return logs;
}

export function generateDemoLogsIntro(): LogIntro[] {
  const TYPE_BUTTONS = [
    "lista_espera",
    "lista_espera",
    "lista_espera",
    "oferta_estandar",
    "me_interesa",
  ] as const;

  const logs: LogIntro[] = [];
  for (let i = 0; i < 45; i++) {
    const uuid = `uuid-${String(i).padStart(4, "0")}`;
    const day = DAYS[i % DAYS.length];
    const hour = String(10 + (i % 6)).padStart(2, "0");
    const minute = String((i * 9) % 60).padStart(2, "0");
    logs.push({
      fecha: day,
      hora: `${hour}:${minute}:00`,
      uuid,
      type_button: TYPE_BUTTONS[i % TYPE_BUTTONS.length],
    });
  }
  // Duplicate records (later, all lista_espera) — dedup should discard these
  for (let i = 0; i < 5; i++) {
    const uuid = `uuid-${String(i).padStart(4, "0")}`;
    logs.push({
      fecha: "2026-06-18",
      hora: `17:${String(i * 10).padStart(2, "0")}:00`,
      uuid,
      type_button: "lista_espera",
    });
  }
  return logs;
}

const SURVEY_QUESTIONS = [
  {
    question: "¿Cuál es tu principal motivo para cancelar?",
    question_type: "multiple_choice",
    answers: ["Tasas altas", "Liquidez", "Cambio de propiedad", "Otro"],
  },
  {
    question: "¿En cuánto tiempo planeas cancelar?",
    question_type: "multiple_choice",
    answers: ["1 mes", "3 meses", "6 meses", "No estoy seguro"],
  },
  {
    question: "¿Cómo conociste este servicio?",
    question_type: "multiple_choice",
    answers: ["WhatsApp", "Asesor comercial", "Redes sociales", "Recomendación"],
  },
];

export function generateDemoLogsEncuestas(): LogEncuesta[] {
  const logs: LogEncuesta[] = [];
  for (let i = 0; i < 15; i++) {
    const uuid = `uuid-${String(i * 2).padStart(4, "0")}`;
    const day = DAYS[i % DAYS.length];
    const hour = String(11 + (i % 5)).padStart(2, "0");
    SURVEY_QUESTIONS.forEach((q, qi) => {
      logs.push({
        fecha: day,
        hora: `${hour}:${String(qi * 5).padStart(2, "0")}:00`,
        uuid,
        question: q.question,
        answer: q.answers[(i + qi) % q.answers.length],
        question_type: q.question_type,
      });
    });
  }
  return logs;
}
