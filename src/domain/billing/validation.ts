export type BillingField =
  | 'fechaInicio'
  | 'fechaFin'
  | 'kwPunta'
  | 'kwValle'
  | 'precioMargen'
  | 'precioKwPunta'
  | 'precioKwValle'
  | 'kwhPunta'
  | 'kwhLlano'
  | 'kwhValle'
  | 'precioKwhPunta'
  | 'precioKwhLlano'
  | 'precioKwhValle'
  | 'costeEnergiaVariable' // For legacy support/validation
  | 'costeEnergiaPunta'
  | 'costeEnergiaLlano'
  | 'costeEnergiaValle'
  | 'alqContador'
  | 'bonoSocial'
  | 'iee'
  | 'iva'
  | 'presupuesto'
  | 'general';

export interface BillingValidationError {
  field: BillingField;
  code: string;
  message: string;
}

export interface BillingValidationResult {
  isValid: boolean;
  errors: BillingValidationError[];
}

import { LIMITS, MILLISECONDS_PER_DAY } from './constants';
import type { BillData } from './types';

export function validateBillData(data: BillData): BillingValidationResult {
  const errors: BillingValidationError[] = [];
  const addError = (field: BillingField, code: string, message: string) => {
    errors.push({ field, code, message });
  };

  const validateRequiredNumber = (field: BillingField, value: number | undefined | null, limit: { MIN: number; MAX: number }) => {
    if (value === undefined || value === null) {
      addError(field, 'REQUIRED', 'Este campo es obligatorio.');
      return;
    }
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      addError(field, 'INVALID_NUMBER', 'El valor debe ser un número válido.');
      return;
    }
    if (value < limit.MIN || value > limit.MAX) {
      addError(field, 'OUT_OF_RANGE', `El valor debe estar entre ${limit.MIN} y ${limit.MAX}.`);
    }
  };

  if (!data.fechaInicio) {
    addError('fechaInicio', 'REQUIRED', 'La fecha inicial es obligatoria.');
  }
  if (!data.fechaFin) {
    addError('fechaFin', 'REQUIRED', 'La fecha final es obligatoria.');
  }

  if (data.fechaInicio && data.fechaFin) {
    const inicioRegex = /^\d{4}-\d{2}-\d{2}$/;
    const finRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!inicioRegex.test(data.fechaInicio)) {
      addError('fechaInicio', 'INVALID_FORMAT', 'El formato de fecha debe ser YYYY-MM-DD.');
    }
    if (!finRegex.test(data.fechaFin)) {
      addError('fechaFin', 'INVALID_FORMAT', 'El formato de fecha debe ser YYYY-MM-DD.');
    }

    if (inicioRegex.test(data.fechaInicio) && finRegex.test(data.fechaFin)) {
      const partsInicio = data.fechaInicio.split('-');
      const partsFin = data.fechaFin.split('-');
      
      const y1 = parseInt(partsInicio[0], 10);
      const m1 = parseInt(partsInicio[1], 10) - 1;
      const d1 = parseInt(partsInicio[2], 10);
      
      const y2 = parseInt(partsFin[0], 10);
      const m2 = parseInt(partsFin[1], 10) - 1;
      const d2 = parseInt(partsFin[2], 10);

      const t1 = Date.UTC(y1, m1, d1);
      const t2 = Date.UTC(y2, m2, d2);
      
      const d1Obj = new Date(t1);
      const d2Obj = new Date(t2);
      
      if (d1Obj.getUTCFullYear() !== y1 || d1Obj.getUTCMonth() !== m1 || d1Obj.getUTCDate() !== d1) {
          addError('fechaInicio', 'INVALID_DATE', 'La fecha inicial es inválida o no existe.');
      } else if (d2Obj.getUTCFullYear() !== y2 || d2Obj.getUTCMonth() !== m2 || d2Obj.getUTCDate() !== d2) {
          addError('fechaFin', 'INVALID_DATE', 'La fecha final es inválida o no existe.');
      } else {
        const dias = Math.floor((t2 - t1) / MILLISECONDS_PER_DAY) + 1;
        
        if (dias < LIMITS.DIAS.MIN) {
           addError('fechaFin', 'INVERTED_PERIOD', 'La fecha final no puede ser anterior a la inicial.');
        } else if (dias > LIMITS.DIAS.MAX) {
           addError('fechaFin', 'PERIOD_TOO_LONG', `El periodo no puede exceder los ${LIMITS.DIAS.MAX} días.`);
        }
      }
    }
  }

  validateRequiredNumber('kwPunta', data.kwPunta, LIMITS.KW);
  validateRequiredNumber('kwValle', data.kwValle, LIMITS.KW);
  validateRequiredNumber('precioMargen', data.precioMargen, LIMITS.PRECIO_KW_ANO);
  validateRequiredNumber('precioKwPunta', data.precioKwPunta, LIMITS.PRECIO_KW_ANO);
  validateRequiredNumber('precioKwValle', data.precioKwValle, LIMITS.PRECIO_KW_ANO);
  
  validateRequiredNumber('kwhPunta', data.kwhPunta, LIMITS.KWH);
  validateRequiredNumber('kwhLlano', data.kwhLlano, LIMITS.KWH);
  validateRequiredNumber('kwhValle', data.kwhValle, LIMITS.KWH);
  
  validateRequiredNumber('precioKwhPunta', data.precioKwhPunta, LIMITS.PRECIO_KWH);
  validateRequiredNumber('precioKwhLlano', data.precioKwhLlano, LIMITS.PRECIO_KWH);
  validateRequiredNumber('precioKwhValle', data.precioKwhValle, LIMITS.PRECIO_KWH);
  validateRequiredNumber('costeEnergiaVariable', data.costeEnergiaVariable, LIMITS.PRECIO_KWH);
  
  validateRequiredNumber('costeEnergiaPunta', data.costeEnergiaPunta, LIMITS.PRECIO_KWH);
  validateRequiredNumber('costeEnergiaLlano', data.costeEnergiaLlano, LIMITS.PRECIO_KWH);
  validateRequiredNumber('costeEnergiaValle', data.costeEnergiaValle, LIMITS.PRECIO_KWH);

  validateRequiredNumber('alqContador', data.alqContador, LIMITS.ALQ_CONTADOR);
  validateRequiredNumber('bonoSocial', data.bonoSocial, LIMITS.BONO_SOCIAL);
  validateRequiredNumber('iee', data.iee, LIMITS.IMPUESTO);
  validateRequiredNumber('iva', data.iva, LIMITS.IMPUESTO);
  validateRequiredNumber('presupuesto', data.presupuesto, LIMITS.PRESUPUESTO);

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function assertValidBillData(data: BillData): void {
  const result = validateBillData(data);
  if (!result.isValid) {
    throw new Error(`Datos de facturación inválidos: ${result.errors.map(e => e.message).join(', ')}`);
  }
}
