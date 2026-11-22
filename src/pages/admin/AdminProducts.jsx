
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminProducts } from '../../services/api.js'
import './AdminProducts.css'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
]

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadProducts() {
    setLoading(true)
    setError('')

    try {
      const response = await getAdminProducts({
        search: search.trim(),
        status,
        limit: 20,
        offset: 0,
      })

      setProducts(response.products || [])
      setPagination(response.pagination || {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      })
    } catch (err) {
      setError(err.message || 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [status])

  function handleSearch(event) {
    event.preventDefault()
    loadProducts()
  }

  function formatPrice(value) {
    if (value == null || value === '') return 'Not set'

    return `₦${Number(value).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  function getStatus(product) {
    return product.publication_status || product.publicationStatus || 'draft'
  }

  return (
    <div className="admin-products">
      <div className="admin-page-heading admin-products-heading">
        <div>
          <span className="admin-section-eyebrow">CATALOGUE</span>
          <h1>Products</h1>
          <p>Manage your floral products and catalogue.</p>
        </div>

        <Link to="/admin/products/new" className="admin-primary-button">
          + Add product
        </Link>
      </div>

      <div className="admin-products-toolbar">
        <form className="admin-product-search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter products by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="admin-dashboard-error" role="alert">
          {error}
        </div>
      )}

      <div className="admin-products-summary">
        <span>
          {loading ? 'Loading products...' : `${pagination.total} products`}
        </span>
        <button
          type="button"
          className="admin-refresh-button"
          onClick={loadProducts}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="admin-products-table-wrapper">
        {loading ? (
          <div className="admin-products-empty">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="admin-products-empty">
            <span className="admin-products-empty-icon">✿</span>
            <h3>No products found</h3>
            <p>
              Your product catalogue is currently empty. Add your first
              product to get started.
            </p>
            <Link
              to="/admin/products/new"
              className="admin-primary-button"
            >
              Add your first product
            </Link>
          </div>
        ) : (
          <table className="admin-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Base price</th>
                <th>Pricing</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const productStatus = getStatus(product)

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-name">
                        {product.main_image_key ? (
                          <div className="admin-product-thumbnail">
                            <span>Image</span>
                          </div>
                        ) : (
                          <div className="admin-product-thumbnail admin-product-no-image">
                            ✿
                          </div>
                        )}

                        <div>
                          <strong>{product.name}</strong>
                          <span>{product.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {product.category_name ||
                        product.category?.name ||
                        '—'}
                    </td>

                    <td>{formatPrice(product.base_price ?? product.basePrice)}</td>

                    <td>
                      {(product.has_variable_pricing ??
                        product.hasVariablePricing)
                        ? 'Variation prices'
                        : 'Fixed price'}
                    </td>

                    <td>
                      <span className={`admin-product-status ${productStatus}`}>
                        {productStatus}
                      </span>
                    </td>

                    <td>
                      <Link
                        to={`/admin/products/${product.id}`}
                        className="admin-product-edit-link"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-products-pagination">
        Showing {products.length} of {pagination.total} products
      </div>
    </div>
  )
}
