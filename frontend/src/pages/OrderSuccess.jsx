// src/pages/OrderSuccess.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, Package, Home, Star } from "lucide-react";


export default function OrderSuccess() {
  const { id } = useParams();
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div>
      <div className={`order-success-card${visible ? " show" : ""}`}>

        {/* Confetti dots (CSS-only) */}
        <div aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className={`os-dot os-dot-${i % 4}`} style={{ "--i": i }} />
          ))}
        </div>

        <div>
          <CheckCircle2 size={38} strokeWidth={2.5} />
        </div>

        <h1>Order Placed!</h1>
        <p>
          Thank you for your order. We're packing your premium cashews
          and will dispatch them shortly.
        </p>

        <div>
          <Package size={13} />
          Order #{id}
        </div>

        {/* Steps */}
        <div>
          {[
            { label: "Order Confirmed", done: true },
            { label: "Packing",         done: false },
            { label: "Shipped",         done: false },
            { label: "Delivered",       done: false },
          ].map((s, i) => (
            <div key={i}>
              <div className={`os-step-dot${s.done ? " done" : ""}`}>
                {s.done ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
              </div>
              <div className={`os-step-label${s.done ? " done" : ""}`}>{s.label}</div>
              {i < 3 && <div className={`os-step-line${s.done ? " done" : ""}`} />}
            </div>
          ))}
        </div>

        <div>
          <Link to="/account">
            <button>
              <Package size={15} /> Track Order
            </button>
          </Link>
          <Link to="/">
            <button>
              <Home size={15} /> Continue Shopping
            </button>
          </Link>
        </div>

        <div>
          <Star size={13} style={{ color:"var(--amber)" }} />
          You can leave a review after delivery!
        </div>
      </div>
    </div>
  );
}
