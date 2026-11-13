
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCategoryBySlug, getProductsByCategory } from '../data/products.js'
import ProductCard from '../components/shop/ProductCard.jsx'
import '../styles/shop.css'

function Category() {
  const { categorySlug } = useParams()

  const category = getCategoryBySlug(categorySlug)
  const categoryProducts = getProductsByCategory(categorySlug)

  const productRows = useMemo(() => {
    const rows = []

    for (let i = 0; i < categoryProducts.length; i += 6) {
      rows.push(categoryProducts.slice(i, i + 6))
    }

    return rows
  }, [categoryProducts])

  if (!category) {
    return (
      <main className="shop-page">
        <div className="shop-empty-state">
          <h2>Collection not found</h2>
          <p>We couldn't find the collection you're looking for.</p>
          <Link to="/shop">Return to shop</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="shop-page">
      <nav className="shop-breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        <span>/</span>
        <span>{category.name}</span>
      </nav>

      <section className="category-intro">
        <p className="shop-eyebrow">EXPLORE THE COLLECTION</p>
        <h1>{category.name}</h1>
        <p>{category.description}</p>
      </section>

      <section className="shop-products">
        <div className="shop-section-heading">
          <span>
            {categoryProducts.length}{' '}
            {categoryProducts.length === 1 ? 'product' : 'products'}
          </span>
        </div>

        {categoryProducts.length > 0 ? (
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
            <h3>Collection coming soon</h3>
            <p>
              We're preparing this collection.
              Beautiful arrangements will be available here soon.
            </p>
            <Link to="/shop" className="category-back-link">
              Explore all collections
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}

export default Category
