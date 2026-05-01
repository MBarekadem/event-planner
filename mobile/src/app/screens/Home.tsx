import { Bell, Search, Calendar, Users, Camera, Music, Flower2, Cake, User, Plus } from "lucide-react";
import { CategoryCard } from "../components/CategoryCard";
import { FeatureCard } from "../components/FeatureCard";
import { BottomNav } from "../components/BottomNav";

export function Home() {

  const categories = [
    { icon: <Calendar size={24} />, title: "Planner" },
    { icon: <Cake size={24} />, title: "Caterers" },
    { icon: <Flower2 size={24} />, title: "Decor" },
    { icon: <Camera size={24} />, title: "Photography" },
    { icon: <Music size={24} />, title: "Music" },
    { icon: <Flower2 size={24} />, title: "Florist" },
  ];

  const featured = [
    {
      image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80",
      title: "Premium Wedding Package",
      subtitle: "Starting from $5,000"
    },
    {
      image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
      title: "Corporate Event Planning",
      subtitle: "Professional services"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24 max-w-[430px] mx-auto">
      <div className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] px-6 pt-12 pb-8 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-purple-200 text-sm mb-1">Welcome back,</p>
            <h1 className="text-white text-2xl font-bold">Sarah Johnson</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative">
              <Bell size={24} className="text-white" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                3
              </span>
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full flex items-center justify-center">
              <User size={24} className="text-purple-700" />
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-lg flex items-center gap-3">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search for services..."
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Categories</h2>
          <button className="text-purple-600 text-sm font-semibold">See All</button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {categories.map((category, index) => (
            <CategoryCard
              key={index}
              icon={category.icon}
              title={category.title}
            />
          ))}
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-3xl p-6 mb-8 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Users size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white/90 text-sm mb-1">Join thousands of users</p>
              <p className="text-white text-xl font-bold">1500+ services</p>
              <p className="text-white/90 text-sm">booked last month</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Featured Services</h2>
          <button className="text-purple-600 text-sm font-semibold">View All</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {featured.map((item, index) => (
            <FeatureCard
              key={index}
              image={item.image}
              title={item.title}
              subtitle={item.subtitle}
            />
          ))}
        </div>
      </div>

      <button className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-[#A855F7] to-[#7C3AED] rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50 active:scale-95 transition-all">
        <Plus size={28} className="text-white" />
      </button>

      <BottomNav />
    </div>
  );
}
