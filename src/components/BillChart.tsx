import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { BillResults } from "../types";

interface BillChartProps {
  results?: BillResults | null;
}

type Entry = { name: string; value: number; color: string };

export default function BillChart({ results }: BillChartProps) {
  const [hoveredEntry, setHoveredEntry] = useState<Entry | null>(null);

  const safe = results ?? {
    dias: 0,
    totalFijo: 0,
    totalVariable: 0,
    totalPeajes: 0,
    totalEnergia: 0,
    totalIee: 0,
    totalRegulados: 0,
    totalIva: 0,
    totalFactura: 0,
    alertaPresupuesto: false,
  } as BillResults;

  const data: Entry[] = [
    { name: "Término Fijo (Potencia)", value: safe.totalFijo ?? 0, color: "#059669" },
    { name: "Peajes de Acceso (Variable)", value: safe.totalPeajes ?? 0, color: "#3b82f6" },
    { name: "Coste de la Energía", value: safe.totalEnergia ?? 0, color: "#06b6d4" },
    { name: "Imp. Eléctrico (IEE)", value: safe.totalIee ?? 0, color: "#f59e0b" },
    { name: "Regulados y Contador", value: safe.totalRegulados ?? 0, color: "#6366f1" },
    { name: "IVA", value: safe.totalIva ?? 0, color: "#f43f5e" },
  ].filter((item) => item.value > 0);

  const total = safe.totalFactura ?? 0;

  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-6 py-2 px-1">
      {total > 0 ? (
        <>
          {/* Gráfico Donut Centrado con Etiqueta Central */}
          <div className="h-[180px] w-[180px] shrink-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => {
                    const isHovered = hoveredEntry && hoveredEntry.name === entry.name;
                    const hasHover = hoveredEntry !== null;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        onMouseEnter={() => setHoveredEntry(entry)}
                        onMouseLeave={() => setHoveredEntry(null)}
                        style={{
                          opacity: hasHover ? (isHovered ? 1 : 0.4) : 1,
                          transition: "opacity 150ms ease-in-out",
                          cursor: "pointer"
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Texto en el centro del Donut */}
            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none max-w-[100px] px-1 select-none">
              {hoveredEntry ? (
                <>
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-tight line-clamp-2">
                    {hoveredEntry.name}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-cyan-400 mt-0.5">
                    {hoveredEntry.value.toFixed(1)}€
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {total > 0 ? ((hoveredEntry.value / total) * 100).toFixed(1) : 0}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total</span>
                  <span className="text-base font-black font-mono text-white mt-0.5">
                    {total.toFixed(2)}€
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Leyenda HTML Personalizada, Altamente Responsiva y sin Solapamiento */}
          <div className="flex-1 min-w-0 w-full space-y-1.5">
            {data.map((item, index) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
              const isHovered = hoveredEntry && hoveredEntry.name === item.name;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredEntry(item)}
                  onMouseLeave={() => setHoveredEntry(null)}
                  className={`flex items-center justify-between text-[11px] font-semibold gap-3 p-1 rounded-lg transition-all duration-150 cursor-pointer ${
                    isHovered ? 'bg-slate-900 text-white' : 'hover:bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className={`truncate ${isHovered ? 'text-white font-bold' : 'text-slate-300'}`} title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-right">
                    <span className={isHovered ? 'text-cyan-400 font-bold' : 'text-slate-200'}>
                      {item.value.toFixed(1)}€
                    </span>
                    <span className="text-slate-500 text-[9px]">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500 font-sans py-8">Introduce datos para generar el gráfico</p>
      )}
    </div>
  );
}

