import { ImageWithFallback } from "./figma/ImageWithFallback";

interface FeatureCardProps {
  image: string;
  title: string;
  subtitle?: string;
}

export function FeatureCard({ image, title, subtitle }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
      <ImageWithFallback
        src={image}
        alt={title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
