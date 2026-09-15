#!/bin/bash
sed -i 's/: activeDocTab === "supplyorder"/: activeDocTab === "sanctionletter"\n          ? isEditing\n            ? editSanctionLetterContent\n            : currentNoteSheet.sanctionLetterContent || editSanctionLetterContent || ""\n          : activeDocTab === "supplyorder"/' src/components/NoteSheetPreviewModal.tsx
