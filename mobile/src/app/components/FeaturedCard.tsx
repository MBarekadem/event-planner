import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface FeaturedCardProps {
  image: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
}

export function FeaturedCard({ image, title, subtitle, onClick }: FeaturedCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex-shrink-0 w-72 rounded-3xl overflow-hidden shadow-lg bg-white cursor-pointer"
    >
      <div className="h-48 relative overflow-hidden">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </motion.div>
  );
}
