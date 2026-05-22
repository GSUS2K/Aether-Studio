import { createPortal } from 'react-dom';

export function ToastPortal({ children }) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}
