import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import { LayoutDashboard, Tag, Package, ShoppingBag, Star, LogOut } from "lucide-react";
import logo from "../../../assets/logo.png"; // Adjust path if needed

const links = [
  { to: "/admin",            end: true, icon: LayoutDashboard, label: "Dashboard"  },
  { to: "/admin/categories", end: false, icon: Tag,              label: "Categories" },
  { to: "/admin/products",   end: false, icon: Package,          label: "Products"   },
  { to: "/admin/orders",     end: false, icon: ShoppingBag,      label: "Orders"     },
  { to: "/admin/reviews",    end: false, icon: Star,             label: "Reviews"    },
];

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const navigate   = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-brand-black border-r border-gray-800 text-white fixed inset-y-0 left-0 z-50">
      
      {/* Logo & Header */}
      <div className="flex flex-col items-center py-8 border-b border-gray-800 px-6">
        <div className="bg-white p-2 rounded-xl mb-3 shadow-sm w-16 h-16 flex items-center justify-center">
          <img src={logo} alt="MP Cashews" className="max-w-full max-h-full object-contain" />
        </div>
        <h2 className="font-extrabold text-lg tracking-wide text-white">MP CASHEWS</h2>
        <p className="text-xs text-brand-orange uppercase tracking-widest font-bold mt-1">Admin Panel</p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto hide-scrollbar">
        {links.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                isActive
                  ? "bg-brand-orange text-white shadow-md shadow-brand-orange/20"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            <Icon size={18} strokeWidth={2.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={18} strokeWidth={2.5} /> Logout
        </button>
      </div>
    </aside>
  );
}