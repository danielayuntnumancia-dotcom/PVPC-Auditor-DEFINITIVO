with open('tests/characterization/calculator.characterization.test.ts', 'r') as f:
    calc = f.read()

# Replace any occurrence of two `const result = calcularFactura(data);` in the same test block
import re

def dedupe(m):
    block = m.group(0)
    # keep only the first one
    first_idx = block.find('const result = calcularFactura(data);')
    if first_idx != -1:
        rest = block[first_idx + 37:]
        rest = rest.replace('const result = calcularFactura(data);\n  ', '')
        return block[:first_idx + 37] + rest
    return block

tests = calc.split("test('")
for i in range(1, len(tests)):
    tests[i] = dedupe(re.match(r'[\s\S]*', tests[i]))

calc = "test('".join(tests)

with open('tests/characterization/calculator.characterization.test.ts', 'w') as f:
    f.write(calc)
