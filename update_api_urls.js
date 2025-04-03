import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the HTML file
const filePath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all API URLs with absolute URLs
content = content.replace(/fetch\('\/api\//g, "fetch('http://' + window.location.host + '/api/");

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('API URLs updated successfully');