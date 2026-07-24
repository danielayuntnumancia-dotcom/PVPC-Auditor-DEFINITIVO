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
  iee: number; // % Impuesto Eléctrico
  iva: number; // % IVA (10 o 21)
}

export interface BillResults {
  dias: number;
  totalFijo: number;
  totalVariable: number;
  totalPeajes: number;
  totalEnergia: number;
  totalIee: number;
  totalRegulados: number;
  totalIva: number;
  totalFactura: number;
  alertaPresupuesto: boolean;
  engineVersion?: string;
}
