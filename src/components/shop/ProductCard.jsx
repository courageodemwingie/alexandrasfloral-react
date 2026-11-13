
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ProductCard.css'

function ProductCard({ product }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const variations = product.variations || []
  const firstVariation = variations[0]

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(price)

  const prices = variations.map((variation) => variation.price)
  const lowestPrice = prices.length ? Math.min(...prices) : 0
  const highestPrice = prices.length ? Math.max(...prices) : 0

  const priceDisplay =
    lowestPrice === highestPrice
      ? formatPrice(lowestPrice)
      : `From ${formatPrice(lowestPrice)}`

  return (
    <article className="product-card">
      <Link
        to={`/product/${product.slug}`}
        className="product-card-image"
      >
        {firstVariation?.image ? (
          <img
            src={firstVariation.image}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="product-image-placeholder">
            <span>✿</span>
          </div>
        )}

        {product.featured && (
          <span className="product-featured-label">
            Featured
          </span>
        )}
      </Link>

      <div className="product-card-info">
        <div>
          <h3>
            <Link to={`/product/${product.slug}`}>
              {product.name}
            </Link>
          </h3>

          <p className="product-card-price">
            {priceDisplay}
          </p>
        </div>

        <button
          type="button"
          className="product-variation-toggle"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          Variations ({variations.length})
        </button>
      </div>

      {isExpanded && (
        <div
          className="product-variation-backdrop"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="product-variation-overlay"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="product-variation-overlay-heading">
              <span>Choose a variation</span>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label="Close variations"
              >
                ×
              </button>
            </div>

            <div className="product-variations-scroll">
              {variations.map((variation) => (
                <Link
                  key={variation.id}
                  to={`/product/${product.slug}?variation=${variation.id}`}
                  className="product-variation-option"
                >
                  <div className="product-variation-image">
                    <img
                      src={variation.image}
                      alt={variation.name}
                      loading="lazy"
                    />
                  </div>

                  <span className="product-variation-name">
                    {variation.name}
                  </span>

                  <span className="product-variation-price">
                    {formatPrice(variation.price)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export default ProductCard
