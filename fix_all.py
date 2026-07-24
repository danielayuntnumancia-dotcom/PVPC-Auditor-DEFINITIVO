import re

with open('src/App.tsx', 'r') as f:
    app = f.read()
    
# 1. Datos pendientes de corregir
# I will check if it actually exists. My python script 'patch_final.py' inserted it.
# Let's see if it's there.

if 'Datos pendientes de corregir' not in app:
    # insert it
    print("WARNING: Datos pendientes de corregir NOT in App.tsx")
    
if 'Simulador de ahorro pendiente de activación. Estos controles no modifican la factura.' not in app:
    print("WARNING: Sandbox string NOT in App.tsx")

with open('tests/characterization/calculator.characterization.test.ts', 'r') as f:
    calc = f.read()

calc = re.sub(r'assert\.equal\(result\.totalEnergia, 0\);', 'assert.throws(() => calcularFactura(data));', calc)

with open('tests/characterization/calculator.characterization.test.ts', 'w') as f:
    f.write(calc)
