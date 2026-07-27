export interface BillData {
  fechaInicio: string;
  fechaFin: string;
  presupuesto: number;
  
  // Potencia contratada
  kwPunta: number;
  kwValle: number;
  precioMargen: number; // €/kW/año
  precioKwPunta: number; // €/kW/año
  precioKwValle: number; // €/kW/año
  
  // Consumo energético
  kwhPunta: number;
  kwhLlano: number;
  kwhValle: number;
  
  // Preajes y cargos de consumo
  precioKwhPunta: number; // €/kWh
  precioKwhLlano: number; // €/kWh
  precioKwhValle: number; // €/kWh
  
  // Coste energía variable (mercado mayorista Pool)
  costeEnergiaVariable: number; // €/kWh
  costeEnergiaPunta: number; // €/kWh
  costeEnergiaLlano: number; // €/kWh
  costeEnergiaValle: number; // €/kWh
  
  // Conceptos regulados
  alqContador: number; // €/día
  bonoSocial: number; // € fijo periodo
  
  // Impuestos
  iee: number; // % Impuesto Eléctrico (modo porcentaje)
  ieeMinComunitario?: number; // €/kWh tarifa mínimo comunitario (si se usa este modo)
  iva: number; // % IVA (10 o 21)
}

export interface BillResults {
  dias: number;
  totalFijo: number;
  // Término Fijo desglosado
  fijoPunta: number;   // P1 (punta): kW × €/kW/año × días/365
  fijoValle: number;   // P2 (valle): kW × €/kW/año × días/365
  fijoMargen: number;  // Margen de comercialización fijo
  totalVariable: number;
  // Peajes desglosados por periodo
  totalPeajes: number;
  peajesPunta: number;
  peajesLlano: number;
  peajesValle: number;
  // Coste energía desglosado por periodo
  totalEnergia: number;
  energiaPunta: number;
  energiaLlano: number;
  energiaValle: number;
  // Resto
  totalIee: number;
  totalRegulados: number;
  totalBonoSocial: number;
  totalAlquiler: number;
  totalIva: number;
  totalFactura: number;
  alertaPresupuesto: boolean;
  engineVersion?: string;
}
