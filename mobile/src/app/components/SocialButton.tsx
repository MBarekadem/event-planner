import { motion } from "motion/react";

interface SocialButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
}

export function SocialButton({ icon, label, onClick }: SocialButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full py-4 px-6 rounded-2xl border border-gray-200 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-gray-700">{label}</span>
    </motion.button>
  );
}
