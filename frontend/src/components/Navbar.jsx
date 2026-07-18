import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  X,
  User,
  ShoppingCart,
  Heart,
  LogOut,
  Package,
  MapPin,
  Menu,
  LayoutDashboard,
  Store
} from "lucide-react";

import { AuthContext } from "../contexts/AuthContext";
import * as cartService from "../services/cartService";
import * as wishlistService from "../services/wishlistService";
import logo from "../assets/logo.png";

export default function Navbar() {
  const { isLogged, logout, user } = useContext(AuthContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const profileRef = useRef(null);
  const searchRef = useRef(null);

  // Check if current page is login (or register if you add one later)
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Handle scroll for sticky navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load cart + wishlist counts (and refresh whenever the route changes,
  // so badges stay in sync after add/remove actions on other pages)
  useEffect(() => {
    if (!isLogged) {
      setCartCount(0);
      setWishlistCount(0);
      return;
    }
    let cancelled = false;

    cartService.getCart().then((res) => {
      if (cancelled) return;
      const items = res?.items || [];
      setCartCount(items.reduce((sum, i) => sum + (i.quantity || 0), 0));
    }).catch(() => {});

    wishlistService.getWishlist().then((res) => {
      if (cancelled) return;
      setWishlistCount(res?.total ?? res?.items?.length ?? 0);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [isLogged, location.pathname]);

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
    `transition-all duration-200 font-bold text-[15px] ${
      location.pathname === path
        ? "text-brand-orange"
        : "text-brand-black hover:text-brand-orange"
    }`;

  const isAdmin = user?.role === "admin" || user?.is_staff;

  return (
    <>
      {/* ── Mobile Overlay ──────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-brand-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 lg:h-20 
        flex items-center justify-between
        px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16
        transition-all duration-300
        ${
          scrolled
            ? "bg-[#FBF6EE]/90 backdrop-blur-xl shadow-sm border-b border-brand-brown/10"
            : "bg-[#FBF6EE]"
        }`}
      >
        {/* Left: Mobile Menu & Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 -ml-2 rounded-xl text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange transition-colors"
          >
            {menuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
          </button>

          <Link to="/" className="shrink-0 group">
            <img
              src={logo}
              alt="MPCashews"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10">
          <Link to="/" className={navLink("/")}>
            Home
          </Link>
          <Link to="/becomepartner" className={navLink("/becomepartner")}>
            Become a Partner
          </Link>
          <Link to="/blogs" className={navLink("/blogs")}>
            Blogs
          </Link>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Search (Hidden on Login Page) */}
          {!isAuthPage && (
            <div ref={searchRef} className="relative flex items-center">
              {!searchOpen && (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange transition-colors"
                >
                  <Search size={20} strokeWidth={2.5} />
                </button>
              )}

              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2
                w-[70vw] sm:w-[300px] md:w-[350px]
                bg-white border border-brand-brown/10 rounded-full shadow-lg
                px-4 py-2 flex items-center gap-3
                transition-all duration-300 origin-right
                ${
                  searchOpen
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-90 pointer-events-none"
                }`}
              >
                <Search size={18} className="text-brand-brown/40" strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="Search premium cashews..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onKeyDown={handleSearch}
                  autoFocus={searchOpen}
                  className="flex-1 bg-transparent outline-none text-sm font-medium text-brand-black placeholder:text-brand-brown/40"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="text-brand-brown/40 hover:text-brand-orange transition-colors p-1"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}

          {/* User Profile / Auth */}
          {!isLogged ? (
            /* Hide Sign In button on Auth pages */
            !isAuthPage && (
              <Link to="/login">
                <button className="hidden sm:flex items-center gap-2 bg-brand-black text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-brand-brown transition-all shadow-md">
                  <User size={16} strokeWidth={2.5} /> Sign In
                </button>
                <button className="sm:hidden w-10 h-10 rounded-full flex items-center justify-center text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange transition-colors">
                  <User size={20} strokeWidth={2.5} />
                </button>
              </Link>
            )
          ) : (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  profileOpen ? "bg-brand-orange text-white shadow-md" : "text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange"
                }`}
              >
                <User size={20} strokeWidth={2.5} />
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl border border-brand-brown/10 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-2">
                  
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setProfileOpen(false)}>
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-sm font-bold text-brand-black transition-colors group">
                        <LayoutDashboard size={18} className="text-brand-orange group-hover:scale-110 transition-transform" />
                        Admin Dashboard
                      </div>
                    </Link>
                  )}

                  <Link to="/account" onClick={() => setProfileOpen(false)}>
                    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-sm font-bold text-brand-black transition-colors group">
                      <Package size={18} className="text-brand-brown/50 group-hover:text-brand-orange transition-colors" />
                      My Orders
                    </div>
                  </Link>

                  <Link to="/account" onClick={() => setProfileOpen(false)}>
                    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-sm font-bold text-brand-black transition-colors group">
                      <MapPin size={18} className="text-brand-brown/50 group-hover:text-brand-orange transition-colors" />
                      Saved Addresses
                    </div>
                  </Link>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={() => { handleLogout(); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Wishlist */}
          {isLogged && (
            <Link to="/wishlist">
              <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange transition-colors">
                <Heart size={20} strokeWidth={2.5} />

                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-brand-orange border-2 border-[#FBF6EE] text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                    {wishlistCount}
                  </span>
                )}
              </button>
            </Link>
          )}

          {/* Cart */}
          <Link to="/cart">
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange transition-colors">
              <ShoppingCart size={20} strokeWidth={2.5} />

              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-brand-orange border-2 border-[#FBF6EE] text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Mobile Drawer ───────────────────────────────────────────────── */}
      <aside
        className={`fixed top-16 lg:top-20 left-0 h-[calc(100vh-64px)] w-[85%] max-w-[320px] bg-white shadow-2xl z-40 lg:hidden transition-transform duration-300 border-r border-brand-brown/5 flex flex-col ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col p-6 gap-2 flex-1 overflow-y-auto">
          <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange">
            <Store size={20} className="text-brand-orange" /> Home
          </Link>

          <Link to="/becomepartner" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange">
            <Package size={20} className="text-brand-orange" /> Become a Partner
          </Link>

          <Link to="/blogs" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange">
            <LayoutDashboard size={20} className="text-brand-orange" /> Blogs
          </Link>

          {isLogged && isAdmin && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange">
              <LayoutDashboard size={20} className="text-brand-orange" /> Admin Dashboard
            </Link>
          )}

          {isLogged ? (
            <>
              <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange">
                <Heart size={20} className="text-brand-orange" /> Wishlist
                {wishlistCount > 0 && (
                  <span className="ml-auto text-xs font-extrabold bg-brand-orange text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link to="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange">
                <User size={20} className="text-brand-orange" /> My Account
              </Link>

              <button onClick={handleLogout} className="flex items-center gap-4 py-4 font-bold text-red-500 w-full text-left active:bg-red-50 rounded-xl px-2 -mx-2 mt-auto">
                <LogOut size={20} /> Logout
              </button>
            </>
          ) : (
            /* Hide Sign In button inside mobile menu on Auth pages too */
            !isAuthPage && (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-6 flex items-center justify-center gap-2 w-full bg-brand-black text-white py-3.5 rounded-xl font-bold shadow-md active:scale-95 transition-transform">
                <User size={18} strokeWidth={2.5} /> Sign In
              </Link>
            )
          )}
        </div>
      </aside>
    </>
  );
}