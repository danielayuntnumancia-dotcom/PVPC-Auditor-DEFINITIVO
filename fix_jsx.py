import re

with open('src/App.tsx', 'r') as f:
    app = f.read()

# Let's see the context
start = app.find('{isValid && results ? (<>')
if start != -1:
    end = app.find(')}', start)
    print("Found block!")
