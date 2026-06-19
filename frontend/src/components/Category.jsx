// src/components/Category.jsx

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import staticCategoryPlaceholder from "../assets/cat.png";

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const tile = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 20,
  },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

function chunk(arr, size) {
  const result = [];

  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }

  return result;
}

function CategoryTile({ category, area }) {
  return (
    <motion.div
      variants={tile}
      style={{ gridArea: area }}
      className="overflow-hidden rounded-2xl"
    >
      <Link
        to={`/category/${category.slug}`}
        className="group relative block h-full w-full"
      >
        <img
          src={
            category.image_url ||
            category.image ||
            staticCategoryPlaceholder
          }
          alt={category.name}
          onError={(e) => {
            e.target.src = staticCategoryPlaceholder;
          }}
          className="
            absolute inset-0
            w-full h-full
            object-cover
            transition-transform
            duration-500
            group-hover:scale-110
          "
        />

        <div className="absolute inset-0 bg-black/35 group-hover:bg-black/50 transition-colors" />

        <div className="absolute inset-0 flex items-center justify-center p-4">
          <h3 className="text-white text-center font-black uppercase tracking-wide text-sm sm:text-base">
            {category.name}
          </h3>
        </div>
      </Link>
    </motion.div>
  );
}

function CategoryPattern({ categories = [] }) {
  const [c1, c2, c3, c4, c5] = categories;

  const Card = ({ category, className }) => (
    <div
      className={`${className} overflow-hidden rounded-xl relative group cursor-pointer`}
    >
      <img
        src={category?.image || "/placeholder.jpg"}
        alt={category?.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-black/30 flex items-end">
        <h3 className="text-white text-xl font-semibold p-4">
          {category?.name}
        </h3>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-8 gap-4 auto-rows-[180px]">
      {c1 && (
        <Card
          category={c5}
          className="col-span-4 row-span-1"
        />
      )}

      {c2 && (
        <Card
          category={c1}
          className="col-span-2 row-span-1"
        />
      )}


      {c3 && (
        <Card
          category={c4}
          className="col-span-2 row-span-2"
        />
      )}


      {c4 && (
        <Card
          category={c2}
          className="col-span-2 row-span-1"
        />
      )}

      {c5 && (
        <Card
          category={c3}
          className="col-span-4 row-span-1"
        />
      )}
    </div>
  );
}
export default function CategoryGrid() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("categories/")
      .then((res) => {
        const data = res.data || [];

        setCategories(
          data.map((cat) => ({
            ...cat,
            slug:
              cat.slug ||
              cat.name.toLowerCase().replace(/\s+/g, "-"),
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const groups = chunk(categories, 5);

  return (
    <section className="py-10 px-4 sm:px-8">
      <div className="mb-8">
        <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">
          Browse
        </span>

        <h2 className="text-3xl sm:text-4xl font-black uppercase">
          Shop By{" "}
          <span className="text-brand-orange">
            Category
          </span>
        </h2>
      </div>

      {loading ? (
        <div
          className="grid gap-2 h-[420px]"
          style={{
            gridTemplateColumns: "1.4fr 0.8fr 1.4fr",
            gridTemplateRows: "1fr 1fr",
            gridTemplateAreas: `
              "one two big"
              "three four big"
            `,
          }}
        >
          <div
            className="bg-gray-200 animate-pulse rounded-2xl"
            style={{ gridArea: "one" }}
          />

          <div
            className="bg-gray-200 animate-pulse rounded-2xl"
            style={{ gridArea: "two" }}
          />

          <div
            className="bg-gray-200 animate-pulse rounded-2xl"
            style={{ gridArea: "three" }}
          />

          <div
            className="bg-gray-200 animate-pulse rounded-2xl"
            style={{ gridArea: "four" }}
          />

          <div
            className="bg-gray-200 animate-pulse rounded-2xl"
            style={{ gridArea: "big" }}
          />
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {groups.map((group, index) => (
            <CategoryPattern
              key={index}
              categories={group}
            />
          ))}
        </motion.div>
      )}
    </section>
  );
}