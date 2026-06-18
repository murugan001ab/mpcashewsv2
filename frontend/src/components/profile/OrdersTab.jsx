// src/components/profile/OrdersTab.jsx
import React, { useContext, useEffect, useState } from "react";
import api from "../../services/api";
import { AuthContext } from "../../contexts/AuthContext";
import ReviewForm from "./ReviewForm";

export default function OrdersTab() {
  const { accessToken } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [reviewedProducts, setReviewedProducts] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_HOST;

  const isProductReviewed = (productId) => reviewedProducts.has(productId);

  const handleReviewSubmitted = (productId) => {
    setReviewedProducts((prev) => new Set(prev).add(productId));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // GET /api/orders/me  → paginated: { items: [...], total, page, size }
        const ordersRes = await api.get("orders/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const orderList = ordersRes.data?.items || ordersRes.data || [];
        setOrders(orderList);

        // GET /api/feedback/reviews/me  → reviews submitted by this user
        try {
          const reviewsRes = await api.get("feedback/reviews/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const myReviews = reviewsRes.data?.items || reviewsRes.data || [];
          const reviewedSet = new Set(myReviews.map((r) => r.product_id));
          setReviewedProducts(reviewedSet);
        } catch {
          // reviews endpoint failure is non-fatal
        }
      } catch (err) {
        console.error("Error loading orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  if (loading) {
    return <div>Loading your orders...</div>;
  }

  return (
    <div>
      <h3>Your Orders</h3>

      {orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id}>
            <div>
              <div>
                <span>Order #{order.id}</span>
                <span>
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>

              <div>
                <div
                  className={`delivery-status delivery-${order.status?.toLowerCase()}`}
                >
                  {order.status?.replace(/_/g, " ")}
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <strong>Deliver to:</strong>{" "}
              {order.address?.name} –{" "}
              {order.address?.address_line}, {order.address?.city},{" "}
              {order.address?.state} - {order.address?.pincode}
            </div>

            {/* Items */}
            <div>
              {(order.items || []).map((item, idx) => {
                const productId = item.product_id || item.product?.id;
                const productName = item.product_name || item.product?.name;
                const productImage = item.product?.image;
                const alreadyReviewed = isProductReviewed(productId);

                return (
                  <div key={`${order.id}-${idx}`}>
                    <div>
                      {productImage && (
                        <img
                         
                          src={`${BASE_URL}${productImage}`}
                          alt={productName}
                        />
                      )}
                      <div>
                        <div>{productName}</div>
                        <div>
                          Qty: <strong>{item.quantity}</strong>
                        </div>
                        <div>
                          ₹{item.unit_price} / unit
                        </div>
                      </div>
                    </div>

                    <div>
                      {alreadyReviewed ? (
                        <div>
                          <span>✔</span>
                          <span>Reviewed</span>
                        </div>
                      ) : (
                        <ReviewForm
                          productId={productId}
                          productName={productName}
                          onSubmitted={handleReviewSubmitted}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <span>Order Total:</span>
              <span>₹{order.total_amount}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
