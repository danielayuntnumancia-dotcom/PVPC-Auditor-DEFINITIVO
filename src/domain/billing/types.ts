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

  // Mercado Libre / Perfil de Tarifa (opcionales para compatibilidad total con PVPC)
  perfilTarifaId?: string;
  nombreTarifa?: string;
  descuentoEnergia?: number; // % descuento sobre coste de energía (0-100)
  serviciosAdicionales?: number; // € fijo en el periodo (mantenimiento, seguros, etc.)
}

export type TariffModality = 'pvpc' | 'fijo24h' | 'periodos3' | 'personalizado';

export interface TariffProfile {
  id: string;
  nombre: string;
  comercializadora: string;
  modalidad: TariffModality;
  unidadPotencia: 'anual' | 'diaria'; // €/kW/año o €/kW/día
  precioKwPunta: number; // siempre almacenado en €/kW/año para el motor
  precioKwValle: number; // siempre almacenado en €/kW/año para el motor
  precioMargen: number;  // €/kW/año (0 si ya va incluido en potencia)
  peajesIncluidos: boolean; // true en tarifas de mercado libre con precio final €/kWh
  precioKwhPunta: number; // peaje P1 €/kWh (0 si peajesIncluidos)
  precioKwhLlano: number; // peaje P2 €/kWh (0 si peajesIncluidos)
  precioKwhValle: number; // peaje P3 €/kWh (0 si peajesIncluidos)
  costeEnergiaPunta: number; // €/kWh P1 (o precio único 24h)
  costeEnergiaLlano: number; // €/kWh P2 (o precio único 24h)
  costeEnergiaValle: number; // €/kWh P3 (o precio único 24h)
  descuentoEnergia: number; // % descuento sobre término de energía
  serviciosAdicionales: number; // € fijos en la factura (mantenimiento/asistencia)
  alqContador: number; // €/día
  bonoSocial: number; // € fijo periodo
  iee: number; // %
  iva: number; // %
  timestamp: number;
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
