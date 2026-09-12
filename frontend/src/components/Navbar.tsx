"use client";
// src/components/Navbar.tsx
// Ported from the old frontend/src/components/Navbar.jsx.
// Swaps: react-router-dom -> next/navigation, <img src={import}> -> /public path,
// AuthContext consumed via useAuth() hook.
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  Store,
  Info,
  Handshake,
  Newspaper,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import * as wishlistService from "@/services/wishlistService";

export default function Navbar() {
  const { isLogged, logout, user } = useAuth();
  const { cartCount } = useCart();

  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Sticky navbar shadow on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(e.target as Node))
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Wishlist badge count, refreshed on auth/route change. Cart count now
  // comes straight from CartContext (see import above) instead of a
  // separate fetch here — that fetch used to be gated on `isLogged`, so
  // guests always saw a 0 badge no matter what was in their local cart.
  useEffect(() => {
    if (!isLogged || isAdmin) {
      setWishlistCount(0);
      return;
    }
    let cancelled = false;

    wishlistService
      .getWishlist()
      .then((res) => {
        if (cancelled) return;
        setWishlistCount(res?.total ?? res?.items?.length ?? 0);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLogged, pathname]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchVal.trim()) {
      router.push(`/?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal("");
    }
  };

  const navLink = (path: string) =>
    `transition-all duration-200 font-bold text-[15px] ${
      pathname === path ? "text-brand-orange" : "text-brand-black hover:text-brand-orange"
    }`;

  const isAdmin = user?.role === "admin";

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
        {/* Mobile Search Overlay — full-width, pinned to the navbar itself
            instead of the small search-icon wrapper, so it can never overflow
            off-screen on narrow phones. */}
        {searchOpen && !isAuthPage && (
          <div ref={mobileSearchRef} className="sm:hidden absolute inset-0 z-30 bg-[#FBF6EE] flex items-center gap-2 px-4">
            <div className="flex-1 flex items-center gap-2 bg-white border border-brand-brown/10 rounded-full shadow-sm px-4 h-11">
              <Search size={18} className="text-brand-brown/40 shrink-0" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search premium cashews..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={handleSearch}
                autoFocus
                className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium text-brand-black placeholder:text-brand-brown/40"
              />
            </div>
            <button
              onClick={() => setSearchOpen(false)}
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange transition-colors"
              aria-label="Close search"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Left: Mobile Menu & Logo */}
        <div className={`items-center gap-4 ${searchOpen ? "hidden sm:flex" : "flex"}`}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 -ml-2 rounded-xl text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange transition-colors"
          >
            {menuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
          </button>

          <Link href="/" className="shrink-0 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="MPCashews"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10">
          <Link href="/" className={navLink("/")}>
            Home
          </Link>
          <Link href="/about" className={navLink("/about")}>
            About
          </Link>
          <Link href="/become-partner" className={navLink("/become-partner")}>
            Become a Partner
          </Link>
          <Link href="/blogs" className={navLink("/blogs")}>
            Blogs
          </Link>
        </div>

        {/* Right Side: Actions */}
        <div className={`items-center gap-2 sm:gap-4 ${searchOpen ? "hidden sm:flex" : "flex"}`}>
          {/* Search (hidden on auth pages) */}
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
                className={`hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2
                sm:w-[300px] md:w-[350px]
                bg-white border border-brand-brown/10 rounded-full shadow-lg
                px-4 py-2 items-center gap-3
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
            !isAuthPage && (
              <Link href="/login">
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
                  profileOpen
                    ? "bg-brand-orange text-white shadow-md"
                    : "text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange"
                }`}
              >
                <User size={20} strokeWidth={2.5} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl border border-brand-brown/10 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-2">
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setProfileOpen(false)}>
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-sm font-bold text-brand-black transition-colors group">
                        <LayoutDashboard
                          size={18}
                          className="text-brand-orange group-hover:scale-110 transition-transform"
                        />
                        Admin Dashboard
                      </div>
                    </Link>
                  )}

                  {!isAdmin && (
                    <>
                      <Link href="/profile?tab=orders" onClick={() => setProfileOpen(false)}>
                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-sm font-bold text-brand-black transition-colors group">
                          <Package
                            size={18}
                            className="text-brand-brown/50 group-hover:text-brand-orange transition-colors"
                          />
                          My Orders
                        </div>
                      </Link>

                      <Link href="/profile?tab=addresses" onClick={() => setProfileOpen(false)}>
                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-sm font-bold text-brand-black transition-colors group">
                          <MapPin
                            size={18}
                            className="text-brand-brown/50 group-hover:text-brand-orange transition-colors"
                          />
                          Saved Addresses
                        </div>
                      </Link>

                      <Link href="/profile?tab=account" onClick={() => setProfileOpen(false)}>
                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-sm font-bold text-brand-black transition-colors group">
                          <User
                            size={18}
                            className="text-brand-brown/50 group-hover:text-brand-orange transition-colors"
                          />
                          My Account
                        </div>
                      </Link>
                    </>
                  )}

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={() => {
                      handleLogout();
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Wishlist (customers only — admins are just previewing the store) */}
          {isLogged && !isAdmin && (
            <Link href="/wishlist">
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

          {/* Cart (customers only) */}
          {!isAdmin && (
            <Link href="/cart">
              <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange transition-colors">
                <ShoppingCart size={20} strokeWidth={2.5} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-brand-orange border-2 border-[#FBF6EE] text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* ── Mobile Drawer ───────────────────────────────────────────────── */}
      <aside
        className={`fixed top-16 lg:top-20 left-0 h-[calc(100vh-64px)] w-[85%] max-w-[320px] bg-white shadow-2xl z-40 lg:hidden transition-transform duration-300 border-r border-brand-brown/5 flex flex-col ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col p-6 gap-2 flex-1 overflow-y-auto">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
          >
            <Store size={20} className="text-brand-orange" /> Home
          </Link>

          <Link
            href="/about"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
          >
            <Info size={20} className="text-brand-orange" /> About
          </Link>

          <Link
            href="/become-partner"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
          >
            <Handshake size={20} className="text-brand-orange" /> Become a Partner
          </Link>

          <Link
            href="/blogs"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
          >
            <Newspaper size={20} className="text-brand-orange" /> Blogs
          </Link>

          {isLogged && isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
            >
              <LayoutDashboard size={20} className="text-brand-orange" /> Admin Dashboard
            </Link>
          )}

          {isLogged ? (
            <>
              {!isAdmin && (
                <>
                  <Link
                    href="/wishlist"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
                  >
                    <Heart size={20} className="text-brand-orange" /> Wishlist
                    {wishlistCount > 0 && (
                      <span className="ml-auto text-xs font-extrabold bg-brand-orange text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/profile?tab=orders"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
                  >
                    <Package size={20} className="text-brand-orange" /> My Orders
                  </Link>

                  <Link
                    href="/profile?tab=addresses"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
                  >
                    <MapPin size={20} className="text-brand-orange" /> Saved Addresses
                  </Link>

                  <Link
                    href="/profile?tab=account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-4 py-4 border-b border-gray-100 font-bold text-brand-black active:text-brand-orange"
                  >
                    <User size={20} className="text-brand-orange" /> My Account
                  </Link>
                </>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-4 py-4 font-bold text-red-500 w-full text-left active:bg-red-50 rounded-xl px-2 -mx-2 mt-auto"
              >
                <LogOut size={20} /> Logout
              </button>
            </>
          ) : (
            !isAuthPage && (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-6 flex items-center justify-center gap-2 w-full bg-brand-black text-white py-3.5 rounded-xl font-bold shadow-md active:scale-95 transition-transform"
              >
                <User size={18} strokeWidth={2.5} /> Sign In
              </Link>
            )
          )}
        </div>
      </aside>
    </>
  );
}
