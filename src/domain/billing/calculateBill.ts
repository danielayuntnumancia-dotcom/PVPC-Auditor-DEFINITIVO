import { BillData, BillResults } from './types';
import { assertValidBillData } from './validation';
import { BILLING_ENGINE_VERSION, MILLISECONDS_PER_DAY } from './constants';
import Decimal from 'decimal.js';

export function calcularFactura(data: BillData): BillResults {
  // 1. Validate
  assertValidBillData(data);

  // 2. Parse dates strictly and calculate days
  let dias = 1;
  if (data.fechaInicio && data.fechaFin) {
    const partsInicio = data.fechaInicio.split('-');
    const partsFin = data.fechaFin.split('-');
    const t1 = Date.UTC(parseInt(partsInicio[0], 10), parseInt(partsInicio[1], 10) - 1, parseInt(partsInicio[2], 10));
    const t2 = Date.UTC(parseInt(partsFin[0], 10), parseInt(partsFin[1], 10) - 1, parseInt(partsFin[2], 10));
    dias = Math.floor((t2 - t1) / MILLISECONDS_PER_DAY) + 1;
  }
  

  
  const dDias = new Decimal(dias);

  // 1. Término Fijo (Potencia prorrateada por días)
  const dKwPunta = new Decimal(data.kwPunta);
  const dPrecioKwPunta = new Decimal(data.precioKwPunta);
  const dKwValle = new Decimal(data.kwValle);
  const dPrecioKwValle = new Decimal(data.precioKwValle);
  const dPrecioMargen = new Decimal(data.precioMargen);
  const d365 = new Decimal(365);

  const costePuntaFijo = dKwPunta.mul(dPrecioKwPunta).mul(dDias).div(d365);
  const costeValleFijo = dKwValle.mul(dPrecioKwValle).mul(dDias).div(d365);
  const costeMargen = dKwPunta.mul(dPrecioMargen).mul(dDias).div(d365);
  const totalFijo = costePuntaFijo.plus(costeValleFijo).plus(costeMargen);

  // 2. Término Variable (Energía Consumida + Peajes de Acceso)
  const dKwhPunta = new Decimal(data.kwhPunta);
  const dPrecioKwhPunta = new Decimal(data.precioKwhPunta);
  const dKwhLlano = new Decimal(data.kwhLlano);
  const dPrecioKwhLlano = new Decimal(data.precioKwhLlano);
  const dKwhValle = new Decimal(data.kwhValle);
  const dPrecioKwhValle = new Decimal(data.precioKwhValle);

  const costePeajes = dKwhPunta.mul(dPrecioKwhPunta)
    .plus(dKwhLlano.mul(dPrecioKwhLlano))
    .plus(dKwhValle.mul(dPrecioKwhValle));
                      
  const dCosteEnergiaPunta = data.costeEnergiaPunta !== undefined && data.costeEnergiaPunta !== null 
      ? new Decimal(data.costeEnergiaPunta) 
      : new Decimal(0);
  const dCosteEnergiaLlano = data.costeEnergiaLlano !== undefined && data.costeEnergiaLlano !== null 
      ? new Decimal(data.costeEnergiaLlano) 
      : new Decimal(0);
  const dCosteEnergiaValle = data.costeEnergiaValle !== undefined && data.costeEnergiaValle !== null 
      ? new Decimal(data.costeEnergiaValle) 
      : new Decimal(0);

  const costeEnergia = dKwhPunta.mul(dCosteEnergiaPunta)
    .plus(dKwhLlano.mul(dCosteEnergiaLlano))
    .plus(dKwhValle.mul(dCosteEnergiaValle));
                       
  const totalVariable = costePeajes.plus(costeEnergia);

  // 3. Impuesto sobre la Electricidad (IEE) sobre Base Eléctrica
  const baseElectrica = totalFijo.plus(totalVariable);
  const dIee = new Decimal(data.iee).div(100);
  const totalIee = baseElectrica.mul(dIee);

  // 4. Conceptos Regulados
  const dBonoSocial = new Decimal(data.bonoSocial);
  const dAlqContador = new Decimal(data.alqContador);
  const totalRegulados = dBonoSocial.plus(dAlqContador.mul(dDias));

  // 5. IVA aplicado sobre la Base Imponible Completa
  const baseImponible = baseElectrica.plus(totalIee).plus(totalRegulados);
  const dIva = new Decimal(data.iva).div(100);
  const totalIva = baseImponible.mul(dIva);

  // 6. Importe Total
  const totalFactura = baseImponible.plus(totalIva);

  // Rounding
  const outTotalFijo = totalFijo.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
  const outTotalVariable = totalVariable.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
  const outTotalPeajes = costePeajes.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
  const outTotalEnergia = costeEnergia.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
  const outTotalIee = totalIee.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
  const outTotalRegulados = totalRegulados.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
  const outTotalIva = totalIva.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
  const outTotalFactura = totalFactura.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

  const alertaPresupuesto = data.presupuesto > 0 && outTotalFactura > data.presupuesto;

  return {
    dias,
    totalFijo: outTotalFijo,
    totalVariable: outTotalVariable,
    totalPeajes: outTotalPeajes,
    totalEnergia: outTotalEnergia,
    totalIee: outTotalIee,
    totalRegulados: outTotalRegulados,
    totalIva: outTotalIva,
    totalFactura: outTotalFactura,
    alertaPresupuesto,
    engineVersion: BILLING_ENGINE_VERSION
  };
}
