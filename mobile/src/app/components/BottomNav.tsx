import { useNavigate, useLocation } from "react-router";
import { Home, LayoutDashboard, Store, User } from "lucide-react";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: "home", label: "Home", icon: Home, path: "/home" },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "vendors", label: "Vendors", icon: Store, path: "/vendors" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 max-w-[430px] mx-auto">
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? "text-purple-600" : "text-gray-400"
              }`}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
