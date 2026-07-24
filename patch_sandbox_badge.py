import re

with open('src/App.tsx', 'r') as f:
    app = f.read()

s = '<h3 className="font-semibold text-sm text-white">Sandbox de Ahorro e Impacto Anual</h3>'
r = '<h3 className="font-semibold text-sm text-white flex items-center gap-2">Sandbox de Ahorro e Impacto Anual <span className="bg-slate-800 text-slate-300 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold">No disponible</span></h3>'

app = app.replace(s, r)

with open('src/App.tsx', 'w') as f:
    f.write(app)
