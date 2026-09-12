const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// Fix the extra `)}`
code = code.replace(/<\/button>\n\s*\)\}\n\s*\)\}/g, '</button>\n              )}');

fs.writeFileSync('src/components/SettingsView.tsx', code);
