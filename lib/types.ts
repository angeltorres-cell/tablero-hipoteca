export interface BigQueryRow {
  created_at: string;
  cellphone: string;
  dealname: string;
  nid: string;
  deal_uuid: string;
  mensajes_exitosos: number;
  template_id: string;
  additional_data: string;
  hubspot_owner_id: string;
  segmento_seller_mx: string;
  sub_segmento_seller_mx: string;
  razon_de_venta_usuario_gabi_mx: string;
}

export type Eleccion = "lista_espera" | "oferta_estandar" | "me_interesa" | "sin_respuesta";

export interface DetailRow {
  nid: string;
  cellphone: string;
  dealname: string;
  deal_uuid: string;
  mensajes_exitosos: number;
  hubspot_owner_id: string;
  segmento_seller_mx: string;
  sub_segmento_seller_mx: string;
  razon_de_venta_usuario_gabi_mx: string;
  eleccion: Eleccion;
}

export interface LogBoton {
  fecha: string;
  hora: string;
  uuid: string;
  source: "whatsapp" | "comercial";
}

export interface LogIntro {
  fecha: string;
  hora: string;
  uuid: string;
  type_button: "lista_espera" | "oferta_estandar" | "me_interesa";
}

export interface LogEncuesta {
  fecha: string;
  hora: string;
  uuid: string;
  question: string;
  answer: string;
  question_type: string;
}

export interface KPIs {
  enviados: number;
  exitosos: number;
  clicWA: number;
  clicCom: number;
  clicTotal: number;
  listaEspera: number;
  meInteresa: number;
  ofertaEstandar: number;
  encuestas: number;
}

export interface FunnelStage {
  label: string;
  value: number;
  color: string;
}

export interface ConversionDataPoint {
  date: string;
  enviados: number;
  exitosos: number;
  clicWA: number;
  clicCom: number;
  listaEspera: number;
  meInteresa: number;
  encuestas: number;
  pctExitosos: number;
  pctClicWA: number;
  pctClicCom: number;
  pctListaEspera: number;
  pctMeInteresa: number;
  pctEncuestas: number;
  ofertaEstandar: number;
  pctOfertaEstandar: number;
}

export type DateGrouping = "daily" | "weekly" | "monthly";
export type DataSource = "live" | "demo" | "loading" | "error";
export type FunnelFilter =
  | "enviados"
  | "exitosos"
  | "abrieron_pagina"
  | "lista_espera"
  | "me_interesa"
  | "encuestas"
  | "oferta_estandar"
  | null;
