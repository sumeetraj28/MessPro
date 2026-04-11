export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800'
  };

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg ${colors[type]} animate-slide-in flex items-center gap-2`}>
      <span className="text-sm font-medium">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
      )}
    </div>
  );
}
