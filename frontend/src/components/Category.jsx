// src/components/Category.jsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import staticCategoryPlaceholder from "../assets/cat.png";

export default function CategoryScroller() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const rowRef = useRef(null);

  useEffect(() => {
    api
      .get("categories/")
      .then((res) => {
        const data = res.data || [];

        setCategories(
          data.map((c) => ({
            ...c,
            slug:
              c.slug ||
              c.name
                ?.toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^\w-]/g, ""),
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateButtons = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;

    setAtStart(el.scrollLeft <= 5);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 5);
  }, []);

  useEffect(() => {
    const el = rowRef.current;

    if (!el) return;

    el.addEventListener("scroll", updateButtons, {
      passive: true,
    });

    updateButtons();

    return () => {
      el.removeEventListener("scroll", updateButtons);
    };
  }, [categories, updateButtons]);

  // Auto Scroll
  useEffect(() => {
    if (loading || categories.length === 0) return;

    const id = setInterval(() => {
      const el = rowRef.current;

      if (!el) return;

      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
        el.scrollTo({
          left: 0,
          behavior: "smooth",
        });
      } else {
        el.scrollBy({
          left: 220,
          behavior: "smooth",
        });
      }
    }, 3500);

    return () => clearInterval(id);
  }, [loading, categories.length]);

  const scroll = (dir) => {
    rowRef.current?.scrollBy({
      left: dir * 250,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <span className="mb-2 block text-sm font-semibold uppercase tracking-[3px] text-orange-500">
          Browse
        </span>

        <h2
          className="text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Shop by <span className="text-orange-500">Category</span>
        </h2>
      </div>

      {/* Slider Wrapper */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll(-1)}
          disabled={atStart}
          aria-label="Scroll Left"
          className={`absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-all ${
            atStart
              ? "cursor-not-allowed opacity-40"
              : "hover:scale-105 hover:bg-orange-500 hover:text-white"
          }`}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll(1)}
          disabled={atEnd}
          aria-label="Scroll Right"
          className={`absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-all ${
            atEnd
              ? "cursor-not-allowed opacity-40"
              : "hover:scale-105 hover:bg-orange-500 hover:text-white"
          }`}
        >
          <ChevronRight size={20} />
        </button>

        {/* Categories Container */}
        <div className="mx-12 overflow-hidden rounded-3x p-6">
          {loading ? (
            <div className="flex  gap-20 ">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[180px] animate-pulse bg rounded-2xl bg-white p-4 shadow"
                >
                  <div className="mb-4 h-32 rounded-xl bg-gray-200"></div>
                  <div className="mx-auto h-4 w-24 rounded bg-gray-200"></div>
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={rowRef}
              className="flex gap-30   py-4 justify-center-safe overflow-x-auto scroll-smooth scrollbar-hide"
            >
              {categories.map((cat, i) => (
                <Link
                  key={cat.slug || i}
                  to={`/category/${cat.slug}`}
                  className="flex-shrink-0"
                >
                  <motion.div
                    whileHover={{
                      scale: 1.05,
                      y: -6,
                    }}
                    transition={{
                      duration: 0.25,
                    }}
                    className="group w-[180px] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-xl"
                  >
                    {/* Image */}
                    <div className="mb-4 overflow-hidden rounded-xl bg-gray-100">
                      <img
                        src={
                          cat.image_url ||
                          cat.image ||
                          staticCategoryPlaceholder
                        }
                        alt={cat.name}
                        onError={(e) => {
                          e.target.src = staticCategoryPlaceholder;
                        }}
                        className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>

                    {/* Category Name */}
                    <h3 className="text-center text-sm font-semibold text-gray-800">
                      {cat.name}
                    </h3>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}