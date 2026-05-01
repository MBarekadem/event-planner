interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
}

export function CategoryCard({ icon, title, onClick }: CategoryCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center text-purple-600">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-800">{title}</span>
    </div>
  );
}
