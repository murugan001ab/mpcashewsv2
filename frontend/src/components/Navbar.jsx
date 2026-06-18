

import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  X,
  User,
  ShoppingCart,
  LogOut,
  Package,
  MapPin,
  Menu,
} from "lucide-react";

import { AuthContext } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

export default function Navbar({ cartCount = 0 }) {
  const { isLogged, logout } = useContext(AuthContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target)
      ) {
        setProfileOpen(false);
      }

      if (
        searchRef.current &&
        !searchRef.current.contains(e.target)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchVal.trim()) {
      navigate(`/?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal("");
    }
  };

  const navLink = (path) =>
    `transition font-medium ${
      location.pathname === path
        ? "text-amber-600"
        : "text-gray-700 hover:text-amber-600"
    }`;

  return (
    <>
      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-14 lg:h-16 
        flex items-center justify-between
        px-3 sm:px-4 md:px-6 lg:px-10 xl:px-16
        transition-all duration-300 backdrop-blur-xl
        ${
          scrolled
            ? "bg-[#FBF6EE]/95 shadow-lg border-b border-amber-100"
            : "bg-[#FBF6EE]/80"
        }`}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-amber-50"
          >
            <Menu size={22} />
          </button>

          <Link to="/" className="shrink-0">
            <img
              src={logo}
              alt="MPCashews"
              className="h-8 sm:h-10 md:h-11 lg:h-12 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-8 xl:gap-12">
          <Link to="/" className={navLink("/")}>
            Home
          </Link>

          <Link
            to="/becomepatner"
            className={navLink("/becomepatner")}
          >
            Become a Partner
          </Link>

          <Link
            to="/blogs"
            className={navLink("/blogs")}
          >
            Blogs
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search */}
          <div ref={searchRef} className="relative">
            {!searchOpen && (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-amber-50 hover:text-amber-600 transition"
              >
                <Search size={18} />
              </button>
            )}

            <div
              className={`absolute right-0 top-full mt-2
              w-[90vw] sm:w-[340px] md:w-[400px]
              bg-white border rounded-full shadow-xl
              px-4 py-2 flex items-center gap-2
              transition-all duration-300
              ${
                searchOpen
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <Search
                size={16}
                className="text-gray-400"
              />

              <input
                type="text"
                placeholder="Search cashews..."
                value={searchVal}
                onChange={(e) =>
                  setSearchVal(e.target.value)
                }
                onKeyDown={handleSearch}
                autoFocus={searchOpen}
                className="flex-1 outline-none text-sm"
              />

              <button
                onClick={() => setSearchOpen(false)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* User */}
          {!isLogged ? (
            <Link to="/login">
              <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-amber-50 transition">
                <User size={18} />
              </button>
            </Link>
          ) : (
            <div
              ref={profileRef}
              className="relative"
            >
              <button
                onClick={() =>
                  setProfileOpen(!profileOpen)
                }
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-amber-50 transition"
              >
                <User size={18} />
              </button>

              {profileOpen && (
                <div
                  className="
                  absolute right-0 mt-2
                  w-56 bg-white
                  rounded-2xl border
                  shadow-xl overflow-hidden
                "
                >
                  <Link to="/account">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <Package size={16} />
                      My Orders
                    </div>
                  </Link>

                  <Link to="/account">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <MapPin size={16} />
                      Addresses
                    </div>
                  </Link>

                  <div className="border-t" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <Link to="/cart">
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-amber-50 transition">
              <ShoppingCart size={18} />

              {cartCount > 0 && (
                <span
                  className="
                  absolute -top-1 -right-1
                  min-w-[18px] h-[18px]
                  px-1 rounded-full
                  bg-red-500 text-white
                  text-[10px] font-semibold
                  flex items-center justify-center
                "
                >
                  {cartCount}
                </span>
              )}
            </button>
          </Link>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-16 left-0
        h-[calc(100vh-64px)]
        w-[85%] max-w-[320px]
        bg-white shadow-2xl
        z-50 lg:hidden
        transition-transform duration-300
        ${
          menuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col p-6">
          <Link
            to="/"
            className="py-4 border-b"
          >
            Home
          </Link>

          <Link
            to="/becomepatner"
            className="py-4 border-b"
          >
            Become a Partner
          </Link>

          <Link
            to="/blogs"
            className="py-4 border-b"
          >
            Blogs
          </Link>

          {isLogged ? (
            <>
              <Link
                to="/account"
                className="py-4 border-b"
              >
                My Account
              </Link>

              <button
                onClick={handleLogout}
                className="text-left py-4 text-red-500"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="py-4"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

