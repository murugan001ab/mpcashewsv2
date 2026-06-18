function CategoryPattern({ items }) {
  const [c1, c2, c3, c4, c5] = items;

  return (
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
      {c1 && (
        <div style={{ gridArea: "one" }}>
          <CategoryTile category={c1} />
        </div>
      )}

      {c2 && (
        <div style={{ gridArea: "two" }}>
          <CategoryTile category={c2} />
        </div>
      )}

      {c3 && (
        <div style={{ gridArea: "three" }}>
          <CategoryTile category={c3} />
        </div>
      )}

      {c4 && (
        <div style={{ gridArea: "four" }}>
          <CategoryTile category={c4} />
        </div>
      )}

      {c5 && (
        <div style={{ gridArea: "big" }}>
          <CategoryTile category={c5} />
        </div>
      )}
    </div>
  );
}