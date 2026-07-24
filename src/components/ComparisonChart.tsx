import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { HistoryEntry } from "../types";
import { Scale, Zap, Info } from "lucide-react";

interface ComparisonChartProps {
  officialBills: HistoryEntry[];
}

function parseMesFacturacionInfo(mesFacturacion?: string) {
  if (!mesFacturacion) return { year: 0, monthIndex: -1 };
  const clean = mesFacturacion.toLowerCase().trim();
  
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  
  let monthIndex = -1;
  if (clean.includes('enero')) monthIndex = 0;
  else if (clean.includes('febrero')) monthIndex = 1;
  else if (clean.includes('marzo')) monthIndex = 2;
  else if (clean.includes('abril')) monthIndex = 3;
  else if (clean.includes('mayo')) monthIndex = 4;
  else if (clean.includes('junio')) monthIndex = 5;
  else if (clean.includes('julio')) monthIndex = 6;
  else if (clean.includes('agosto')) monthIndex = 7;
  else if (clean.includes('septiembre') || clean.includes('setiembre')) monthIndex = 8;
  else if (clean.includes('octubre')) monthIndex = 9;
  else if (clean.includes('noviembre')) monthIndex = 10;
  else if (clean.includes('diciembre')) monthIndex = 11;
  
  return { year, monthIndex };
}

export default function ComparisonChart({ officialBills }: ComparisonChartProps) {
  const chartData = [...officialBills]
    .map((entry) => {
      const info = parseMesFacturacionInfo(entry.mesFacturacion);
      const year = info.year || new Date(entry.timestamp).getFullYear() || 2026;
      const monthIndex = info.monthIndex !== -1 ? info.monthIndex : new Date(entry.timestamp).getMonth();
      const totalKwh = entry.billData.kwhPunta + entry.billData.kwhLlano + entry.billData.kwhValle;
      
      return {
        id: entry.id,
        name: entry.mesFacturacion || entry.dateStr,
        year,
        monthIndex,
        timestamp: entry.timestamp,
        coste: entry.results.totalFactura,
        consumo: totalKwh,
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      if (a.monthIndex !== b.monthIndex) {
        return a.monthIndex - b.monthIndex;
      }
      return a.timestamp - b.timestamp;
    });

  type TooltipDataPoint = { name?: string; year?: number; [key: string]: unknown };
  type TooltipPayload = { dataKey?: string; value?: number; payload?: TooltipDataPoint };
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
      const costeVal = payload.find((p) => p.dataKey === "coste")?.value;
      const consumoVal = payload.find((p) => p.dataKey === "consumo")?.value;
      const dataPoint = payload[0]?.payload;
      
      return (
        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-2xl space-y-2.5 max-w-[240px]">
          <div className="border-b border-slate-800 pb-1.5">
            <p className="text-xs font-black text-white tracking-tight">{dataPoint?.name ?? ""}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Año {dataPoint?.year ?? "N/A"}</p>
          </div>
          <div className="space-y-1.5">
            {costeVal !== undefined && (
              <div className="flex items-center justify-between text-xs gap-4">
                <span className="text-indigo-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Coste Total:
                </span>
                <span className="font-mono text-white font-black">{costeVal.toFixed(2)} €</span>
              </div>
            )}
            {consumoVal !== undefined && (
              <div className="flex items-center justify-between text-xs gap-4">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Consumo Total:
                </span>
                <span className="font-mono text-white font-black">{consumoVal.toFixed(1)} kWh</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Mini Cabecera del Gráfico */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-500 shrink-0" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Histórico de Gasto y Consumo Mensual</h4>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-indigo-500" /> Coste (€)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> Consumo (kWh)
          </span>
        </div>
      </div>

      {/* Contenedor del Gráfico */}
      <div className="h-[280px] w-full bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 5, bottom: 5, left: -15 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            {/* Eje Izquierdo: Coste en Euros */}
            <YAxis
              yAxisId="left"
              stroke="#818cf8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(0)}€`}
            />
            {/* Eje Derecho: Consumo en kWh */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#34d399"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(0)} kWh`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(30, 41, 59, 0.4)" }} />
            {/* Barra para el Coste */}
            <Bar
              yAxisId="left"
              dataKey="coste"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
            {/* Línea para el Consumo */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="consumo"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 4, stroke: "#0f172a", strokeWidth: 1.5, fill: "#10b981" }}
              activeDot={{ r: 6, stroke: "#0f172a", strokeWidth: 2, fill: "#34d399" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-2 bg-slate-950/40 p-3 rounded-lg border border-slate-900/60">
        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Esta gráfica interactiva consolida la evolución mensual de tus facturas oficiales. El eje izquierdo (columnas violetas) representa el <strong>coste facturado en euros (€)</strong>, mientras que el eje derecho (línea verde) representa el <strong>consumo eléctrico total en kilovatios hora (kWh)</strong>. Puedes pasar el cursor por encima para ver el desglose exacto de cada mes.
        </p>
      </div>
    </div>
  );
}
