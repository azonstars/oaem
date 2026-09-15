#!/bin/bash
sed -i '205,210c\  const [editSupplyOrderContent, setEditSupplyOrderContent] = useState(\n    noteSheet.supplyOrderContent || "",\n  );\n  const [editSanctionLetterContent, setEditSanctionLetterContent] = useState(\n    noteSheet.sanctionLetterContent || "",\n  );' src/components/NoteSheetPreviewModal.tsx
