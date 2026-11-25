
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getPublicCategories,
  getPublicProducts,
} from '../services/api.js'
import ProductCard from '../components/shop/ProductCard.jsx'
import '../styles/shop.css'

function Shop() {
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadCatalogue() {
      try {
        setIsLoading(true)
        setError('')

        const [categoriesData, productsData] = await Promise.all([
          getPublicCategories(),
          getPublicProducts(),
        ])

        if (!isMounted) return

        setCategories(categoriesData.categories || [])
        setProducts(productsData.products || [])
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Unable to load our collection.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCatalogue()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    if (!searchTerm) return products

    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm)
    )
  }, [products, search])

  const productRows = useMemo(() => {
    const rows = []

    for (let i = 0; i < filteredProducts.length; i += 6) {
      rows.push(filteredProducts.slice(i, i + 6))
    }

    return rows
  }, [filteredProducts])

  return (
    <main className="shop-page">
      <section className="shop-controls">
        <div className="shop-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search floral arrangements..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search products"
          />
        </div>

        <nav className="shop-categories" aria-label="Product categories">
          <Link to="/shop" className="active">
            All
          </Link>

          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/shop/${category.slug}`}
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </section>

      <section className="shop-products">
        <div className="shop-section-heading">
          <div>
            <p className="shop-eyebrow">THE COLLECTION</p>
            <h2>Our arrangements</h2>
          </div>

          {!isLoading && !error && (
            <span>
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'product' : 'products'}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="shop-empty-state">
            <p>Loading our collection...</p>
          </div>
        ) : error ? (
          <div className="shop-empty-state">
            <h3>Unable to load our collection</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="shop-product-rows">
            {productRows.map((row, index) => (
              <div className="shop-product-row" key={index}>
                {row.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="shop-empty-state">
            <span className="shop-empty-icon">✿</span>
            <h3>
              {search
                ? 'No matching arrangements'
                : 'Our collection is taking shape'}
            </h3>
            <p>
              {search
                ? 'Try another search term.'
                : 'Beautiful floral arrangements will appear here once our product collection is ready.'}
            </p>

            {search && (
              <button onClick={() => setSearch('')}>
                Clear search
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default Shop
