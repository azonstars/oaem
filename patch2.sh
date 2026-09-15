#!/bin/bash
sed -i '/const \[editSupplyOrderContent, setEditSupplyOrderContent\] = useState(/a \ \ const [editSanctionLetterContent, setEditSanctionLetterContent] = useState(\n    noteSheet.sanctionLetterContent || "",\n  );' src/components/NoteSheetPreviewModal.tsx
sed -i 's/setEditSupplyOrderContent(noteSheet.supplyOrderContent || "");/setEditSupplyOrderContent(noteSheet.supplyOrderContent || "");\n    setEditSanctionLetterContent(noteSheet.sanctionLetterContent || "");/' src/components/NoteSheetPreviewModal.tsx
sed -i 's/setEditSupplyOrderContent(data.noteSheet.supplyOrderContent || "");/setEditSupplyOrderContent(data.noteSheet.supplyOrderContent || "");\n        setEditSanctionLetterContent(data.noteSheet.sanctionLetterContent || "");/' src/components/NoteSheetPreviewModal.tsx
