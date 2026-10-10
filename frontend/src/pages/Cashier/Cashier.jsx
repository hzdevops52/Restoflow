import { useCallback, useEffect, useState } from "react";
import { getOrders, updateOrderStatus, updatePaymentStatus } from "../../services/api";
import "./Cashier.css";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const formatTime = (date) =>
  date
    ? new Date(date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function Cashier() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load orders. Check the backend connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(loadOrders, 0);
    const interval = setInterval(loadOrders, 5000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadOrders]);

  const activeOrders = orders.filter(
    (order) => !["COMPLETED", "CANCELLED"].includes(order.status)
  );

  const completedOrders = orders.filter((order) => order.status === "COMPLETED");
  const unpaidOrders = activeOrders.filter(
    (order) => order.paymentStatus !== "PAID"
  );

  const readyOrders = activeOrders.filter((order) => order.status === "READY");

  const handlePayment = async (order) => {
    setUpdating(order._id);
    setError("");

    try {
      await updatePaymentStatus(order._id, "PAID");
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update payment status.");
    } finally {
      setUpdating("");
    }
  };

  const handleComplete = async (order) => {
    if (order.paymentStatus !== "PAID" || order.status !== "READY") return;

    setUpdating(order._id);
    setError("");

    try {
      await updateOrderStatus(order._id, "COMPLETED");
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Could not complete the order.");
    } finally {
      setUpdating("");
    }
  };

  return (
    <section className="cashier-page">
      <header className="cashier-heading">
        <div>
          <span className="eyebrow">PAYMENT DESK</span>
          <h1>Cashier</h1>
          <p>Manage payments and close completed restaurant orders.</p>
        </div>
        <div className="cashier-live">
          <span className="status-dot" />
          <span>Live updates · 5 sec</span>
        </div>
      </header>

      <div className="cashier-metrics">
        <article className="cashier-metric">
          <span>OPEN ORDERS</span>
          <strong>{activeOrders.length}</strong>
          <small>Awaiting completion</small>
        </article>
        <article className="cashier-metric">
          <span>UNPAID ORDERS</span>
          <strong>{unpaidOrders.length}</strong>
          <small>Payment pending</small>
        </article>
        <article className="cashier-metric">
          <span>READY FOR PAYMENT</span>
          <strong>{readyOrders.length}</strong>
          <small>Kitchen-ready orders</small>
        </article>
        <article className="cashier-metric">
          <span>COMPLETED</span>
          <strong>{completedOrders.length}</strong>
          <small>Orders in loaded history</small>
        </article>
      </div>

      {error && (
        <div className="cashier-error" role="alert">
          {error}
          <button type="button" onClick={loadOrders}>Retry</button>
        </div>
      )}

      <div className="cashier-section-heading">
        <div>
          <span className="eyebrow">ORDER MANAGEMENT</span>
          <h2>Active orders</h2>
        </div>
        <span className="cashier-refresh">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Connecting…"}
        </span>
      </div>

      {loading ? (
        <div className="cashier-empty">
          <h3>Loading orders…</h3>
          <p>Connecting to the RestoFlow order service.</p>
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="cashier-empty">
          <div className="cashier-empty-icon">✓</div>
          <h3>All caught up</h3>
          <p>There are no active orders waiting for cashier attention.</p>
        </div>
      ) : (
        <div className="cashier-order-grid">
          {activeOrders.map((order) => {
            const isBusy = updating === order._id;
            const isReady = order.status === "READY";
            const isPaid = order.paymentStatus === "PAID";
            const tableLabel =
              order.table?.tableNumber ?? order.table?.name ?? "—";

            return (
              <article className="cashier-order-card" key={order._id}>
                <div className="cashier-order-top">
                  <div>
                    <span className="cashier-order-label">ORDER</span>
                    <h3>#{order.orderNumber}</h3>
                  </div>
                  <span className={`cashier-status status-${order.status.toLowerCase()}`}>
                    {order.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="cashier-order-meta">
                  <span>Table <strong>{tableLabel}</strong></span>
                  <span>{formatTime(order.createdAt)}</span>
                </div>

                <div className="cashier-items">
                  {order.items?.map((item, index) => (
                    <div className="cashier-item" key={`${order._id}-${index}`}>
                      <span>
                        <b>{item.quantity}×</b> {item.name}
                      </span>
                      <strong>{formatCurrency(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="cashier-notes">
                    <span>ORDER NOTES</span>
                    <p>{order.notes}</p>
                  </div>
                )}

                <div className="cashier-total">
                  <span>Total amount</span>
                  <strong>{formatCurrency(order.total)}</strong>
                </div>

                <div className="cashier-payment-row">
                  <span>Payment</span>
                  <span className={`cashier-payment ${isPaid ? "paid" : "unpaid"}`}>
                    <span className="payment-dot" />
                    {isPaid ? "PAID" : "UNPAID"}
                  </span>
                </div>

                <div className="cashier-actions">
                  {!isPaid && isReady && (
                    <button
                      type="button"
                      className="cashier-button cashier-button-primary"
                      disabled={isBusy}
                      onClick={() => handlePayment(order)}
                    >
                      {isBusy ? "Updating…" : "Mark as Paid"}
                    </button>
                  )}

                  {isPaid && isReady && (
                    <button
                      type="button"
                      className="cashier-button cashier-button-success"
                      disabled={isBusy}
                      onClick={() => handleComplete(order)}
                    >
                      {isBusy ? "Completing…" : "Complete Order"}
                    </button>
                  )}

                  {!isReady && (
                    <p className="cashier-action-hint">
                      {order.status === "CANCELLED"
                        ? "This order has been cancelled."
                        : "Available when the kitchen marks this order READY."}
                    </p>
                  )}

                  {isReady && isPaid && (
                    <p className="cashier-action-hint">
                      Payment recorded. Complete the order to release the table.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="completed-history-section">
        <div className="cashier-section-heading">
          <div>
            <span className="eyebrow">ORDER RECORDS</span>
            <h2>Completed order history</h2>
            <p>Detailed records of fulfilled orders and their items.</p>
          </div>
          <span className="completed-history-count">
            {completedOrders.length} orders
          </span>
        </div>

        {completedOrders.length === 0 ? (
          <div className="cashier-empty">
            <h3>No completed orders yet</h3>
            <p>Completed orders will appear here with their full details.</p>
          </div>
        ) : (
          <div className="completed-history-list">
            {completedOrders.map((order) => (
              <details className="completed-history-card" key={order._id}>
                <summary className="completed-history-summary">
                  <div className="completed-history-order">
                    <span className="cashier-order-label">ORDER</span>
                    <strong>#{order.orderNumber}</strong>
                    <span className="completed-history-meta">
                      Table {order.table?.tableNumber ?? order.table?.name ?? "—"}
                    </span>
                  </div>

                  <div className="completed-history-total">
                    <strong>{formatCurrency(order.total)}</strong>
                    <span>{order.paymentStatus || "UNPAID"}</span>
                  </div>

                  <span className="completed-history-expand">View details ↓</span>
                </summary>

                <div className="completed-history-details">
                  <div className="completed-history-dates">
                    <div>
                      <span>ORDER PLACED</span>
                      <strong>
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString()
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span>COMPLETED</span>
                      <strong>
                        {order.updatedAt
                          ? new Date(order.updatedAt).toLocaleString()
                          : "Timestamp unavailable"}
                      </strong>
                    </div>
                  </div>

                  <h4>Items ordered</h4>
                  <div className="completed-history-items">
                    {order.items?.map((item, index) => (
                      <div
                        className="completed-history-item"
                        key={`${order._id}-${item.product?._id || item.product || index}`}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                        <strong>{formatCurrency(item.subtotal)}</strong>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="completed-history-notes">
                      <span>ORDER NOTES</span>
                      <p>{order.notes}</p>
                    </div>
                  )}

                  <div className="completed-history-footer">
                    <span>
                      {order.items?.length || 0} distinct item types
                    </span>
                    <div>
                      <span>Order total</span>
                      <strong>{formatCurrency(order.total)}</strong>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

    </section>
  );
}

export default Cashier;
