import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createOrder,
  getCategories,
  getOrders,
  getProducts,
  getTables,
} from "../../services/api";
import "./OrderTaker.css";

function OrderTaker() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryData, productData, tableData, orderData] =
        await Promise.all([
          getCategories(),
          getProducts(),
          getTables(),
          getOrders(),
        ]);

      setCategories(categoryData);
      setProducts(productData);
      setTables(tableData);
      setOrders(orderData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load restaurant data. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => loadData(), 0);

    return () => {
      clearTimeout(initialLoad);
    };
  }, [loadData]);

  const availableTables = tables.filter(
    (table) => table.status === "available"
  );

  const activeOrders = orders.filter(
    (order) => !["COMPLETED", "CANCELLED"].includes(order.status)
  );

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryName =
        typeof product.category === "object"
          ? product.category?.name
          : categories.find((category) => category._id === product.category)
              ?.name;

      const matchesCategory =
        selectedCategory === "All" || categoryName === selectedCategory;

      const matchesSearch = product.name.toLowerCase().includes(term);

      return matchesCategory && matchesSearch && product.isAvailable;
    });
  }, [products, categories, selectedCategory, search]);

  const addToCart = (product) => {
    setNotice("");
    setCart((current) => {
      const existing = current.find((item) => item._id === product._id);

      if (existing) {
        return current.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  };

  const changeQuantity = (productId, amount) => {
    setCart((current) =>
      current
        .map((item) =>
          item._id === productId
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const sendOrder = async () => {
    if (!selectedTable) {
      setError("Select an available table before sending the order.");
      return;
    }

    if (cart.length === 0) {
      setError("Add at least one menu item to the order.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const order = await createOrder({
        tableId: selectedTable,
        items: cart.map((item) => ({
          product: item._id,
          quantity: item.quantity,
        })),
        notes: notes.trim(),
      });

      setCart([]);
      setNotes("");
      setSelectedTable("");
      setNotice(`Order ${order.orderNumber} sent successfully.`);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not send the order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="dashboard-page order-taker-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">ORDER DESK</span>
          <h3>Order Taker</h3>
          <p>Select a table, build the order, and send it to the kitchen.</p>
        </div>
        <button className="refresh-button" onClick={loadData} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </header>

      {error && <div className="order-alert error-alert">{error}</div>}
      {notice && <div className="order-alert success-alert">{notice}</div>}

      <div className="order-metrics">
        <div className="metric-card">
          <span>AVAILABLE TABLES</span>
          <strong>{availableTables.length}</strong>
          <small>Ready for guests</small>
        </div>
        <div className="metric-card">
          <span>MENU ITEMS</span>
          <strong>{products.filter((item) => item.isAvailable).length}</strong>
          <small>Currently available</small>
        </div>
        <div className="metric-card">
          <span>ACTIVE ORDERS</span>
          <strong>{activeOrders.length}</strong>
          <small>In the order workflow</small>
        </div>
      </div>

      {loading ? (
        <div className="order-loading">Loading restaurant workspace...</div>
      ) : (
        <div className="order-workspace">
          <div className="menu-workspace">
            <section className="order-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">STEP 01</span>
                  <h4>Select a table</h4>
                </div>
                <span className="panel-count">{availableTables.length} available</span>
              </div>

              <div className="table-grid">
                {tables.filter((table) => table.isActive).map((table) => {
                  const available = table.status === "available";

                  return (
                    <button
                      key={table._id}
                      className={`table-option ${
                        selectedTable === table._id ? "selected" : ""
                      } ${!available ? "occupied" : ""}`}
                      disabled={!available}
                      onClick={() => {
                        setSelectedTable(table._id);
                        setError("");
                      }}
                    >
                      <span className="table-number">{table.tableNumber}</span>
                      <span>{table.name || `Table ${table.tableNumber}`}</span>
                      <small>{available ? "Available" : "Occupied"}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="order-panel menu-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">STEP 02</span>
                  <h4>Choose menu items</h4>
                </div>
                <span className="panel-count">{visibleProducts.length} items</span>
              </div>

              <input
                className="menu-search"
                type="search"
                placeholder="Search menu..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <div className="category-list">
                {["All", ...categories.filter((item) => item.isActive).map((item) => item.name)].map(
                  (name) => (
                    <button
                      key={name}
                      className={`category-chip ${
                        selectedCategory === name ? "active" : ""
                      }`}
                      onClick={() => setSelectedCategory(name)}
                    >
                      {name}
                    </button>
                  )
                )}
              </div>

              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <article className="menu-product" key={product._id}>
                    <div className="product-image-placeholder">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                            event.currentTarget.nextElementSibling.style.display = "grid";
                          }}
                        />
                      ) : null}
                      <span style={{ display: product.imageUrl ? "none" : "grid" }}>
                        {product.name.charAt(0)}
                      </span>
                    </div>
                    <div className="product-info">
                      <h5>{product.name}</h5>
                      <p>{product.description || "Freshly prepared to order"}</p>
                      <div className="product-footer">
                        <strong>Rs. {product.price.toLocaleString()}</strong>
                        <button
                          className="add-item-button"
                          onClick={() => addToCart(product)}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {visibleProducts.length === 0 && (
                  <p className="empty-menu">No available items match your search.</p>
                )}
              </div>
            </section>
          </div>

          <aside className="order-panel cart-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">STEP 03</span>
                <h4>Current order</h4>
              </div>
              <span className="cart-count">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            <div className="cart-table-label">
              {selectedTable
                ? `Table ${tables.find((table) => table._id === selectedTable)?.tableNumber}`
                : "No table selected"}
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <span>＋</span>
                  <strong>Your order is empty</strong>
                  <p>Select menu items to start an order.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div className="cart-item" key={item._id}>
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <small>Rs. {item.price.toLocaleString()} each</small>
                    </div>
                    <div className="quantity-control">
                      <button onClick={() => changeQuantity(item._id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQuantity(item._id, 1)}>+</button>
                    </div>
                    <strong className="cart-line-total">
                      Rs. {(item.price * item.quantity).toLocaleString()}
                    </strong>
                  </div>
                ))
              )}
            </div>

            <label className="notes-label" htmlFor="order-notes">
              Kitchen notes <span>(optional)</span>
            </label>
            <textarea
              id="order-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Allergies, special instructions..."
              rows={3}
            />

            <div className="cart-total">
              <span>Order total</span>
              <strong>Rs. {total.toLocaleString()}</strong>
            </div>

            <button
              className="send-order-button"
              onClick={sendOrder}
              disabled={submitting || cart.length === 0 || !selectedTable}
            >
              {submitting ? "Sending order..." : "Send Order to Kitchen →"}
            </button>
            <p className="cart-footnote">Payment is handled separately by the cashier.</p>
          </aside>
        </div>
      )}
    </section>
  );
}

export default OrderTaker;
