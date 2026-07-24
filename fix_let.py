import re

with open('tests/characterization/calculator.characterization.test.ts', 'r') as f:
    calc = f.read()

# Just change all `const result = calcularFactura(data);` to `let resultX = calcularFactura(data);`?
# NO, they are in DIFFERENT `test` blocks. A `const` inside a function scope is fine, UNLESS there are TWO in the same test block!
# Let's find tests that have MORE THAN ONE `const result = calcularFactura(data);`.

tests = calc.split("test('")
for i in range(1, len(tests)):
    count = tests[i].count('const result = calcularFactura(data);')
    if count > 1:
        # replace the subsequent ones with just `result = calcularFactura(data);`
        # wait, we can just replace ALL `const result =` with `const result =` for the first one and `result = ` for the rest!
        # or even easier, replace ALL `const result = calcularFactura(data);` with `var result = calcularFactura(data);`!
        tests[i] = tests[i].replace('const result = calcularFactura(data);', 'var result = calcularFactura(data);')

calc = "test('".join(tests)

with open('tests/characterization/calculator.characterization.test.ts', 'w') as f:
    f.write(calc)
