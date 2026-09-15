#!/bin/bash
sed -i 's/: editSupplyOrderContent ||/: activeDocTab === "sanctionletter" ? editSanctionLetterContent || currentNoteSheet.sanctionLetterContent || "" : editSupplyOrderContent ||/' src/components/NoteSheetPreviewModal.tsx
