import React, { useEffect, useState } from "react";
import api from "../../services/api";
import ReviewForm from "./ReviewForm";
import { Package, MapPin, Clock, CheckCircle2, Loader2, ChevronRight } from "lucide-react";

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [reviewedProducts] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_HOST;

  const isProductReviewed = (productId) => reviewedProducts.has(productId);

  const handleReviewSubmitted = () => {
    // No-op until the backend ships a reviews API (see ReviewForm.jsx note).
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // GET /api/v1/orders — auth comes from the httpOnly cookie automatically,
        // no Authorization header needed. There is no "/orders/me" route.
        const ordersRes = await api.get("orders");
        const orderList = ordersRes.data?.items || ordersRes.data || [];
        setOrders(orderList);
      } catch (err) {
        console.error("Error loading orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper for dynamic status badge colors
  const getStatusStyles = (status) => {
    const s = status?.toLowerCase();
    if (s === "delivered") return "bg-green-50 text-green-600 border-green-200";
    if (s === "shipped") return "bg-blue-50 text-blue-600 border-blue-200";
    if (s === "cancelled") return "bg-red-50 text-red-600 border-red-200";
    return "bg-brand-orange/10 text-brand-orange border-brand-orange/20"; // pending/processing
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-brand-brown/50">
        <Loader2 className="animate-spin w-10 h-10 mb-4 text-brand-orange" />
        <p className="text-sm font-bold tracking-wide">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h3 className="text-xl font-extrabold text-brand-black tracking-tight">Your Orders</h3>
        <p className="text-sm font-medium text-brand-brown/60 mt-1">
          View your order history and leave reviews for products you've purchased.
        </p>
      </div>

      {orders.length === 0 ? (
        /* ── Empty State ────────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 border border-brand-brown/5 text-center rounded-3xl border-dashed">
          <div className="w-16 h-16 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-4">
            <Package size={32} strokeWidth={1.5} />
          </div>
          <p className="text-lg font-bold text-brand-black mb-1">No orders placed yet</p>
          <p className="text-sm text-brand-brown/60 mb-6 max-w-sm">
            Looks like you haven't made any purchases. When you do, they will appear here.
          </p>
        </div>
      ) : (
        /* ── Orders List ────────────────────────────────────────────────── */
        <div className="flex flex-col gap-6">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className="bg-white border border-brand-brown/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              {/* Order Header */}
              <div className="bg-gray-50/50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-brown/5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-brand-black tracking-tight">
                      Order #{order.id}
                    </span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full border ${getStatusStyles(order.status)}`}>
                      {order.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-brand-brown/60">
                    <Clock size={12} />
                    {new Date(order.created_at).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                </div>
                
                <div className="text-left md:text-right">
                  <p className="text-xs font-semibold text-brand-brown/60 uppercase tracking-widest">Order Total</p>
                  <p className="text-lg font-extrabold text-brand-black">₹{order.total_amount}</p>
                </div>
              </div>

              <div className="p-6">
                {/* Shipping Address */}
                {order.address && (
                  <div className="flex items-start gap-3 bg-brand-cream/20 border border-brand-brown/5 rounded-xl p-4 mb-6">
                    <MapPin size={18} className="text-brand-orange mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-brand-black mb-1">
                        Deliver to: <span className="text-brand-orange">{order.address.name}</span>
                      </p>
                      <p className="text-xs text-brand-brown/70 leading-relaxed max-w-xl">
                        {order.address.address_line}, {order.address.city}, {order.address.state} - <span className="font-semibold text-brand-black">{order.address.pincode}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="flex flex-col gap-5">
                  <h4 className="text-xs font-bold text-brand-brown/40 uppercase tracking-widest">Items in this order</h4>
                  
                  <div className="divide-y divide-brand-brown/5 border-t border-brand-brown/5">
                    {(order.items || []).map((item, idx) => {
                      const productId = item.product_id || item.product?.id;
                      const productName = item.product_name || item.product?.name;
                      const productImage = item.product?.image;
                      const alreadyReviewed = isProductReviewed(productId);

                      return (
                        <div key={`${order.id}-${idx}`} className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Item Info */}
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border border-brand-brown/5 flex-shrink-0">
                              {productImage ? (
                                <img
                                  src={productImage.startsWith("http") ? productImage : `${BASE_URL}${productImage}`}
                                  alt={productName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-brand-brown/20">
                                  <Package size={20} />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col">
                              <h5 className="text-sm font-bold text-brand-black line-clamp-1 mb-1">
                                {productName}
                              </h5>
                              <div className="flex items-center gap-3 text-xs font-medium text-brand-brown/60">
                                <span>Qty: <strong className="text-brand-black">{item.quantity}</strong></span>
                                <span className="w-1 h-1 bg-brand-brown/20 rounded-full"></span>
                                <span>₹{item.unit_price} / unit</span>
                              </div>
                            </div>
                          </div>

                          {/* Review Action */}
                          <div className="sm:ml-auto">
                            {alreadyReviewed ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 w-fit">
                                <CheckCircle2 size={14} strokeWidth={2.5} />
                                Reviewed
                              </div>
                            ) : (
                              <div className="min-w-[120px]">
                                <ReviewForm
                                  productId={productId}
                                  productName={productName}
                                  onSubmitted={handleReviewSubmitted}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}