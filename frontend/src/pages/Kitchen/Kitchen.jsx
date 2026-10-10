import { useCallback, useEffect, useState } from "react";
import { getOrders, updateOrderStatus } from "../../services/api";
import "./Kitchen.css";

const stages = [
  { status: "NEW", label: "New", next: "CONFIRMED", action: "Confirm Order" },
  { status: "CONFIRMED", label: "Confirmed", next: "PREPARING", action: "Start Preparing" },
  { status: "PREPARING", label: "Preparing", next: "READY", action: "Mark Ready" },
  { status: "READY", label: "Ready", next: null, action: null },
];

function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadOrders = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const data = await getOrders();
      setOrders(data);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load orders. Check that the backend is running."
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => loadOrders(true), 0);

    const timer = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, [loadOrders]);

  const changeStatus = async (orderId, status) => {
    setUpdating(orderId);
    setError("");

    try {
      const updatedOrder = await updateOrderStatus(orderId, status);

      setOrders((current) =>
        current.map((order) =>
          order._id === updatedOrder._id ? updatedOrder : order
        )
      );

      await loadOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update the order. Please try again."
      );
    } finally {
      setUpdating("");
    }
  };

  const activeOrders = orders.filter(
    (order) => !["COMPLETED", "CANCELLED"].includes(order.status)
  );

  const countFor = (status) =>
    activeOrders.filter((order) => order.status === status).length;

  const formatTime = (value) =>
    new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="dashboard-page kitchen-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">KITCHEN DISPLAY SYSTEM</span>
          <h3>Kitchen</h3>
          <p>Track incoming orders and keep preparation moving.</p>
        </div>

        <div className="kitchen-header-actions">
          <span className="kitchen-live-indicator">
            <span className="status-dot" />
            Auto-refresh · 5 sec
          </span>
          <button
            className="kitchen-refresh-button"
            onClick={() => loadOrders(true)}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      {error && <div className="kitchen-alert">{error}</div>}

      <div className="kitchen-metrics">
        <div className="metric-card">
          <span>NEW ORDERS</span>
          <strong>{countFor("NEW")}</strong>
          <small>Awaiting confirmation</small>
        </div>
        <div className="metric-card">
          <span>PREPARING</span>
          <strong>{countFor("PREPARING")}</strong>
          <small>Currently being prepared</small>
        </div>
        <div className="metric-card">
          <span>READY</span>
          <strong>{countFor("READY")}</strong>
          <small>Awaiting collection</small>
        </div>
      </div>

      <div className="kitchen-board-heading">
        <div>
          <span className="eyebrow">LIVE ORDER QUEUE</span>
          <h4>Active orders <span>{activeOrders.length}</span></h4>
        </div>
        <small>
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : "Connecting..."}
        </small>
      </div>

      {loading ? (
        <div className="kitchen-empty-state">
          <h4>Loading kitchen orders...</h4>
          <p>Connecting to the restaurant order system.</p>
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="kitchen-empty-state">
          <div className="kitchen-empty-icon">✓</div>
          <h4>Kitchen is all clear</h4>
          <p>New orders will appear here automatically when sent by Order Taker.</p>
        </div>
      ) : (
        <div className="kitchen-order-grid">
          {activeOrders.map((order) => {
            const stage = stages.find((item) => item.status === order.status);
            const tableNumber =
              order.table?.tableNumber ?? order.table?.name ?? "—";

            return (
              <article
                className={`kitchen-order-card status-${order.status?.toLowerCase()}`}
                key={order._id}
              >
                <div className="kitchen-order-top">
                  <div>
                    <span className="kitchen-order-label">ORDER</span>
                    <h4>#{order.orderNumber}</h4>
                  </div>
                  <span className={`kitchen-status status-pill-${order.status?.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>

                <div className="kitchen-order-meta">
                  <div>
                    <span>TABLE</span>
                    <strong>{tableNumber}</strong>
                  </div>
                  <div>
                    <span>RECEIVED</span>
                    <strong>{formatTime(order.createdAt)}</strong>
                  </div>
                  <div>
                    <span>ITEMS</span>
                    <strong>
                      {order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}
                    </strong>
                  </div>
                </div>

                <div className="kitchen-items-heading">ORDER ITEMS</div>
                <div className="kitchen-items-list">
                  {order.items.map((item, index) => (
                    <div
                      className="kitchen-order-item"
                      key={`${order._id}-${item.product?._id || item.product || index}`}
                    >
                      <span className="kitchen-item-quantity">{item.quantity}×</span>
                      <span className="kitchen-item-name">{item.name}</span>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="kitchen-order-notes">
                    <strong>Kitchen notes</strong>
                    <p>{order.notes}</p>
                  </div>
                )}

                <div className="kitchen-order-bottom">
                  <strong>Rs. {Number(order.total).toLocaleString()}</strong>
                  {stage?.next ? (
                    <button
                      className="kitchen-status-button"
                      disabled={updating === order._id}
                      onClick={() => changeStatus(order._id, stage.next)}
                    >
                      {updating === order._id ? "Updating..." : stage.action + " →"}
                    </button>
                  ) : (
                    <span className="kitchen-ready-label">✓ Ready for pickup</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Kitchen;
