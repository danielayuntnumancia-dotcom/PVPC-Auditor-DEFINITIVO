import type { BillData, BillResults } from './domain/billing';
export type { BillData, BillResults };

export interface SourceFile {
  id: string;
  name: string;
  timestamp: number;
  explanation: string;
  parsedData: Partial<BillData>; // Datos listos para cargar si el usuario acepta
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ title: string; url: string }>;
  timestamp: string;
  sourceFileId?: string; // Vinculación opcional con la factura origen
  imageUrl?: string; // URL o base64 para mostrar miniatura de la imagen enviada
}

export interface HistoryEntry {
  id: string;
  dateStr: string; // "DD/MM/YYYY" or "YYYY-MM-DD"
  timestamp: number;
  billData: BillData;
  results: BillResults;
  tipo: 'simulacion' | 'oficial';
  mesFacturacion?: string;
}

export interface MarketOffer {
  name: string;
  company: string;
  type: string;
  energyPriceDetails: string;
  powerPriceDetails: string;
  estimatedMonthlyCost: number;
  pros: string[];
  cons: string[];
  link: string;
}

export interface MarketAnalysisData {
  offers: MarketOffer[];
  recommendations: string;
  cheapestTariffName: string;
  estimatedAnnualSavings: number;
  citations?: Array<{ title: string; url: string }>;
}