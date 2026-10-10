import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import OrderTaker from "./pages/OrderTaker/OrderTaker";
import Kitchen from "./pages/Kitchen/Kitchen";
import Cashier from "./pages/Cashier/Cashier";
import Admin from "./pages/Admin/Admin";
import "./index.css";
import { getOrders } from "./services/api";

const navigation = [
  { path: "/order-taker", label: "Order Taker", icon: "＋" },
  { path: "/kitchen", label: "Kitchen", icon: "▣" },
  { path: "/cashier", label: "Cashier", icon: "▤" },
  { path: "/admin", label: "Management", icon: "⚙" },
];

function AppShell() {

  const [newOrderCount, setNewOrderCount] = useState(0);
  const [cashierNotificationCount, setCashierNotificationCount] = useState(0);

  const refreshNotifications = useCallback(async () => {
    try {
      const orders = await getOrders();
      setNewOrderCount(
        orders.filter((order) => order.status === "NEW").length
      );
      setCashierNotificationCount(
        orders.filter(
          (order) => order.status === "READY" && order.paymentStatus === "UNPAID"
        ).length
      );
    } catch (error) {
      console.error("Unable to refresh kitchen notifications:", error);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(refreshNotifications, 0);
    const timer = setInterval(refreshNotifications, 5000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, [refreshNotifications]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <h1>RestoFlow</h1>
            <span>Restaurant Operations</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="section-label">WORKSPACE</span>

          <nav className="navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.path === "/kitchen" && newOrderCount > 0 && (
                  <span className="nav-notification-badge">
                    {newOrderCount > 99 ? "99+" : newOrderCount}
                  </span>
                )}
                {item.path === "/cashier" && cashierNotificationCount > 0 && (
                  <span className="nav-notification-badge">
                    {cashierNotificationCount > 99 ? "99+" : cashierNotificationCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>System Online</strong>
              <span>All services operational</span>
            </div>
          </div>

          <div className="version">
            RestoFlow <span>v1.0</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="topbar-kicker">RESTAURANT OPERATIONS</span>
            <h2>Control Center</h2>
          </div>

          <div className="topbar-right">
            <div className="live-indicator">
              <span className="status-dot" />
              Live
            </div>

            <div className="restaurant-profile">
              <div className="profile-avatar">HZ</div>
              <div>
                <strong>Restaurant Staff</strong>
                <span>Operations</span>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/order-taker" replace />} />
            <Route path="/order-taker" element={<OrderTaker />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/cashier" element={<Cashier />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
