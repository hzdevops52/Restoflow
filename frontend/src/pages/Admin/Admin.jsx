
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCategory,
  createProduct,
  createTable,
  getCategories,
  getOrders,
  getProducts,
  getTables,
  updateProduct,
  uploadProductImage,
} from "../../services/api";
import "./Admin.css";

const currency = (amount) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

function Admin() {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const emptyProduct = {
    name: "",
    description: "",
    price: "",
    category: "",
    imageUrl: "",
    isAvailable: true,
  };

  const [productForm, setProductForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });
  const [tableForm, setTableForm] = useState({
    tableNumber: "",
    name: "",
    capacity: "4",
  });

  const loadData = useCallback(async () => {
    try {
      const [productData, categoryData, tableData, orderData] =
        await Promise.all([
          getProducts(true),
          getCategories(),
          getTables(),
          getOrders(),
        ]);

      setProducts(productData);
      setCategories(categoryData);
      setTables(tableData);
      setOrders(orderData);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load management data. Check the backend connection."
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

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) =>
      [product.name, product.description, product.category?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [products, search]);

  const activeOrders = orders.filter(
    (order) => !["COMPLETED", "CANCELLED"].includes(order.status)
  );
  const completedOrders = orders.filter(
    (order) => order.status === "COMPLETED"
  );
  const paidSales = completedOrders
    .filter((order) => order.paymentStatus === "PAID")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const resetProductForm = () => {
    setProductForm(emptyProduct);
    setEditingId("");
    setSelectedImage(null);
    setImagePreview("");
  };

  const startEditing = (product) => {
    setEditingId(product._id);
    setSelectedImage(null);
    setImagePreview(product.imageUrl || "");
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      category: product.category?._id || product.category || "",
      imageUrl: product.imageUrl || "",
      isAvailable: Boolean(product.isAvailable),
    });
    setTab("products");
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      let imageUrl = productForm.imageUrl.trim();
      if (selectedImage) {
        const uploaded = await uploadProductImage(selectedImage);
        imageUrl = uploaded.imageUrl;
      }
      const payload = {
        ...productForm,
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        imageUrl,
        price: Number(productForm.price),
      };

      if (!payload.name || !payload.category || !Number.isFinite(payload.price) || payload.price < 0) {
        throw new Error("Enter a product name, valid price, and category.");
      }

      if (editingId) {
        await updateProduct(editingId, payload);
        setNotice("Product updated successfully.");
      } else {
        await createProduct(payload);
        setNotice("Product created successfully.");
      }

      resetProductForm();
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Could not save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (product) => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await updateProduct(product._id, {
        isAvailable: !product.isAvailable,
      });
      setNotice(
        `${product.name} is now ${
          product.isAvailable ? "unavailable" : "available"
        }.`
      );
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not update product availability."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await createCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
      });
      setCategoryForm({ name: "", description: "" });
      setNotice("Category created successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create category.");
    } finally {
      setSaving(false);
    }
  };

  const handleTableSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const tableNumber = Number(tableForm.tableNumber);
      const capacity = Number(tableForm.capacity);

      if (!Number.isInteger(tableNumber) || tableNumber < 1) {
        throw new Error("Enter a valid table number.");
      }
      if (!Number.isInteger(capacity) || capacity < 1) {
        throw new Error("Capacity must be at least one.");
      }

      await createTable({
        tableNumber,
        name: tableForm.name.trim(),
        capacity,
      });
      setTableForm({ tableNumber: "", name: "", capacity: "4" });
      setNotice("Table created successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not create table.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-page admin-page">
      <header className="page-heading admin-heading">
        <div>
          <span className="eyebrow">RESTAURANT MANAGEMENT</span>
          <h3>Management</h3>
          <p>Control your menu, tables, and restaurant operations.</p>
        </div>
        <button
          type="button"
          className="refresh-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </header>

      <div className="admin-metrics">
        <article className="admin-metric">
          <span>MENU PRODUCTS</span>
          <strong>{products.length}</strong>
          <small>{products.filter((p) => p.isAvailable).length} available</small>
        </article>
        <article className="admin-metric">
          <span>MENU CATEGORIES</span>
          <strong>{categories.length}</strong>
          <small>Active categories</small>
        </article>
        <article className="admin-metric">
          <span>ACTIVE ORDERS</span>
          <strong>{activeOrders.length}</strong>
          <small>Not completed or cancelled</small>
        </article>
        <article className="admin-metric">
          <span>PAID COMPLETED SALES</span>
          <strong>{currency(paidSales)}</strong>
          <small>Across loaded order history</small>
        </article>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {notice && (
        <div className="admin-alert admin-alert-success" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>Dismiss</button>
        </div>
      )}

      <nav className="admin-tabs" aria-label="Management sections">
        {[
          ["products", "Menu & Products"],
          ["categories", "Categories"],
          ["tables", "Tables"],
          ["operations", "Operations"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={tab === value ? "admin-tab active" : "admin-tab"}
            onClick={() => {
              setTab(value);
              setError("");
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="admin-empty">Loading restaurant management data...</div>
      ) : (
        <>
          {tab === "products" && (
            <div className="admin-workspace">
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span className="eyebrow">
                      {editingId ? "UPDATE MENU ITEM" : "MENU CONFIGURATION"}
                    </span>
                    <h4>{editingId ? "Edit product" : "Add a product"}</h4>
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      className="admin-text-button"
                      onClick={resetProductForm}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>

                <form className="admin-form" onSubmit={handleProductSubmit}>
                  <label>
                    Product name *
                    <input
                      required
                      maxLength={100}
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm({ ...productForm, name: event.target.value })
                      }
                      placeholder="e.g. Chicken Burger"
                    />
                  </label>

                  <label>
                    Price (PKR) *
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={productForm.price}
                      onChange={(event) =>
                        setProductForm({ ...productForm, price: event.target.value })
                      }
                      placeholder="650"
                    />
                  </label>

                  <label>
                    Category *
                    <select
                      required
                      value={productForm.category}
                      onChange={(event) =>
                        setProductForm({ ...productForm, category: event.target.value })
                      }
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-field-full">
                    Product Image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setSelectedImage(file);
                        setImagePreview(file ? URL.createObjectURL(file) : (productForm.imageUrl || ""));
                      }}
                    />
                    <small>Choose a JPG, PNG, WebP, or GIF image (max 5 MB).</small>
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        style={{
                          display: "block",
                          width: "120px",
                          height: "120px",
                          objectFit: "contain",
                          marginTop: "10px",
                          borderRadius: "10px",
                          background: "#182537",
                        }}
                      />
                    )}
                  </label>

                  <label className="admin-field-full">
                    Description
                    <textarea
                      rows="3"
                      maxLength={500}
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          description: event.target.value,
                        })
                      }
                      placeholder="Describe the menu item"
                    />
                  </label>

                  {editingId && (
                    <label className="admin-checkbox admin-field-full">
                      <input
                        type="checkbox"
                        checked={productForm.isAvailable}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            isAvailable: event.target.checked,
                          })
                        }
                      />
                      Available for ordering
                    </label>
                  )}

                  <div className="admin-form-actions admin-field-full">
                    <button
                      className="admin-button admin-button-primary"
                      type="submit"
                      disabled={saving || categories.length === 0}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Save changes"
                          : "Create product"}
                    </button>
                    {categories.length === 0 && (
                      <small>Create a category before adding products.</small>
                    )}
                  </div>
                </form>
              </section>

              <section className="admin-panel admin-products-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span className="eyebrow">PRODUCT CATALOG</span>
                    <h4>All products <span className="admin-count">{products.length}</span></h4>
                  </div>
                  <input
                    className="admin-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search menu..."
                    aria-label="Search products"
                  />
                </div>

                {visibleProducts.length === 0 ? (
                  <div className="admin-empty">
                    No products found. Create your first product or change your search.
                  </div>
                ) : (
                  <div className="admin-product-list">
                    {visibleProducts.map((product) => (
                      <article className="admin-product-row" key={product._id}>
                        <div className="admin-product-info">
                          <div className="admin-product-symbol">
                            {product.name?.charAt(0)?.toUpperCase() || "P"}
                          </div>
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.category?.name || "Uncategorized"}</span>
                            <small>{product.description || "No description"}</small>
                          </div>
                        </div>
                        <div className="admin-product-controls">
                          <strong>{currency(product.price)}</strong>
                          <span
                            className={
                              product.isAvailable
                                ? "admin-availability available"
                                : "admin-availability unavailable"
                            }
                          >
                            {product.isAvailable ? "Available" : "Unavailable"}
                          </span>
                          <button
                            type="button"
                            className="admin-text-button"
                            onClick={() => startEditing(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-text-button"
                            disabled={saving}
                            onClick={() => toggleAvailability(product)}
                          >
                            {product.isAvailable ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "categories" && (
            <div className="admin-workspace admin-two-column">
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span className="eyebrow">MENU ORGANIZATION</span>
                    <h4>Create category</h4>
                  </div>
                </div>
                <form className="admin-form admin-single-column" onSubmit={handleCategorySubmit}>
                  <label>
                    Category name *
                    <input
                      required
                      maxLength={80}
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, name: event.target.value })
                      }
                      placeholder="e.g. Burgers"
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      rows="3"
                      maxLength={300}
                      value={categoryForm.description}
                      onChange={(event) =>
                        setCategoryForm({
                          ...categoryForm,
                          description: event.target.value,
                        })
                      }
                      placeholder="Optional category details"
                    />
                  </label>
                  <button
                    className="admin-button admin-button-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Create category"}
                  </button>
                </form>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span className="eyebrow">ACTIVE MENU GROUPS</span>
                    <h4>Categories <span className="admin-count">{categories.length}</span></h4>
                  </div>
                </div>
                <div className="admin-simple-list">
                  {categories.map((category) => (
                    <article className="admin-simple-row" key={category._id}>
                      <div className="admin-product-symbol">▦</div>
                      <div>
                        <strong>{category.name}</strong>
                        <small>{category.description || "No description"}</small>
                      </div>
                      <span className="admin-availability available">Active</span>
                    </article>
                  ))}
                  {categories.length === 0 && (
                    <div className="admin-empty">No categories yet.</div>
                  )}
                </div>
              </section>
            </div>
          )}

          {tab === "tables" && (
            <div className="admin-workspace admin-two-column">
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span className="eyebrow">FLOOR MANAGEMENT</span>
                    <h4>Add a table</h4>
                  </div>
                </div>
                <form className="admin-form admin-single-column" onSubmit={handleTableSubmit}>
                  <label>
                    Table number *
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={tableForm.tableNumber}
                      onChange={(event) =>
                        setTableForm({ ...tableForm, tableNumber: event.target.value })
                      }
                      placeholder="9"
                    />
                  </label>
                  <label>
                    Table name
                    <input
                      maxLength={80}
                      value={tableForm.name}
                      onChange={(event) =>
                        setTableForm({ ...tableForm, name: event.target.value })
                      }
                      placeholder="e.g. Window table"
                    />
                  </label>
                  <label>
                    Seating capacity *
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={tableForm.capacity}
                      onChange={(event) =>
                        setTableForm({ ...tableForm, capacity: event.target.value })
                      }
                    />
                  </label>
                  <button
                    className="admin-button admin-button-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Add table"}
                  </button>
                </form>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span className="eyebrow">RESTAURANT FLOOR</span>
                    <h4>Tables <span className="admin-count">{tables.length}</span></h4>
                  </div>
                </div>
                <div className="admin-table-grid">
                  {tables.map((table) => (
                    <article className="admin-table-card" key={table._id}>
                      <span className="admin-table-icon">▦</span>
                      <strong>Table {table.tableNumber}</strong>
                      <span>{table.name || `${table.capacity} seats`}</span>
                      <small>{table.capacity} seats</small>
                      <span
                        className={
                          table.status === "available"
                            ? "admin-availability available"
                            : "admin-availability unavailable"
                        }
                      >
                        {table.status}
                      </span>
                    </article>
                  ))}
                  {tables.length === 0 && (
                    <div className="admin-empty">No tables found.</div>
                  )}
                </div>
              </section>
            </div>
          )}

          {tab === "operations" && (
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="eyebrow">OPERATIONAL OVERVIEW</span>
                  <h4>Order performance</h4>
                </div>
              </div>
              <div className="admin-operations-grid">
                {[
                  ["All orders", orders.length],
                  ["New", orders.filter((o) => o.status === "NEW").length],
                  ["Preparing", orders.filter((o) => o.status === "PREPARING").length],
                  ["Ready", orders.filter((o) => o.status === "READY").length],
                  ["Completed", completedOrders.length],
                  ["Cancelled", orders.filter((o) => o.status === "CANCELLED").length],
                  ["Paid completed sales", currency(paidSales)],
                ].map(([label, value]) => (
                  <article className="admin-operation-stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>
              <p className="admin-footnote">
                Sales include orders marked PAID and COMPLETED in the loaded order history.
                This is a lifetime loaded-history summary, not a daily report.
              </p>
            </section>
          )}
        </>
      )}
    </section>
  );
}

export default Admin;
