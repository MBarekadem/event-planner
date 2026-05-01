import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  children: React.ReactNode;
}

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  const baseStyles = "px-6 py-3.5 rounded-2xl font-medium transition-all duration-200 active:scale-95";

  const variants = {
    primary: "bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40",
    secondary: "bg-white text-gray-800 border border-gray-200 hover:border-purple-300",
    outline: "border-2 border-purple-500 text-purple-600 hover:bg-purple-50"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
