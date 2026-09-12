const fs = require('fs');
let lines = fs.readFileSync('src/components/SettingsView.tsx', 'utf8').split('\n');

const correctHeader = `
                <h2 className="font-bold flex items-center gap-2">
                  <Calendar className={\`w-5 h-5 \${isOcean ? "text-sky-400" : "text-emerald-500"}\`}/>
                  {language === "bn" ? "অর্থবছর পরিচালনা" : "Financial Years"}
                </h2>
                <p className="text-xs opacity-70 mt-1">
                  {language === "bn" ? "নতুন অর্থবছর যোগ করুন এবং পূর্ববর্তী বছর ক্লোজ করুন" : "Manage and close financial years"}
                </p>
              </div>
              <button 
                onClick={() => setShowFyModal(true)}
                className={\`text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition \${
                  isOcean ? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"
                }\`}
              >
                <Plus className="w-4 h-4"/> {language === "bn" ? "নতুন অর্থবছর" : "Add FY"}
              </button>
`;

// we need to replace from line 834 to 855 with correctHeader
// Array index is line - 1
lines.splice(833, 23, correctHeader.trim());

fs.writeFileSync('src/components/SettingsView.tsx', lines.join('\n'));
