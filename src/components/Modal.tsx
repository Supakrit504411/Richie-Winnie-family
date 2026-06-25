'use client';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="text-2xl">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
