
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminOrders } from "../../services/api.js";
import "./Orders.css";

const FILTERS = {
  status: [
    ["", "All order statuses"],
    ["new", "New"],
    ["contacted", "Contacted"],
    ["awaiting_payment", "Awaiting payment"],
    ["paid", "Paid"],
    ["processing", "Processing"],
    ["dispatched", "Dispatched"],
    ["completed", "Completed"],
    ["cancelled", "Cancelled"],
  ],
  source: [
    ["", "All sales channels"],
    ["website", "Website"],
    ["whatsapp", "WhatsApp"],
    ["instagram", "Instagram"],
    ["x", "X"],
    ["in_store", "In-store"],
  ],
  paymentStatus: [
    ["", "All payment statuses"],
    ["deposit_paid", "Deposit paid"],
    ["fully_paid", "Fully paid"],
    ["refunded", "Refunded"],
  ],
  fulfilmentStatus: [
    ["", "All fulfilment statuses"],
    ["not_ready", "Not ready"],
    ["ready", "Ready"],
    ["delivered", "Delivered"],
  ],
};

const formatCurrency = (amount) =>
  amount == null
    ? "—"
    : `₦${Number(amount).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const formatLabel = (value) =>
  value
    ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
    : "—";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="orders-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function OrderStatus({ status }) {
  return (
    <span className={`orders-status status-${status || "unknown"}`}>
      {formatLabel(status)}
    </span>
  );
}

function MobileOrderCard({ order }) {
  return (
    <Link
      to={`/admin/orders/${order.id}`}
      className="mobile-order-card"
      aria-label={`View order ${order.order_number || ""} for ${
        order.customer_name || "customer"
      }`}
    >
      <div className="mobile-order-card-top">
        <strong className="mobile-order-number">
          {order.order_number || "Order"}
        </strong>
        <OrderStatus status={order.status} />
      </div>

      <div className="mobile-order-customer">
        <strong>{order.customer_name || "Customer name unavailable"}</strong>
        <span>{order.delivery_city || "Delivery city not added"}</span>
      </div>

      <div className="mobile-order-card-bottom">
        <div>
          <span className="mobile-order-label">Order total</span>
          <strong>{formatCurrency(order.total_amount)}</strong>
        </div>

        <div className="mobile-order-date">
          <span className="mobile-order-label">Order date</span>
          <strong>{formatDate(order.created_at)}</strong>
        </div>

        <span className="mobile-order-arrow" aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  const [filters, setFilters] = useState({
    status: "",
    source: "",
    paymentStatus: "",
    fulfilmentStatus: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (nextOffset = 0) => {
    setLoading(true);
    setError("");

    try {
      const params = {
        ...filters,
        limit: 20,
        offset: nextOffset,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const result = await getAdminOrders(params);

      setOrders(result.orders || []);
      setPagination(
        result.pagination || {
          total: 0,
          limit: 20,
          offset: nextOffset,
          hasMore: false,
        }
      );
    } catch (err) {
      setError(err.message || "Unable to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadOrders(0);
  }, [loadOrders]);

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function clearFilters() {
    setFilters({
      status: "",
      source: "",
      paymentStatus: "",
      fulfilmentStatus: "",
    });
  }

  const firstOrder = pagination.total ? pagination.offset + 1 : 0;

  const lastOrder = Math.min(
    pagination.offset + orders.length,
    pagination.total
  );

  return (
    <div className="orders-page">
      <header className="orders-page-heading">
        <div>
          <span className="orders-eyebrow">ORDER MANAGEMENT</span>
          <h1>Orders</h1>
          <p>
            Manage customer orders, payments and fulfilment across
            all your sales channels.
          </p>
        </div>

        <Link
          to="/admin/orders/new"
          className="orders-create-button"
        >
          <span aria-hidden="true">+</span>
          Create Order
        </Link>
      </header>

      <section className="orders-summary">
        <article className="orders-summary-card">
          <span>Total orders</span>
          <strong>{loading ? "—" : pagination.total}</strong>
          <small>Matching your current filters</small>
        </article>

        <article className="orders-summary-card">
          <span>Orders on this page</span>
          <strong>{loading ? "—" : orders.length}</strong>
          <small>Currently displayed</small>
        </article>
      </section>

      <section className="orders-panel">
        <div className="orders-panel-heading">
          <div>
            <h2>All orders</h2>
            <p>View and manage your recorded customer orders.</p>
          </div>

          <button
            type="button"
            className="orders-refresh-button"
            onClick={() => loadOrders(pagination.offset)}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        <div className="orders-filters">
          <FilterSelect
            label="Order status"
            value={filters.status}
            options={FILTERS.status}
            onChange={(value) => updateFilter("status", value)}
          />

          <FilterSelect
            label="Sales channel"
            value={filters.source}
            options={FILTERS.source}
            onChange={(value) => updateFilter("source", value)}
          />

          <FilterSelect
            label="Payment"
            value={filters.paymentStatus}
            options={FILTERS.paymentStatus}
            onChange={(value) => updateFilter("paymentStatus", value)}
          />

          <FilterSelect
            label="Fulfilment"
            value={filters.fulfilmentStatus}
            options={FILTERS.fulfilmentStatus}
            onChange={(value) =>
              updateFilter("fulfilmentStatus", value)
            }
          />

          <button
            type="button"
            className="orders-clear-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

        {error && (
          <div className="orders-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadOrders(pagination.offset)}
            >
              Try again
            </button>
          </div>
        )}

        <div className="mobile-orders-list">
          {loading ? (
            <div className="mobile-orders-message">Loading orders...</div>
          ) : error ? (
            <div className="mobile-orders-message">
              Orders could not be loaded.
            </div>
          ) : orders.length === 0 ? (
            <div className="mobile-orders-message">
              <strong>No orders found</strong>
              <span>Orders matching your filters will appear here.</span>
            </div>
          ) : (
            orders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))
          )}
        </div>

        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Order date</th>
                <th>Channel</th>
                <th>Order status</th>
                <th>Payment</th>
                <th>Fulfilment</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="orders-table-message">
                    Loading orders...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="10" className="orders-table-message">
                    Orders could not be loaded.
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="orders-table-message">
                    <strong>No orders found</strong>
                    <span>
                      Orders matching your filters will appear here.
                    </span>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong className="orders-number">
                        {order.order_number}
                      </strong>
                    </td>

                    <td>
                      <div className="orders-customer">
                        <strong>{order.customer_name || "—"}</strong>
                        <span>{order.whatsapp_number || "—"}</span>
                      </div>
                    </td>

                    <td>{formatDate(order.created_at)}</td>

                    <td>
                      <span className="orders-channel">
                        {formatLabel(order.order_source)}
                      </span>
                    </td>

                    <td>
                      <OrderStatus status={order.status} />
                    </td>

                    <td>
                      <span
                        className={`orders-status payment-${order.payment_status}`}
                      >
                        {formatLabel(order.payment_status)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`orders-status fulfilment-${order.fulfilment_status}`}
                      >
                        {formatLabel(order.fulfilment_status)}
                      </span>
                    </td>

                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>{formatCurrency(order.amount_paid)}</td>

                    <td>
                      <Link
                        className="orders-view-link"
                        to={`/admin/orders/${order.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="orders-pagination">
          <span>
            Showing {firstOrder}–{lastOrder} of {pagination.total} orders
          </span>

          <div className="orders-pagination-actions">
            <button
              type="button"
              disabled={loading || pagination.offset === 0}
              onClick={() =>
                loadOrders(Math.max(0, pagination.offset - pagination.limit))
              }
            >
              Previous
            </button>

            <button
              type="button"
              disabled={loading || !pagination.hasMore}
              onClick={() =>
                loadOrders(pagination.offset + pagination.limit)
              }
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
