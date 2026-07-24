import { BillData } from './types';

// Valores oficiales de referencia para PVPC 2.0TD en España
export const DEFAULT_PVPC_VALUES: BillData = {
  fechaInicio: "2026-06-01",
  fechaFin: "2026-06-30",
  presupuesto: 100,
  kwPunta: 4.4,
  kwValle: 4.4,
  precioMargen: 3.113,
  precioKwPunta: 27.704413,
  precioKwValle: 0.725423,
  kwhPunta: 85.2,
  kwhLlano: 92.4,
  kwhValle: 140.8,
  precioKwhPunta: 0.097553,
  precioKwhLlano: 0.029267,
  precioKwhValle: 0.003292,
  costeEnergiaVariable: 0.169183,
  costeEnergiaPunta: 0.169183,
  costeEnergiaLlano: 0.169183,
  costeEnergiaValle: 0.169183,
  alqContador: 0.02663,
  bonoSocial: 0.6,
  iee: 5.11269632,
  iva: 21,
};
