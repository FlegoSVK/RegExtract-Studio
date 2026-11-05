import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed border whitespace-nowrap shrink-0";
  
  const variants = {
    primary: "bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 border-cyan-400 text-slate-950 font-semibold shadow-sm hover:shadow-cyan-500/25",
    secondary: "bg-[#0d1629] hover:bg-[#13203c] active:bg-[#18284b] border-slate-700 text-slate-200 hover:text-white hover:border-slate-600",
    danger: "bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 border-rose-500/40 text-rose-300 hover:text-rose-100",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="mr-1.5 shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
