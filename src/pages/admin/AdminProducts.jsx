import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminProducts,
  getProductImageUrl,
  updateAdminProduct,
} from "../../services/api";

import "./AdminProducts.css";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];
const CATEGORY_OPTIONS = [
  { label: "All categories", value: "" },
  { label: "Bouquets", value: "7d3db379-43aa-42dc-8d71-01a454a1d808" },
  {
    label: "Flower Arrangements",
    value: "95f94154-7f41-451c-aeeb-20fc6b1f184b",
  },
  { label: "Plants", value: "19283924-19bc-4b57-acc7-2feed768390f" },
  { label: "Wreaths", value: "99d33b99-c9db-4fbd-8162-0d0273e42983" },
  { label: "Gifts", value: "320a636d-0ac9-421f-a38a-e612b147307b" },
];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingProductId, setUpdatingProductId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const result = await getAdminProducts({
          search: appliedSearch,
          status,
          categoryId,
          limit: 20,
          offset,
        });

        if (cancelled) return;

        setProducts(result.products || []);

        setPagination(
          result.pagination || {
            total: 0,
            limit: PAGE_SIZE,
            offset,
            hasMore: false,
          },
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load products.");
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [appliedSearch, status, categoryId, offset, refreshKey]);

  function handleSearch(event) {
    event.preventDefault();
    setOffset(0);
    setAppliedSearch(search.trim());
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setOffset(0);
  }

  function handleRefresh() {
    setRefreshKey((current) => current + 1);
  }
  async function handlePublicationToggle(product) {
    const currentStatus =
      product.publication_status || product.publicationStatus || "draft";

    const nextStatus = currentStatus === "published" ? "draft" : "published";

    setUpdatingProductId(product.id);
    setError("");

    try {
      await updateAdminProduct(product.id, {
        publicationStatus: nextStatus,
      });

      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(
        err.message ||
          `Unable to ${nextStatus === "draft" ? "unpublish" : "publish"} this product.`,
      );
    } finally {
      setUpdatingProductId(null);
    }
  }
  function formatPrice(value) {
    if (value == null || value === "") return "Not set";

    return `₦${Number(value).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function getStatus(product) {
    return product.publication_status || product.publicationStatus || "draft";
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / PAGE_SIZE));

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const startItem = pagination.total === 0 ? 0 : offset + 1;

  const endItem = Math.min(offset + products.length, pagination.total);

  function goToPreviousPage() {
    setOffset((current) => Math.max(0, current - PAGE_SIZE));
  }

  function goToNextPage() {
    if (pagination.hasMore) {
      setOffset((current) => current + PAGE_SIZE);
    }
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
          onChange={handleStatusChange}
          aria-label="Filter products by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setOffset(0);
          }}
          aria-label="Filter by category"
        >
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
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
          {loading ? "Loading products..." : `${pagination.total} products`}
        </span>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={handleRefresh}
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
              {appliedSearch || status || categoryId
                ? "Try changing your search or status filter."
                : "Your product catalogue is currently empty. Add your first product to get started."}
            </p>

            {!appliedSearch && !status && (
              <Link to="/admin/products/new" className="admin-primary-button">
                Add your first product
              </Link>
            )}
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
                const productStatus = getStatus(product);

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-name">
                        <div className="admin-product-thumbnail">
                          {product.main_image_key ? (
                            <img
                              src={getProductImageUrl(product.main_image_key)}
                              alt={product.name}
                            />
                          ) : (
                            <span>No image</span>
                          )}
                        </div>

                        <div>
                          <strong>{product.name}</strong>
                          <span>{product.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {product.category_name || product.category?.name || "—"}
                    </td>

                    <td>
                      {formatPrice(product.base_price ?? product.basePrice)}
                    </td>

                    <td>
                      {(product.has_variable_pricing ??
                      product.hasVariablePricing)
                        ? "Variation prices"
                        : "Fixed price"}
                    </td>

                    <td>
                      <span className={`admin-product-status ${productStatus}`}>
                        {productStatus}
                      </span>
                    </td>

                    <td>
                      <div className="admin-product-actions">
                        <Link
                          to={`/admin/products/${product.id}`}
                          className="admin-product-edit-link"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          className={
                            productStatus === "published"
                              ? "admin-product-unpublish-button"
                              : "admin-product-publish-button"
                          }
                          onClick={() => handlePublicationToggle(product)}
                          disabled={updatingProductId === product.id}
                        >
                          {updatingProductId === product.id
                            ? "Updating..."
                            : productStatus === "published"
                              ? "Unpublish"
                              : "Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-products-pagination">
        <span>
          Showing {startItem}–{endItem} of {pagination.total} products
        </span>

        <div className="admin-pagination-controls">
          <button
            type="button"
            onClick={goToPreviousPage}
            disabled={loading || offset === 0}
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={goToNextPage}
            disabled={loading || !pagination.hasMore}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
