import { useState } from "react";
import { Search, Star, MapPin, Phone, Mail, Filter } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/BottomNav";

export function Vendors() {
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = ["All", "Photography", "Catering", "Venues", "Decor", "Music"];

  const vendors = [
    {
      id: 1,
      name: "Elegant Moments Photography",
      category: "Photography",
      rating: 4.9,
      reviews: 127,
      location: "Downtown, New York",
      price: "$$$",
      image: "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=400&q=80",
      phone: "+1 555-0123",
      email: "info@elegantmoments.com",
      verified: true
    },
    {
      id: 2,
      name: "Delicious Catering Co.",
      category: "Catering",
      rating: 4.8,
      reviews: 203,
      location: "Midtown, New York",
      price: "$$",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80",
      phone: "+1 555-0456",
      email: "contact@deliciouscatering.com",
      verified: true
    },
    {
      id: 3,
      name: "Grand Ballroom Events",
      category: "Venues",
      rating: 4.7,
      reviews: 89,
      location: "Upper East Side, New York",
      price: "$$$$",
      image: "https://images.unsplash.com/photo-1519167758481-83f29da8fd18?w=400&q=80",
      phone: "+1 555-0789",
      email: "events@grandballroom.com",
      verified: true
    },
    {
      id: 4,
      name: "Bloom & Blossom Florists",
      category: "Decor",
      rating: 4.9,
      reviews: 156,
      location: "Brooklyn, New York",
      price: "$$",
      image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&q=80",
      phone: "+1 555-0321",
      email: "hello@bloomblossom.com",
      verified: false
    },
    {
      id: 5,
      name: "Harmony Live Band",
      category: "Music",
      rating: 4.6,
      reviews: 74,
      location: "Manhattan, New York",
      price: "$$$",
      image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&q=80",
      phone: "+1 555-0654",
      email: "booking@harmonylive.com",
      verified: true
    },
    {
      id: 6,
      name: "Perfect Shot Studios",
      category: "Photography",
      rating: 4.8,
      reviews: 142,
      location: "Chelsea, New York",
      price: "$$$$",
      image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&q=80",
      phone: "+1 555-0987",
      email: "info@perfectshot.com",
      verified: true
    }
  ];

  const filteredVendors = activeCategory === "all"
    ? vendors
    : vendors.filter(v => v.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24 max-w-[430px] mx-auto">
      <div className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] px-6 pt-12 pb-8 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold mb-1">Vendors</h1>
            <p className="text-purple-200">Find the perfect service provider</p>
          </div>
          <button className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
            <Filter size={20} className="text-white" />
          </button>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-lg flex items-center gap-3">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category.toLowerCase())}
              className={`px-5 py-2.5 rounded-2xl font-medium whitespace-nowrap transition-all ${
                activeCategory === category.toLowerCase()
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {filteredVendors.length} Vendors Found
          </h2>
        </div>

        <div className="space-y-4">
          {filteredVendors.map(vendor => (
            <div
              key={vendor.id}
              className="bg-white rounded-3xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex gap-4 p-4">
                <div className="relative flex-shrink-0">
                  <ImageWithFallback
                    src={vendor.image}
                    alt={vendor.name}
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                  {vendor.verified && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{vendor.name}</h3>
                    <span className="text-sm font-semibold text-purple-600 ml-2">{vendor.price}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-gray-900">{vendor.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">({vendor.reviews} reviews)</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={14} />
                    <span className="truncate">{vendor.location}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <a href={`tel:${vendor.phone}`} className="p-2 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
                      <Phone size={16} className="text-purple-600" />
                    </a>
                    <a href={`mailto:${vendor.email}`} className="p-2 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
                      <Mail size={16} className="text-purple-600" />
                    </a>
                    <button className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold rounded-xl hover:shadow-md transition-all">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
