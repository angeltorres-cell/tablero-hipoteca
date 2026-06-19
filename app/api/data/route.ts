import { NextResponse } from "next/server";
import { BigQueryRow, LogBoton, LogIntro, LogEncuesta } from "@/lib/types";

export async function GET() {
  const url = process.env.APPS_SCRIPT_URL;

  if (!url) {
    return NextResponse.json(
      { error: "APPS_SCRIPT_URL no configurada" },
      { status: 500 },
    );
  }

  try {
    // Apps Script redirige (302) a script.googleusercontent.com — fetch lo sigue automáticamente
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    if (!res.ok) throw new Error(`Apps Script devolvió HTTP ${res.status}`);

    const json = await res.json();
    if (json.error) throw new Error(json.error);

    // BigQuery devuelve todos los valores como strings.
    // Convertimos mensajes_exitosos ("1" / "0") al número que esperan los tipos.
    const bqData: BigQueryRow[] = (json.bq_data ?? []).map(
      (row: Record<string, string>) => ({
        ...row,
        mensajes_exitosos: Number(row.mensajes_exitosos ?? 0),
      }),
    );

    return NextResponse.json({
      bq_data:        bqData,
      logs_boton:     (json.logs_boton     ?? []) as LogBoton[],
      logs_intro:     (json.logs_intro     ?? []) as LogIntro[],
      logs_encuestas: (json.logs_encuestas ?? []) as LogEncuesta[],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
