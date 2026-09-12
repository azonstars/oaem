const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// 1. Fix imports
code = code.replace(/import \{\s*Settings,\s*Calendar,/, 'import { Settings, Calendar, Folder, Users, Plus, Check, X, Building2, Save, Upload, Image as ImageIcon, Trash2, RefreshCw, KeyRound, Lock, AlertTriangle, Edit2, UserPlus, Mail, Briefcase, ShieldCheck } from "lucide-react";\n//');

// 2. Add the UserPlus button to Users tab
// We need to find the exact place for Users header.
const usersHeaderMatch = /<Users className=\{\`w-5 h-5 \$\{isOcean \? "text-sky-400" : "text-emerald-500"\}\`\}\/>\s*\{language === "bn" \? "ব্যবহারকারী তালিকা" : "System Users"\}\s*<\/h2>\s*<button\s*onClick=\{([^}]+)\}\s*className=\{\`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition \$\{\s*isOcean \? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"\s*\}\`\}\s*>\s*<Plus className="w-4 h-4"\/> \{language === "bn" \? "নতুন ব্যবহারকারী" : "Add User"\}\s*<\/button>/m;

const replacement = `
              <Users className={\`w-5 h-5 \${isOcean ? "text-sky-400" : "text-emerald-500"}\`}/> 
              {language === "bn" ? "ব্যবহারকারী তালিকা" : "System Users"}
            </h2>
            {isAdmin ? (
              <button 
                onClick={() => setShowUserModal(true)} 
                className={\`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition \${
                  isOcean ? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"
                }\`}
              >
                <Plus className="w-4 h-4"/> {language === "bn" ? "নতুন ব্যবহারকারী" : "Add User"}
              </button>
            ) : (
              <button 
                onClick={() => setShowProposalModal(true)} 
                className={\`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition \${
                  isOcean ? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"
                }\`}
              >
                <UserPlus className="w-4 h-4"/> {language === "bn" ? "সহকর্মীর আইডি প্রস্তাব দিন" : "Propose Colleague"}
              </button>
            )}
`;

if (usersHeaderMatch.test(code)) {
  code = code.replace(usersHeaderMatch, replacement);
} else {
  console.log("Could not find Users header button!");
}

// 3. Fix setShowFyModal
code = code.replace(/setShowFyModal\(true\)/g, "setEditingFy(null); setShowFyModal(true)");

fs.writeFileSync('src/components/SettingsView.tsx', code);
