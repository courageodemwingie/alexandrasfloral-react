
import { Link } from 'react-router-dom'
import { getProductImageUrl } from '../../services/api.js'
import './ProductCard.css'

function ProductCard({ product, badgeLabel }) {
  const variations = product.variations || []
  const firstVariation = variations[0]
  const hasVariablePricing = product.has_variable_pricing === true

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(Number(price) || 0)

  const prices = hasVariablePricing
    ? variations
        .map((variation) => Number(variation.price))
        .filter(Number.isFinite)
    : [Number(product.base_price)].filter(Number.isFinite)

  const lowestPrice = prices.length ? Math.min(...prices) : 0
  const highestPrice = prices.length ? Math.max(...prices) : 0

  const priceDisplay =
    lowestPrice === highestPrice
      ? formatPrice(lowestPrice)
      : `From ${formatPrice(lowestPrice)}`

  const mainImageKey =
    product.main_image_key || firstVariation?.image_key

  const mainImageUrl = getProductImageUrl(mainImageKey)

  return (
    <article className="product-card">
      <Link
        to={`/product/${product.slug}`}
        className="product-card-image"
      >
        {mainImageUrl ? (
          <img
            src={mainImageUrl}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="product-image-placeholder">
            <span>✿</span>
          </div>
        )}

        {badgeLabel ? (
          <span className="product-featured-label product-top-pick-label">
            <span className="product-top-pick-icon" aria-hidden="true">
              ✿
            </span>
            <span>{badgeLabel}</span>
          </span>
        ) : product.featured ? (
          <span className="product-featured-label">
            Featured
          </span>
        ) : null}
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

        <Link
          to={`/product/${product.slug}`}
          className="product-variation-toggle"
        >
          Explore options <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

export default ProductCard
