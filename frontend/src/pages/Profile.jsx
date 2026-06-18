// src/pages/Profile.jsx
import React, { useState, useContext } from "react";
import { Package, MapPin, User } from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";
import OrdersTab    from "../components/profile/OrdersTab";
import AddressesTab from "../components/profile/AddressesTab";
import AccountTab   from "../components/profile/AccountTab";


const TABS = [
  { id: "orders",    label: "My Orders",    icon: Package },
  { id: "addresses", label: "Addresses",    icon: MapPin  },
  { id: "account",   label: "Account",      icon: User    },
];

export default function Profile() {
  const [active, setActive] = useState("orders");
  const { user } = useContext(AuthContext);

  const initial = user?.full_name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || "U";
  const name    = user?.full_name || user?.name || "Customer";
  const email   = user?.email || "";

  return (
    <div>
      {/* Header */}
      <div>
        <div>{initial}</div>
        <div>
          <div>Hi, {name} 👋</div>
          {email && <div>{email}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`profile-tab${active === id ? " active" : ""}`}
            onClick={() => setActive(id)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {active === "orders"    && <OrdersTab />}
        {active === "addresses" && <AddressesTab />}
        {active === "account"   && <AccountTab />}
      </div>
    </div>
  );
}
