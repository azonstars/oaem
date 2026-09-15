#!/bin/bash
sed -i '/const \[isSanctioning, setIsSanctioning\] = useState(false);/a \ \ const [isSubmitting, setIsSubmitting] = useState(false);' src/components/PostFactoProposalsView.tsx

sed -i '/const handleCreateSubmit = async (e: React.FormEvent) => {/,/};/c\
  const handleCreateSubmit = async (e: React.FormEvent) => {\
    e.preventDefault();\
    try {\
      setIsSubmitting(true);\
      const url = formData.id ? `/api/postfactoproposals/${formData.id}` : "/api/postfactoproposals";\
      const method = formData.id ? "PUT" : "POST";\
      const res = await apiFetch(url, {\
        method,\
        headers: { "Content-Type": "application/json" },\
        body: JSON.stringify({...formData, officeId: currentUser.officeId, financialYearId: selectedFY, createdBy: currentUser.userId}),\
      });\
      const data = await res.json();\
      if (data.error) throw new Error(data.error);\
      setShowModal(false);\
      fetchProposals();\
    } catch (err: any) {\
      alert(err.message);\
    } finally {\
      setIsSubmitting(false);\
    }\
  };' src/components/PostFactoProposalsView.tsx
