export default function InAppConfirmModal({
  isOpen,
  title = 'নিশ্চিত করুন',
  message,
  confirmLabel = 'হ্যাঁ, নিশ্চিত',
  cancelLabel = 'বাতিল',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 p-6 space-y-4">
        <div className="space-y-1.5">
          <h3 className={`text-base font-bold ${danger ? 'text-red-600' : 'text-gray-900'}`}>
            {title}
          </h3>
          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition cursor-pointer ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
