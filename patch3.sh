#!/bin/bash
sed -i 's/let soContent = currentNoteSheet.supplyOrderContent || "";/let soContent = currentNoteSheet.supplyOrderContent || "";\n      let slContent = currentNoteSheet.sanctionLetterContent || "";/' src/components/NoteSheetPreviewModal.tsx
sed -i 's/else if (activeDocTab === "supplyorder") {/else if (activeDocTab === "sanctionletter") {\n        slContent = contentToSave;\n        setEditSanctionLetterContent(contentToSave);\n      } else if (activeDocTab === "supplyorder") {/' src/components/NoteSheetPreviewModal.tsx
sed -i 's/supplyOrderContent: soContent,/supplyOrderContent: soContent,\n        sanctionLetterContent: slContent,/' src/components/NoteSheetPreviewModal.tsx
sed -i 's/setEditSupplyOrderContent(data.supplyOrderContent || soContent);/setEditSupplyOrderContent(data.supplyOrderContent || soContent);\n      setEditSanctionLetterContent(data.sanctionLetterContent || slContent);/' src/components/NoteSheetPreviewModal.tsx
