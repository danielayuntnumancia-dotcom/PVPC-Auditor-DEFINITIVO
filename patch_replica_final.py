import re

with open('src/App.tsx', 'r') as f:
    app = f.read()

start_marker = '{/* Sello de Alerta Presupuestaria */}'
end_marker = '</div>\n                  </div>\n                </div>\n                {/* ACCORDEÓN: SANDBOX DE OPTIMIZACIÓN */}'

idx_start = app.find(start_marker)
idx_end = app.find('{/* ACCORDEÓN: SANDBOX DE OPTIMIZACIÓN */}')

if idx_start != -1 and idx_end != -1:
    # go back a bit to include the parent div
    # Actually, we can just insert `{isValid && results ? (<>` before `{/* Sello de Alerta Presupuestaria */}`
    app = app[:idx_start] + '{isValid && results ? (<>\n' + app[idx_start:idx_end] + '''</>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center space-y-3">
                      <div className="border-b border-slate-800 pb-4 w-full mb-auto text-left">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-500 font-semibold">Desglose Analítico</span>
                        <h3 className="font-bold text-lg text-white mt-0.5">Réplica de Factura</h3>
                      </div>
                      <div className="m-auto flex flex-col items-center">
                        <AlertTriangle className="w-8 h-8 text-rose-500/80 mb-2" />
                        <p className="font-semibold text-rose-400">Datos pendientes de corregir</p>
                      </div>
                    </div>
                  )}\n''' + app[idx_end:]

    # Also fix Resumen Rapido:
    app = app.replace('<span>{results.dias} días auditados</span>', '<span>{isValid && results ? results.dias : \'—\'} días auditados</span>')

with open('src/App.tsx', 'w') as f:
    f.write(app)

