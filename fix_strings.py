import re

with open('src/App.tsx', 'r') as f:
    app = f.read()

app = app.replace('Próximamente', 'No disponible')

with open('src/App.tsx', 'w') as f:
    f.write(app)
