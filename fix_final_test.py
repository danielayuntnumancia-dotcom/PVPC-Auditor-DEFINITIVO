import re

with open('tests/characterization/calculator.characterization.test.ts', 'r') as f:
    calc = f.read()

calc = calc.replace('const result = calcularFactura(data);\n  \n  // Si usara || fallback general', '// removed')
calc = calc.replace('const result = calcularFactura(data);\n  // Now it throws validation error', '')

with open('tests/characterization/calculator.characterization.test.ts', 'w') as f:
    f.write(calc)
