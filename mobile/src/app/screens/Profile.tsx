import { useState } from "react";
import { User, Mail, Phone, MapPin, Calendar, Settings, Heart, CreditCard, Bell, HelpCircle, LogOut, ChevronRight, Edit2 } from "lucide-react";
import { Button } from "../components/Button";
import { BottomNav } from "../components/BottomNav";

export function Profile() {
  const [notifications, setNotifications] = useState(true);

  const user = {
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 555-0123",
    location: "New York, USA",
    memberSince: "January 2024",
    eventsBooked: 12,
    favoriteVendors: 8,
    avatar: ""
  };

  const stats = [
    { label: "Events Booked", value: user.eventsBooked, icon: Calendar },
    { label: "Favorites", value: user.favoriteVendors, icon: Heart },
    { label: "Reviews", value: 5, icon: User }
  ];

  const menuItems = [
    {
      icon: Edit2,
      label: "Edit Profile",
      onClick: () => {},
      color: "purple"
    },
    {
      icon: CreditCard,
      label: "Payment Methods",
      onClick: () => {},
      color: "blue"
    },
    {
      icon: Bell,
      label: "Notifications",
      onClick: () => setNotifications(!notifications),
      color: "green",
      toggle: true,
      value: notifications
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: () => {},
      color: "gray"
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      onClick: () => {},
      color: "orange"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24 max-w-[430px] mx-auto">
      <div className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] px-6 pt-12 pb-20 rounded-b-[32px]">
        <div className="flex justify-end mb-4">
          <button className="p-2 bg-white/20 backdrop-blur-md rounded-2xl">
            <Settings size={20} className="text-white" />
          </button>
        </div>
      </div>

      <div className="px-6 -mt-12">
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex flex-col items-center -mt-16 mb-4">
            <div className="w-28 h-28 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full flex items-center justify-center border-4 border-white shadow-lg mb-4">
              <User size={48} className="text-purple-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h1>
            <p className="text-gray-500 text-sm mb-1">{user.email}</p>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Calendar size={14} />
              <span>Member since {user.memberSince}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-purple-50 rounded-2xl flex items-center justify-center">
                  <stat.icon size={20} className="text-purple-600" />
                </div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-md p-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 px-2">Account Information</h2>
          <div className="space-y-1">
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Mail size={18} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Phone size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">{user.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <MapPin size={18} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900">{user.location}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-md p-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 px-2">Preferences</h2>
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 bg-${item.color}-50 rounded-xl flex items-center justify-center`}>
                  <item.icon size={18} className={`text-${item.color}-600`} />
                </div>
                <span className="flex-1 text-left font-medium text-gray-900">{item.label}</span>
                {item.toggle ? (
                  <div className={`w-12 h-7 rounded-full transition-colors ${item.value ? 'bg-purple-600' : 'bg-gray-300'} relative`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${item.value ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                ) : (
                  <ChevronRight size={20} className="text-gray-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
        >
          <LogOut size={20} />
          Log Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
