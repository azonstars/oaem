const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

code = code.replace(/\/\/ Folder, Users[\s\S]*?\} from "lucide-react";/, '');
fs.writeFileSync('src/components/SettingsView.tsx', code);
