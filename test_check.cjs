const fs = require('fs');
const appContent = fs.readFileSync('src/App.tsx', 'utf8');
console.log("Includes Datos:", appContent.includes('Datos pendientes de corregir'));
