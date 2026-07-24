import { useState } from "react";
import { BillData, BillResults } from "../types";
import { Sparkles, ArrowRight, Zap, TrendingDown } from "lucide-react";

interface BillOptimizerProps {
  data: BillData;
  results: BillResults;
  onApplyOptimization: (optimizedData: Partial<BillData>) => void;
}

export default function BillOptimizer({ data, results, onApplyOptimization }: BillOptimizerProps) {
  const [shiftPercentage, setShiftPercentage] = useState<number>(15);
  const [targetKwPunta, setTargetKwPunta] = useState<number>(Math.max(2.2, Number((data.kwPunta - 0.5).toFixed(1))));

  // --- 1. Load Shifting Calculation ---
  // Shift energy from Punta (peak) to Valle (cheapest)
  const kwhToShift = Number(((data.kwhPunta * shiftPercentage) / 100).toFixed(2));
  const tollDifference = data.precioKwhPunta - data.precioKwhValle; // savings per kWh shifted
  const activeBillSavings = kwhToShift * tollDifference;
  const annualShiftSavings = activeBillSavings * (365 / results.dias);

  // --- 2. Power Lowering Calculation ---
  // Annual cost per kW in Punta: peajeKwPunta + margen commercial
  const annualKwCostPunta = data.precioKwPunta + data.precioMargen;
  const kwDifference = Math.max(0, data.kwPunta - targetKwPunta);
  const annualPowerSavings = kwDifference * annualKwCostPunta;
  const activeBillPowerSavings = (annualPowerSavings * results.dias) / 365;

  const totalAnnualSavings = annualShiftSavings + annualPowerSavings;
  const totalActiveSavings = activeBillSavings + activeBillPowerSavings;

  return (
    <div id="optimizer-panel" className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-start gap-3">
          <TrendingDown className="text-emerald-500 shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 font-sans">
              Potencial de Ahorro Anual
            </h3>
            <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400 font-display mt-1">
              {totalAnnualSavings.toFixed(2)} € <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ año</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Equivale a {totalActiveSavings.toFixed(2)} € de ahorro en esta factura actual de {results.dias} días.
            </p>
          </div>
        </div>

        <div className="bg-indigo-500/5 dark:bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl flex items-start gap-3">
          <Sparkles className="text-indigo-500 shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 font-sans">
              Calificación de Eficiencia
            </h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold text-indigo-500 dark:text-indigo-400 font-sans">
                {data.kwhValle > (data.kwhPunta + data.kwhLlano) ? "Clase A (Óptima)" : "Clase B (Mejorable)"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
              {data.kwhValle > (data.kwhPunta + data.kwhLlano)
                ? "Gran hábitos de consumo: la mayoría de tus electrodomésticos funcionan en periodo Valle."
                : "Se aconseja desplazar más consumo (termo, lavadora, lavavajillas) a horas Valle."}
            </p>
          </div>
        </div>
      </div>

      {/* Simulator 1: Load Shifting (Desplazamiento) */}
      <div className="bg-white dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/60 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="text-emerald-500" size={18} />
            <h4 className="font-bold text-slate-900 dark:text-slate-150 text-sm font-sans">
              Simulador: Desplazar consumo de Punta a Valle
            </h4>
          </div>
          <span className="text-2xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans">
            {shiftPercentage}% de cambio
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
          Simula trasladar un porcentaje de tu consumo de horas punta (caras: 10:00-14:00, 18:00-22:00) a horas valle (baratas: 00:00-08:00, fines de semana).
        </p>

        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="50"
            value={shiftPercentage}
            onChange={(e) => setShiftPercentage(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-3xs text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
            <span>0% (Sin cambios)</span>
            <span>25% (Hogar activo)</span>
            <span>50% (Muy eficiente)</span>
          </div>
        </div>

        {shiftPercentage > 0 && (
          <div className="bg-slate-50 dark:bg-slate-950/45 p-4 rounded-xl text-xs space-y-1.5 border border-slate-150 dark:border-slate-800/40">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">Energía movida a Valle:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{kwhToShift} kWh</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">Ahorro en peajes (esta factura):</span>
              <span className="font-mono font-bold text-emerald-500">-{activeBillSavings.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">Impacto estimado anual:</span>
              <span className="font-mono font-bold text-emerald-500">-{annualShiftSavings.toFixed(2)} € / año</span>
            </div>
            <button
              onClick={() => onApplyOptimization({
                kwhPunta: Number((data.kwhPunta - kwhToShift).toFixed(2)),
                kwhValle: Number((data.kwhValle + kwhToShift).toFixed(2))
              })}
              className="mt-2.5 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 dark:hover:text-white hover:text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              Aplicar este consumo al formulario <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Simulator 2: Contracted Power (Potencia) */}
      <div className="bg-white dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/60 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-indigo-500" size={18} />
            <h4 className="font-bold text-slate-900 dark:text-slate-150 text-sm font-sans">
              Simulador: Ajustar potencia contratada (Punta)
            </h4>
          </div>
          <span className="text-2xs font-bold bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans">
            {targetKwPunta} kW sugerido
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
          La potencia punta de tu factura actual es de <span className="font-bold text-slate-700 dark:text-slate-200">{data.kwPunta} kW</span>. Reducirla ayuda a ahorrar una cuota fija, siempre que no sobrepases tu potencia pico real simultánea.
        </p>

        <div className="space-y-2">
          <input
            type="range"
            min="1.5"
            max={data.kwPunta}
            step="0.1"
            value={targetKwPunta}
            onChange={(e) => setTargetKwPunta(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-3xs text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
            <span>1.5 kW (Mínimo)</span>
            <span>{data.kwPunta} kW (Actual)</span>
          </div>
        </div>

        {kwDifference > 0 && (
          <div className="bg-slate-50 dark:bg-slate-950/45 p-4 rounded-xl text-xs space-y-1.5 border border-slate-150 dark:border-slate-800/40">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">Reducción de potencia:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">-{kwDifference.toFixed(1)} kW</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">Ahorro en esta factura:</span>
              <span className="font-mono font-bold text-indigo-500">-{activeBillPowerSavings.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">Ahorro anual permanente:</span>
              <span className="font-mono font-bold text-indigo-500">-{annualPowerSavings.toFixed(2)} € / año</span>
            </div>
            <button
              onClick={() => onApplyOptimization({
                kwPunta: targetKwPunta,
                kwValle: targetKwPunta, // Comúnmente se igualan las potencias
              })}
              className="mt-2.5 w-full py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 dark:text-indigo-400 dark:hover:text-white hover:text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              Ajustar potencia en el formulario <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* PVPC vs Mercado Libre Educational Table */}
      <div className="bg-slate-50 dark:bg-slate-900/10 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/40 space-y-3">
        <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-sans">
          ¿PVPC Regulado o Mercado Libre?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
            <span className="font-bold text-emerald-500 text-sm font-sans">Mercado Regulado (PVPC)</span>
            <ul className="list-disc pl-4 space-y-1.5 mt-2.5 text-slate-600 dark:text-slate-400 font-sans">
              <li>Precio indexado al mercado mayorista hora a hora.</li>
              <li>Excelente para hogares con consumo flexible y nocturno.</li>
              <li><strong>Obligatorio</strong> para poder solicitar el Bono Social.</li>
              <li>Sin cuotas ni servicios adicionales ocultos.</li>
            </ul>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
            <span className="font-bold text-indigo-500 text-sm font-sans">Mercado Libre</span>
            <ul className="list-disc pl-4 space-y-1.5 mt-2.5 text-slate-600 dark:text-slate-400 font-sans">
              <li>Tarifas planas, estables o con horas gratis.</li>
              <li>Suelen ser más caras pero aportan previsibilidad total.</li>
              <li>No dan derecho al Bono Social.</li>
              <li>Cuidado con los servicios de mantenimiento asociados.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
