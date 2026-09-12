const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const importsToAdd = `import { Plus, Check, X, KeyRound, UserPlus, Mail, Briefcase, ShieldCheck } from "lucide-react";`;
code = code.replace(/import \{ Plus, Check, X, KeyRound \} from "lucide-react";/, importsToAdd);

// Add state for Proposal Modal
const stateToAdd = `
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalName, setProposalName] = useState("");
  const [proposalUserId, setProposalUserId] = useState("");
  const [proposalEmail, setProposalEmail] = useState("");
  const [proposalDesignation, setProposalDesignation] = useState("");
  const [proposalLoading, setProposalLoading] = useState(false);
  
  const submitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalName.trim() || !proposalUserId.trim()) {
      alert(language === "bn" ? "নাম এবং ইউজার আইডি আবশ্যক।" : "Name and User ID are required.");
      return;
    }
    setProposalLoading(true);
    try {
      const res = await apiFetch("/api/users/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: proposalName,
          userId: proposalUserId,
          email: proposalEmail,
          designation: proposalDesignation
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(language === "bn" ? "আপনার সহকর্মীর আইডি প্রস্তাব সফলভাবে পাঠানো হয়েছে। এডমিন অনুমোদন দিলে লগইন করা যাবে।" : "Colleague user ID proposal submitted. Waiting for admin approval.");
        setShowProposalModal(false);
        setProposalName(""); setProposalUserId(""); setProposalEmail(""); setProposalDesignation("");
        refreshData();
      } else {
        alert(data.error || "Error");
      }
    } catch {
      alert("Network error");
    } finally {
      setProposalLoading(false);
    }
  };
`;
code = code.replace(/const \[showUserModal, setShowUserModal\] = useState\(false\);/, 'const [showUserModal, setShowUserModal] = useState(false);' + stateToAdd);

// Replace "Add User" button logic in the users tab
const addUserButton = `
              <h2 className="font-bold flex items-center gap-2">
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

code = code.replace(/<h2 className="font-bold flex items-center gap-2">[\s\S]*?<\/button>/, addUserButton);

// Hide admin actions for regular users
code = code.replace(/<td className="p-3 text-right flex items-center justify-end gap-1.5">[\s\S]*?<\/td>/g, (match) => {
  return `
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => handleAdminResetPassword(u.id)}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition flex items-center gap-1"
                                  title="Reset Password"
                                >
                                  <KeyRound className="w-3 h-3" /> Reset
                                </button>
                                <button 
                                  onClick={() => handleToggleUserStatus(u)}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                                  title="Toggle Active/Inactive"
                                >
                                  {u.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
  `;
});

// Add Modal render at the end
const modalRender = `
      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-sm">{language === "bn" ? "সহকর্মীর ইউজার আইডির প্রস্তাবনা" : "Propose Colleague User ID"}</h3>
              </div>
              <button 
                onClick={() => setShowProposalModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={submitProposal} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">{language === "bn" ? "সহকর্মীর পূর্ণ নাম *" : "Colleague's Full Name *"}</label>
                <div className="relative">
                  <input type="text" required value={proposalName} onChange={e => setProposalName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none" placeholder="e.g. Md. Rahim" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">{language === "bn" ? "প্রস্তাবিত ইউজার আইডি *" : "Requested User ID *"}</label>
                <div className="relative">
                  <input type="text" required value={proposalUserId} onChange={e => setProposalUserId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono" placeholder="e.g. rahim_ctg" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">{language === "bn" ? "ইমেইল এড্রেস" : "Email Address"}</label>
                <div className="relative">
                  <input type="email" value={proposalEmail} onChange={e => setProposalEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono" placeholder="rahim@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">{language === "bn" ? "পদবী" : "Designation"}</label>
                <div className="relative">
                  <input type="text" value={proposalDesignation} onChange={e => setProposalDesignation(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none" placeholder="Manager" />
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-800">
                <button type="submit" disabled={proposalLoading} className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50">
                  {proposalLoading ? "Submitting..." : (language === "bn" ? "প্রস্তাব পাঠান" : "Submit Request")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

code = code.replace(/\{showUserModal && \([\s\S]*?<\/div>\n      \)\}/, (match) => match + '\n' + modalRender);

fs.writeFileSync('src/components/SettingsView.tsx', code);
