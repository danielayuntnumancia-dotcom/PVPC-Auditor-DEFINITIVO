import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# 1. Fix días auditados
app = app.replace("<span>{isValid && results ? results.dias : '-'} días auditados</span>", "<span>{results.dias} días auditados</span>")

# 2. Fix Sandbox Badge
app = app.replace(
    '<h3 className="font-semibold text-sm text-white flex items-center gap-2">Sandbox de Ahorro e Impacto Anual <span className="bg-slate-800 text-slate-300 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold">No disponible</span></h3>',
    '<h3 className="font-semibold text-sm text-white">Sandbox de Ahorro e Impacto Anual</h3>'
)

# 3. Fix the conditional wrapper for "Réplica de Factura"
# Start wrapper
start_str = """                  {isValid && results ? (
                    <>
                  {/* Sello de Alerta Presupuestaria */}"""
start_replacement = "                  {/* Sello de Alerta Presupuestaria */}"
app = app.replace(start_str, start_replacement)

# End wrapper
end_str = """                  </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center space-y-3">
                      <div className="border-b border-slate-800 pb-4 w-full flex flex-col items-start px-2">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-500 font-semibold">Desglose Analítico</span>
                        <h3 className="font-bold text-lg text-white mt-0.5">Réplica de Factura</h3>
                      </div>
                      <div className="m-auto flex flex-col items-center">
                        <AlertTriangle className="w-8 h-8 text-rose-500/80 mb-2" />
                        <p className="font-semibold text-rose-400">Datos pendientes de corregir</p>
                      </div>
                    </div>
                  )}"""

if end_str in app:
    app = app.replace(end_str, "")
else:
    print("Could not find exact end string, trying regex or loose match.")
    end_regex = r"\s*</>\s*\)\s*:\s*\(\s*<div[^>]*>\s*<div[^>]*>\s*<span[^>]*>Desglose Analítico</span>\s*<h3[^>]*>Réplica de Factura</h3>\s*</div>\s*<div[^>]*>\s*<AlertTriangle[^>]*/>\s*<p[^>]*>Datos pendientes de corregir</p>\s*</div>\s*</div>\s*\)}"
    app = re.sub(end_regex, "", app)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print("Restoration complete.")
