import { BillData } from "./types";
import { DEFAULT_PVPC_VALUES, calcularFactura, validateBillData } from './domain/billing';
export { DEFAULT_PVPC_VALUES, calcularFactura, validateBillData };

export const DEMO_PROFILES = [
  {
    name: "Perfil Ahorrador",
    description: "Bajo consumo, potencia optimizada (3.3 kW) y hábitos eficientes en periodo valle.",
    data: {
      ...DEFAULT_PVPC_VALUES,
      kwPunta: 3.3,
      kwValle: 3.3,
      kwhPunta: 40.2,
      kwhLlano: 45.1,
      kwhValle: 95.8,
      presupuesto: 60,
    }
  },
  {
    name: "Hogar Familiar (Consumo Alto)",
    description: "Potencia elevada (5.5 kW) y uso intensivo de electrodomésticos en horas punta/llano.",
    data: {
      ...DEFAULT_PVPC_VALUES,
      kwPunta: 5.5,
      kwValle: 5.5,
      kwhPunta: 155.4,
      kwhLlano: 180.2,
      kwhValle: 210.5,
      presupuesto: 150,
    }
  }
];

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  } catch {
    return dateStr;
  }
}

export function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function deepClone<T>(obj: T): T {
  try {
    // Prefer structuredClone when available (browsers/Node 17+)
    if (typeof structuredClone !== 'undefined') return structuredClone(obj) as T;
  } catch {
    // ignore
  }
  return JSON.parse(JSON.stringify(obj)) as T;
}
