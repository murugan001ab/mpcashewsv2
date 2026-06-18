import React from "react";

export default function Header() {
  return (
    <header>
      <div>
        <div>
          <div>SVR</div>
          <span>Cashews</span>
        </div>

        <div>
          <input placeholder="Search products, e.g. W240" />
        </div>

        <div>
          <button>📞</button>
          <button>💬</button>
          <button>₹ <span>0</span></button>
        </div>
      </div>
    </header>
  );
}
