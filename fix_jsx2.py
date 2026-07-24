import re

with open('src/App.tsx', 'r') as f:
    app = f.read()

# find `{isValid && results ? (`
start_idx = app.find('{isValid && results ? (\n                    <>')

# find the end of Total Estimado
end_str = '</span>\n                    </div>\n                  </div>'
end_idx = app.find(end_str, start_idx) + len(end_str)

if start_idx != -1 and end_idx != -1:
    print("Found bounds!")
    
    # insert the closing fragment and fallback block
    fallback = '''
                  </>
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
                  )}
'''
    app = app[:end_idx] + fallback + app[end_idx:]
    
    with open('src/App.tsx', 'w') as f:
        f.write(app)
else:
    print("Could not find bounds")
