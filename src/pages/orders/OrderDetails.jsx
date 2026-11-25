
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getAdminOrder,
  updateAdminOrder,
  recordAdminOrderPayment,
  refundAdminOrder,
} from "../../services/api";
import "./OrderDetails.css";

const ORDER_STATUSES = [
  "new",
  "contacted",
  "awaiting_payment",
  "paid",
  "processing",
  "dispatched",
  "completed",
  "cancelled",
];

const FULFILMENT_STATUSES = ["not_ready", "ready", "delivered"];

const money = (value, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not provided";

const dateOnly = (value) =>
  value ? new Date(value).toLocaleDateString("en-NG") : "Not scheduled";

const readable = (value) =>
  value
    ? String(value).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

function Field({ label, children }) {
  return (
    <label className="order-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [edit, setEdit] = useState({});
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "bank_transfer",
    paymentReference: "",
    notes: "",
    paymentDate: new Date().toISOString().slice(0, 10),
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [refundForm, setRefundForm] = useState({
    refundMethod: "bank_transfer",
    refundReference: "",
    reason: "",
    refundDate: new Date().toISOString().slice(0, 10),
  });
  const [showRefundForm, setShowRefundForm] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAdminOrder(orderId);
      const data = result?.order ?? result?.data?.order;
      if (!data) throw new Error("The requested order could not be found.");
      setOrder(data);
      setEdit({
        status: data.status || "processing",
        fulfilmentStatus: data.fulfilment_status || "not_ready",
        customerName: data.customer_name || "",
        whatsappNumber: data.whatsapp_number || "",
        deliveryCity: data.delivery_city || "",
        deliveryAddress: data.delivery_address || "",
        deliveryNotes: data.delivery_notes || "",
        deliveryDate: data.delivery_date
          ? String(data.delivery_date).slice(0, 10)
          : "",
        internalNotes: data.internal_notes || "",
      });
    } catch (err) {
      setError(err.message || "Unable to load this order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const payments = order?.payments || [];
  const items = order?.items || [];
  const history = order?.history || [];
  const totalPaid = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  );
  const total = Number(order?.total_amount || 0);
  const balance = Math.max(total - totalPaid, 0);
  const isRefunded = order?.payment_status === "refunded";
  const whatsappLink = `https://wa.me/${digitsOnly(order?.whatsapp_number)}`;

  const saveChanges = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateAdminOrder(orderId, edit);
      setNotice("Order details updated successfully.");
      await loadOrder();
    } catch (err) {
      setError(err.message || "Could not update this order.");
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await recordAdminOrderPayment(orderId, {
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      setNotice("Payment recorded successfully.");
      setShowPaymentForm(false);
      setPaymentForm({
        amount: "",
        paymentMethod: "bank_transfer",
        paymentReference: "",
        notes: "",
        paymentDate: new Date().toISOString().slice(0, 10),
      });
      await loadOrder();
    } catch (err) {
      setError(err.message || "Could not record this payment.");
    } finally {
      setSaving(false);
    }
  };

  const submitRefund = async (event) => {
    event.preventDefault();
    const confirmed = window.confirm(
      `This will record a FULL refund of ${money(totalPaid, order.currency)} and mark the order as refunded. Continue?`
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await refundAdminOrder(orderId, refundForm);
      setNotice("Full refund recorded successfully.");
      setShowRefundForm(false);
      await loadOrder();
    } catch (err) {
      setError(err.message || "Could not record this refund.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="order-details-page"><p>Loading order…</p></div>;

  if (!order) {
    return (
      <div className="order-details-page">
        <Link to="/admin/orders" className="order-back-link">← Back to orders</Link>
        <p className="order-alert error">{error || "Order not found."}</p>
      </div>
    );
  }

  return (
    <main className="order-details-page">
      <Link to="/admin/orders" className="order-back-link">← Back to orders</Link>

      <header className="order-details-header">
        <div>
          <p className="order-eyebrow">Order management</p>
          <h1>{order.order_number || "Order details"}</h1>
          <p className="order-muted">Created {dateTime(order.created_at)}</p>
        </div>
        <div className="order-header-tags">
          <span className={`order-tag ${isRefunded ? "refunded" : ""}`}>
            {readable(order.payment_status)}
          </span>
          <span className="order-tag">{readable(order.status)}</span>
        </div>
      </header>

      {error && <div className="order-alert error">{error}</div>}
      {notice && <div className="order-alert success">{notice}</div>}

      <section className="order-summary-grid">
        <article className="order-panel">
          <p className="order-eyebrow">Order total</p>
          <strong>{money(total, order.currency)}</strong>
        </article>
        <article className="order-panel">
          <p className="order-eyebrow">Amount received</p>
          <strong>{money(totalPaid, order.currency)}</strong>
        </article>
        <article className="order-panel">
          <p className="order-eyebrow">Outstanding balance</p>
          <strong>{money(balance, order.currency)}</strong>
        </article>
      </section>

      <div className="order-details-columns">
        <div className="order-main-column">
          <section className="order-panel">
            <div className="order-section-heading">
              <h2>Items ordered</h2>
              <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
            </div>
            {items.length === 0 ? (
              <p className="order-muted">No items are listed on this order.</p>
            ) : (
              <div className="order-items-list">
                {items.map((item) => (
                  <div className="order-item" key={item.id}>
                    <div>
                      <strong>{item.product_name}</strong>
                      {item.variation_name && <p>{item.variation_name}</p>}
                      {item.selected_options && (
                        <p>{typeof item.selected_options === "string"
                          ? item.selected_options
                          : Object.entries(item.selected_options)
                              .map(([key, value]) => `${readable(key)}: ${value}`)
                              .join(" · ")}</p>
                      )}
                      <small>{item.quantity} × {money(item.unit_price, order.currency)}</small>
                    </div>
                    <strong>{money(item.line_total, order.currency)}</strong>
                  </div>
                ))}
              </div>
            )}
            <div className="order-total-line">
              <span>Order total</span>
              <strong>{money(total, order.currency)}</strong>
            </div>
          </section>

          <section className="order-panel">
            <div className="order-section-heading">
              <h2>Payments</h2>
              {!isRefunded && (
                <button className="order-button" onClick={() => setShowPaymentForm(!showPaymentForm)}>
                  {showPaymentForm ? "Close" : "Record payment"}
                </button>
              )}
            </div>

            {showPaymentForm && (
              <form className="order-form-grid" onSubmit={submitPayment}>
                <Field label="Amount received">
                  <input type="number" min="0.01" max={balance} step="0.01" required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                </Field>
                <Field label="Payment method">
                  <select value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="pos">POS</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Payment date">
                  <input type="date" required value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
                </Field>
                <Field label="Payment reference">
                  <input value={paymentForm.paymentReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })} />
                </Field>
                <Field label="Notes">
                  <input value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                </Field>
                <div className="order-form-actions">
                  <button className="order-button" disabled={saving || balance <= 0}>
                    {saving ? "Saving…" : "Save payment"}
                  </button>
                </div>
              </form>
            )}

            {payments.length === 0 ? (
              <p className="order-muted">No payments have been recorded.</p>
            ) : (
              <div className="order-table-wrap">
                <table className="order-table">
                  <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{dateTime(payment.payment_date)}</td>
                        <td>{readable(payment.payment_method)}</td>
                        <td>{payment.payment_reference || "—"}</td>
                        <td>{money(payment.amount, order.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="order-panel">
            <div className="order-section-heading">
              <h2>Order activity</h2>
            </div>
            {history.length === 0 ? (
              <p className="order-muted">No activity has been recorded.</p>
            ) : (
              <ol className="order-timeline">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <strong>{readable(entry.event_type)}</strong>
                    <p>{entry.description || "Order updated"}</p>
                    <small>{dateTime(entry.created_at)}</small>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="order-side-column">
          <section className="order-panel">
            <h2>Customer</h2>
            <p className="order-customer-name">{order.customer_name}</p>
            <p>{order.whatsapp_number}</p>
            {digitsOnly(order.whatsapp_number) && (
              <a className="order-text-link" href={whatsappLink} target="_blank" rel="noreferrer">
                Open WhatsApp conversation ↗
              </a>
            )}
            <div className="order-meta-list">
              <div><span>Source</span><strong>{readable(order.order_source)}</strong></div>
              <div><span>Channel</span><strong>{readable(order.order_channel)}</strong></div>
            </div>
          </section>

          <section className="order-panel">
            <h2>Update order</h2>
            <form className="order-edit-form" onSubmit={saveChanges}>
              <Field label="Order status">
                <select value={edit.status || ""} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{readable(status)}</option>)}
                </select>
              </Field>
              <Field label="Fulfilment status">
                <select value={edit.fulfilmentStatus || ""} onChange={(e) => setEdit({ ...edit, fulfilmentStatus: e.target.value })}>
                  {FULFILMENT_STATUSES.map((status) => <option key={status} value={status}>{readable(status)}</option>)}
                </select>
              </Field>
              <Field label="Customer name">
                <input value={edit.customerName || ""} onChange={(e) => setEdit({ ...edit, customerName: e.target.value })} required />
              </Field>
              <Field label="WhatsApp number">
                <input value={edit.whatsappNumber || ""} onChange={(e) => setEdit({ ...edit, whatsappNumber: e.target.value })} required />
              </Field>
              <Field label="Delivery city">
                <input value={edit.deliveryCity || ""} onChange={(e) => setEdit({ ...edit, deliveryCity: e.target.value })} />
              </Field>
              <Field label="Delivery address">
                <textarea rows="3" value={edit.deliveryAddress || ""} onChange={(e) => setEdit({ ...edit, deliveryAddress: e.target.value })} />
              </Field>
              <Field label="Delivery date">
                <input type="date" value={edit.deliveryDate || ""} onChange={(e) => setEdit({ ...edit, deliveryDate: e.target.value })} />
              </Field>
              <Field label="Delivery notes">
                <textarea rows="2" value={edit.deliveryNotes || ""} onChange={(e) => setEdit({ ...edit, deliveryNotes: e.target.value })} />
              </Field>
              <Field label="Internal notes">
                <textarea rows="3" value={edit.internalNotes || ""} onChange={(e) => setEdit({ ...edit, internalNotes: e.target.value })} />
              </Field>
              <button className="order-button order-button-full" disabled={saving}>
                {saving ? "Saving…" : "Save order changes"}
              </button>
            </form>
          </section>

          <section className="order-panel">
            <h2>Refund</h2>
            {isRefunded ? (
              <div className="order-refund-record">
                <strong>Refund recorded</strong>
                {order.refund && (
                  <>
                    <p>{money(order.refund.amount, order.currency)}</p>
                    <small>{readable(order.refund.refund_method)} · {dateTime(order.refund.refund_date)}</small>
                    {order.refund.reason && <p>{order.refund.reason}</p>}
                  </>
                )}
              </div>
            ) : (
              <>
                <p className="order-muted">
                  This action records a full refund of all payments received and changes the payment status to Refunded.
                </p>
                <button className="order-button order-button-danger" onClick={() => setShowRefundForm(!showRefundForm)} disabled={totalPaid <= 0}>
                  {showRefundForm ? "Close refund form" : "Record full refund"}
                </button>
                {showRefundForm && (
                  <form className="order-edit-form order-refund-form" onSubmit={submitRefund}>
                    <p><strong>Refund amount: {money(totalPaid, order.currency)}</strong></p>
                    <Field label="Refund method">
                      <select value={refundForm.refundMethod} onChange={(e) => setRefundForm({ ...refundForm, refundMethod: e.target.value })}>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card reversal</option>
                        <option value="pos">POS</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Refund date">
                      <input type="date" required value={refundForm.refundDate} onChange={(e) => setRefundForm({ ...refundForm, refundDate: e.target.value })} />
                    </Field>
                    <Field label="Refund reference">
                      <input value={refundForm.refundReference} onChange={(e) => setRefundForm({ ...refundForm, refundReference: e.target.value })} />
                    </Field>
                    <Field label="Reason">
                      <textarea rows="3" value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} />
                    </Field>
                    <button className="order-button order-button-danger order-button-full" disabled={saving}>
                      {saving ? "Recording…" : "Confirm full refund"}
                    </button>
                  </form>
                )}
              </>
            )}
          </section>

          <section className="order-panel">
            <h2>Delivery overview</h2>
            <div className="order-meta-list">
              <div><span>City</span><strong>{order.delivery_city || "Not provided"}</strong></div>
              <div><span>Delivery date</span><strong>{dateOnly(order.delivery_date)}</strong></div>
              <div><span>Fulfilment</span><strong>{readable(order.fulfilment_status)}</strong></div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default OrderDetails;
