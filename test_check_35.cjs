const fs = require('fs');
const appContent = fs.readFileSync('src/App.tsx', 'utf8');
console.log("Includes No disponible:", appContent.includes('No disponible'));
console.log("Includes Sandbox msg:", appContent.includes('Simulador de ahorro pendiente de activación. Estos controles no modifican la factura.'));
