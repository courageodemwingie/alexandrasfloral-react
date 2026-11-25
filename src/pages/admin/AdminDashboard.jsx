
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminOrders, getAdminProducts } from '../../services/api.js'
import './AdminDashboard.css'

const formatCurrency = (amount) =>
  amount == null
    ? '—'
    : `₦${Number(amount).toLocaleString('en-NG')}`

const formatStatus = (status) =>
  status
    ? status.replaceAll('_', ' ')
    : '—'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    published: 0,
    orders: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [products, published, orders] = await Promise.all([
          getAdminProducts({ limit: 1 }),
          getAdminProducts({ status: 'published', limit: 1 }),
          getAdminOrders({ limit: 5 }),
        ])

        setStats({
          products: products.pagination?.total ?? 0,
          published: published.pagination?.total ?? 0,
          orders: orders.pagination?.total ?? 0,
        })

        setRecentOrders(orders.orders || [])
      } catch (err) {
        setError(err.message || 'Unable to load dashboard information.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const cards = [
    { label: 'Total Products', value: stats.products },
    { label: 'Published Products', value: stats.published },
    { label: 'Total Orders', value: stats.orders },
    { label: 'Total Sales', value: '—', note: 'Payment analytics pending' },
  ]

  return (
    <div className="admin-dashboard">
      <header className="admin-page-heading">
        <div>
          <span className="admin-section-eyebrow">OVERVIEW</span>
          <h1>Dashboard</h1>
          <p>Here’s what’s happening at Alexandra’s Floral.</p>
        </div>
      </header>

      {error && (
        <div className="admin-dashboard-error" role="alert">
          {error}
        </div>
      )}

      <section className="admin-stat-grid" aria-label="Store overview">
        {cards.map((card) => (
          <article className="admin-stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{loading ? '—' : card.value}</strong>
            {card.note && <small>{card.note}</small>}
          </article>
        ))}
      </section>

      <section className="admin-dashboard-panel sales-panel">
        <div className="admin-dashboard-section-heading">
          <div>
            <h2>Sales Overview</h2>
            <p>Monitor revenue and sales performance.</p>
          </div>
        </div>
        <div className="admin-analytics-empty">
          <span className="admin-analytics-icon">₦</span>
          <strong>Sales analytics are not connected yet</strong>
          <p>
            This section will show your sales trend once payment tracking
            is connected to the dashboard.
          </p>
        </div>
      </section>

      <section className="admin-dashboard-panel">
        <div className="admin-dashboard-section-heading">
          <div>
            <h2>Recent Orders</h2>
            <p>Your latest customer orders.</p>
          </div>
          <Link to="/admin/orders">View all orders →</Link>
        </div>

        {loading ? (
          <p className="admin-empty-state">Loading orders...</p>
        ) : recentOrders.length === 0 ? (
          <div className="admin-empty-state">
            <strong>No orders yet</strong>
            <p>New customer orders will appear here.</p>
          </div>
        ) : (
          <div className="admin-dashboard-table-wrapper">
            <table className="admin-dashboard-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>City</th>
                  <th>Source</th>
                  <th>Current Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.order_number}</strong>
                    </td>
                    <td>{order.customer_name || order.whatsapp_number || '—'}</td>
                    <td>{order.delivery_city || '—'}</td>
                    <td>{formatStatus(order.order_source)}</td>
                    <td>
                      <span className="admin-order-status">
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td>{formatCurrency(order.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-dashboard-bottom-grid">
        <section className="admin-dashboard-panel">
          <div className="admin-dashboard-section-heading">
            <div>
              <h2>Sales by Location</h2>
              <p>Revenue across your service locations.</p>
            </div>
          </div>
          <div className="admin-analytics-empty compact">
            <strong>Location analytics pending</strong>
            <p>Ibadan, Lagos and Abuja will appear here.</p>
          </div>
        </section>

        <section className="admin-dashboard-panel">
          <div className="admin-dashboard-section-heading">
            <div>
              <h2>Sales by Order Source</h2>
              <p>Where your orders come from.</p>
            </div>
          </div>
          <div className="admin-analytics-empty compact">
            <strong>Source analytics pending</strong>
            <p>Website, WhatsApp, Instagram, X and In-store.</p>
          </div>
        </section>
      </div>

      <section className="admin-dashboard-panel fulfilment-panel">
        <div className="admin-dashboard-section-heading">
          <div>
            <h2>Fulfilment Summary</h2>
            <p>Keep track of orders as they move towards delivery.</p>
          </div>
          <Link to="/admin/orders">Manage orders →</Link>
        </div>
        <div className="admin-fulfilment-grid">
          {['Not Ready', 'Ready', 'Delivered'].map((status) => (
            <div className="admin-fulfilment-item" key={status}>
              <span>{status}</span>
              <strong>—</strong>
            </div>
          ))}
        </div>
        <p className="admin-analytics-footnote">
          Fulfilment counts will be available when the agreed fulfilment
          statuses are connected to the order system.
        </p>
      </section>
    </div>
  )
}
