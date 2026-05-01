import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export function Input({ label, icon, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full px-4 ${icon ? "pl-12" : ""} py-3.5 rounded-2xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}
