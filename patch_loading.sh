#!/bin/bash
sed -i '/const \[selectedProposal, setSelectedProposal\] = useState<PostFactoProposal | null>(null);/a \ \ const [isSanctioning, setIsSanctioning] = useState(false);' src/components/PostFactoProposalsView.tsx

sed -i '/const handleSanctionSubmit = async (e: React.FormEvent) => {/,/};/c\
  const handleSanctionSubmit = async (e: React.FormEvent) => {\
    e.preventDefault();\
    if (!selectedProposal) return;\
    try {\
      setIsSanctioning(true);\
      const res = await apiFetch(`/api/postfactoproposals/${selectedProposal.id}/sanction`, {\
        method: "POST",\
        headers: { "Content-Type": "application/json" },\
        body: JSON.stringify(sanctionData),\
      });\
      \
      const data = await res.json();\
      if (data.error) throw new Error(data.error);\
      \
      setShowSanctionModal(false);\
      fetchProposals();\
    } catch (err: any) {\
      alert(err.message);\
    } finally {\
      setIsSanctioning(false);\
    }\
  };' src/components/PostFactoProposalsView.tsx

sed -i '/<button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold">/,/<\/button>/c\
                <button type="submit" disabled={isSanctioning} className={`px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center ${isSanctioning ? "opacity-70 cursor-not-allowed" : ""}`}>\
                  {isSanctioning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> : null}\
                  {language === "bn" ? (isSanctioning ? "অপেক্ষা করুন..." : "মঞ্জুর করুন") : (isSanctioning ? "Sanctioning..." : "Sanction")}\
                </button>' src/components/PostFactoProposalsView.tsx
