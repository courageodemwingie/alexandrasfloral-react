
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminOrders, getAdminProducts } from '../../services/api.js'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    published: 0,
    drafts: 0,
    orders: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [productResponse, publishedResponse, draftResponse, orderResponse] =
          await Promise.all([
            getAdminProducts({ limit: 1 }),
            getAdminProducts({ status: 'published', limit: 1 }),
            getAdminProducts({ status: 'draft', limit: 1 }),
            getAdminOrders({ limit: 5 }),
          ])

        setStats({
          products: productResponse.pagination?.total ?? 0,
          published: publishedResponse.pagination?.total ?? 0,
          drafts: draftResponse.pagination?.total ?? 0,
          orders: orderResponse.pagination?.total ?? 0,
        })

        setRecentOrders(orderResponse.orders || [])
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
    { label: 'Draft Products', value: stats.drafts },
    { label: 'Total Orders', value: stats.orders },
  ]

  return (
    <div className="admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <span className="admin-section-eyebrow">OVERVIEW</span>
          <h1>Dashboard</h1>
        
        </div>
      </div>

      {error && (
        <div className="admin-dashboard-error" role="alert">
          {error}
        </div>
      )}

      <div className="admin-stat-grid">
        {cards.map((card) => (
          <div className="admin-stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{loading ? '—' : card.value}</strong>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-actions">
        <div className="admin-dashboard-section-heading">
          <div>
            <h2>Quick actions</h2>
            <p>Manage your store from here.</p>
          </div>
        </div>

        <div className="admin-quick-actions">
          <Link to="/admin/products/new" className="admin-quick-action">
            <span className="admin-quick-action-icon">＋</span>
            <div>
              <strong>Add a product</strong>
              <span>Create a new product listing</span>
            </div>
            <span className="admin-quick-arrow">→</span>
          </Link>

          <Link to="/admin/orders" className="admin-quick-action">
            <span className="admin-quick-action-icon">▤</span>
            <div>
              <strong>Manage orders</strong>
              <span>View and update customer orders</span>
            </div>
            <span className="admin-quick-arrow">→</span>
          </Link>
        </div>
      </div>

      <div className="admin-recent-orders">
        <div className="admin-dashboard-section-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Your latest customer orders.</p>
          </div>
          <Link to="/admin/orders">View all orders →</Link>
        </div>

        {loading ? (
          <p className="admin-empty-state">Loading orders...</p>
        ) : recentOrders.length === 0 ? (
          <div className="admin-empty-state">
            <span>▤</span>
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
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{order.customer_name || 'Awaiting details'}</td>
                    <td>
                      <span className="admin-order-status">
                        {order.status?.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {order.total_amount == null
                        ? '—'
                        : `₦${Number(order.total_amount).toLocaleString('en-NG')}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
