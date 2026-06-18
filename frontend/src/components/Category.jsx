// src/components/Category.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import staticCategoryPlaceholder from "../assets/cat.png";


export default function CategoryScroller() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [atStart,    setAtStart]    = useState(true);
  const [atEnd,      setAtEnd]      = useState(false);
  const rowRef = useRef(null);

  useEffect(() => {
    api.get("categories/")
      .then(res => {
        const data = res.data || [];
        setCategories(data.map(c => ({
          ...c, slug: c.slug || c.name.toLowerCase().replace(/ /g, "-"),
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateButtons = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateButtons, { passive: true });
    updateButtons();
    return () => el.removeEventListener("scroll", updateButtons);
  }, [categories, updateButtons]);

  useEffect(() => {
    if (loading || categories.length === 0) return;
    const id = setInterval(() => {
      const el = rowRef.current;
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 220, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(id);
  }, [loading, categories.length]);

  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });

  return (
    <section>
      <div>
        <div>Browse</div>
        <h2 style={{ fontFamily:"var(--font-display)" }}>
          Shop by <span>Category</span>
        </h2>
      </div>

      <div>
        <button
          disabled={atStart}
          onClick={() => scroll(-1)} aria-label="Scroll left"
        >
          <ChevronLeft size={17} />
        </button>

        <div>
          {loading ? (
            <div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div />
                  <div />
                </div>
              ))}
            </div>
          ) : (
            <div ref={rowRef}>
              {categories.map((cat, i) => (
                <Link key={cat.slug || i} to={`/category/${cat.slug}`}>
                  <motion.div
                   
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: .22 }}
                  >
                    <div>
                      <img
                        src={cat.image_url || cat.image || staticCategoryPlaceholder}
                        alt={cat.name}
                       
                        onError={e => (e.target.src = staticCategoryPlaceholder)}
                      />
                    </div>
                    <span>{cat.name}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <button
          disabled={atEnd}
          onClick={() => scroll(1)} aria-label="Scroll right"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}
