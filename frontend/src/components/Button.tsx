import type { ReactNode } from 'react';
import './css/Button.css';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
}

function Button({ children, onClick, type = 'button', disabled = false, className = '' }: ButtonProps) {
  return (
    <button 
      className={`custom-button ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
