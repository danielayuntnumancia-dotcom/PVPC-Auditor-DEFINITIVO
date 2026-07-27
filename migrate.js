import fs from 'fs';
import path from 'path';

const serverTs = fs.readFileSync('server.ts', 'utf-8');

// We need to extract the imports and the API part, skipping Vite
const endMarker = '// --- Server & Vite Middleware Configuration ---';
const endIndex = serverTs.indexOf(endMarker);

if (endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

// Extract everything until Vite setup
let apiLogic = serverTs.substring(0, endIndex);

// Replace Vite import which is not needed
apiLogic = apiLogic.replace(/import { createServer as createViteServer } from "vite";\r?\n/, '');

// Add Firebase imports at the top
const firebaseImports = `import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import cors from "cors";

// Initialize Firebase Admin
initializeApp();
`;

// Replace 'const app = express();' with cors configuration
apiLogic = apiLogic.replace(/const app = express\(\);/, 'const app = express();\napp.use(cors({ origin: true }));');

const indexTsContent = firebaseImports + apiLogic + '\n// Export the Express app as a Firebase Function\nexport const api = functions.https.onRequest(app);\n';

fs.writeFileSync(path.join('functions', 'index.ts'), indexTsContent);
console.log("Successfully generated functions/index.ts");
