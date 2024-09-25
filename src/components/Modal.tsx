import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg bg-neutral-800 rounded-lg shadow-lg mx-5">
        <div className='flex justify-between items-center bg-neutral-700 px-6 py-4 rounded-lg'>
          <div className="text-white text-[1.2rem] font-bold">CONFIGURAÇÕES</div>
          <button
            onClick={onClose}
            className="top-2 right-3 text-neutral-300 hover:opacity-50 focus:outline-none"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};