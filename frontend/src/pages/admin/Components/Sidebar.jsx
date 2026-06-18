import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import {
  LayoutDashboard,
  Tag,
  Package,
  ShoppingBag,
  Star,
  LogOut,
} from "lucide-react";
import logo from "../../../assets/logo.png";

const links = [
  { to: "/admin",            end: true, icon: LayoutDashboard, label: "Dashboard"  },
  { to: "/admin/categories",            icon: Tag,              label: "Categories" },
  { to: "/admin/products",              icon: Package,          label: "Products"   },
  { to: "/admin/orders",                icon: ShoppingBag,      label: "Orders"     },
  { to: "/admin/reviews",               icon: Star,             label: "Reviews"    },
];

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const navigate   = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside>

      {/* Logo */}
      <div>
        <img src={logo} alt="MP Cashews" />
        <p>Admin Panel</p>
      </div>

      {/* Nav */}
      <nav>
        {links.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/60"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div>
        <button
          onClick={handleLogout}
         
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}
