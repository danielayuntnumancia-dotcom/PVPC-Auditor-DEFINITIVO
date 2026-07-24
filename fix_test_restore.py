import re

with open('tests/characterization/calculator.characterization.test.ts', 'r') as f:
    calc = f.read()

# I will find every `assert.equal(result` or `assert.strictEqual(result` or `assert.throws(() => result`
# and if there is no `const result = calcularFactura(data);` before it, I insert it!

def fix_result(m):
    block = m.group(0)
    if 'const result = ' not in block and 'result.' in block:
        # insert const result = calcularFactura(data); before the first assert
        assert_idx = block.find('assert.')
        return block[:assert_idx] + 'const result = calcularFactura(data);\n  ' + block[assert_idx:]
    return block

# The tests look like test('...', () => { ... });
# I can just split by "test('" and then fix each one!
tests = calc.split("test('")
for i in range(1, len(tests)):
    if 'Fallback de energía por operador nullish conserva ceros y rechaza fallback general' in tests[i]:
        # we don't need result here because it throws
        tests[i] = tests[i].replace('const result = calcularFactura(data);\n', '')
        tests[i] = re.sub(r'assert\.equal\(result\.totalEnergia, 0\);', 'assert.throws(() => calcularFactura(data));', tests[i])
    else:
        # insert const result = calcularFactura(data); if needed
        if 'result.' in tests[i] and 'const result = calcularFactura(data);' not in tests[i]:
            assert_idx = tests[i].find('assert.')
            if assert_idx != -1:
                tests[i] = tests[i][:assert_idx] + 'const result = calcularFactura(data);\n  ' + tests[i][assert_idx:]

calc = "test('".join(tests)

with open('tests/characterization/calculator.characterization.test.ts', 'w') as f:
    f.write(calc)
