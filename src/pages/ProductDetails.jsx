import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getCategoryBySlug, getProductBySlug } from '../data/products.js'
import { useCart } from '../context/CartContext.jsx'
import './ProductDetails.css'

const GENERAL_ORDERS_WHATSAPP = '2349133502119'
const FLORAL_ORDERS_WHATSAPP = '2348133695329'

function getWhatsAppNumber(categoryName) {
  const category = categoryName?.trim().toLowerCase()

  if (
    ['bouquets', 'flower arrangements', 'plants', 'wreaths'].includes(category)
  ) {
    return FLORAL_ORDERS_WHATSAPP
  }

  return GENERAL_ORDERS_WHATSAPP
}

function ProductDetails() {
  const { productSlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart } = useCart()

  const product = getProductBySlug(productSlug)
  const variations = product?.variations || []

  const selectedVariation = useMemo(() => {
    const variationId = searchParams.get('variation')

    return (
      variations.find((variation) => variation.id === variationId) ||
      variations[0]
    )
  }, [variations, searchParams])

  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)

  const category = product
    ? getCategoryBySlug(product.category)
    : null

  const whatsappNumber = getWhatsAppNumber(category?.name)

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(price)

  const selectVariation = (variation) => {
    setSearchParams({ variation: variation.id })
    setAddedToCart(false)
  }

  const handleAddToCart = () => {
    if (!product || !selectedVariation) return

    const productWithSelectedPrice = {
      ...product,
      price: selectedVariation.price,
    }

    addToCart(
      productWithSelectedPrice,
      quantity,
      selectedVariation.id
    )

    setAddedToCart(true)
  }

  const createWhatsAppUrl = () => {
    const productUrl = `${window.location.origin}/product/${productSlug}?variation=${encodeURIComponent(selectedVariation.id)}`
    const message = [
      "Hello, I'd like to place an order.",
      '',
      productUrl,
    ].join('\n')

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
  }

  if (!product) {
    return (
      <main className="product-details-page">
        <div className="product-details-not-found">
          <p className="product-details-eyebrow">ALEXANDRA'S FLORAL</p>
          <h1>Product not found</h1>
          <p>
            Sorry, we couldn't find the product you're looking for.
          </p>
          <Link to="/shop" className="product-details-back-link">
            Return to shop
          </Link>
        </div>
      </main>
    )
  }

  if (!selectedVariation) {
    return (
      <main className="product-details-page">
        <div className="product-details-not-found">
          <h1>Product unavailable</h1>
          <p>This product currently has no available variations.</p>
          <Link to="/shop" className="product-details-back-link">
            Explore the shop
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="product-details-page">
      <nav className="product-details-breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        <span>/</span>

        {category && (
          <>
            <Link to={`/shop/${category.slug}`}>
              {category.name}
            </Link>
            <span>/</span>
          </>
        )}

        <span>{product.name}</span>
      </nav>

      <section className="product-details-layout">
        <div className="product-details-gallery">
          <div className="product-details-main-image">
            <img
              src={selectedVariation.image}
              alt={`${product.name} - ${selectedVariation.name}`}
            />
          </div>

          {variations.length > 1 && (
            <div className="product-details-thumbnails">
              {variations.map((variation) => (
                <button
                  key={variation.id}
                  type="button"
                  className={
                    selectedVariation.id === variation.id
                      ? 'active'
                      : ''
                  }
                  onClick={() => selectVariation(variation)}
                  aria-label={`Select ${variation.name}`}
                  aria-pressed={selectedVariation.id === variation.id}
                >
                  <img
                    src={variation.image}
                    alt={variation.name}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-details-information">
          <p className="product-details-eyebrow">
            {category?.name || "ALEXANDRA'S FLORAL"}
          </p>

          <h1>{product.name}</h1>

          <p className="product-details-price">
            {formatPrice(selectedVariation.price)}
          </p>

          <p className="product-details-description">
            {product.description}
          </p>

          {variations.length > 0 && (
            <div className="product-details-variations">
              <div className="product-details-label">
                <span>Choose your variation</span>
                <span>{selectedVariation.name}</span>
              </div>

              <div className="product-details-variation-options">
                {variations.map((variation) => (
                  <button
                    key={variation.id}
                    type="button"
                    className={
                      selectedVariation.id === variation.id
                        ? 'active'
                        : ''
                    }
                    onClick={() => selectVariation(variation)}
                    aria-pressed={selectedVariation.id === variation.id}
                  >
                    {variation.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="product-details-purchase">
            <div className="product-details-quantity">
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
              >
                −
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => current + 1)
                }
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              type="button"
              className="product-details-add-button"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
          </div>

          {addedToCart && (
            <p className="product-details-cart-message" role="status">
              Added to your cart successfully.
            </p>
          )}

          <div
            className="product-details-whatsapp"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '10px',
              marginTop: '14px',
            }}
          >
            <a
              className="product-details-whatsapp-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: '50px',
                padding: '13px 18px',
                borderRadius: '5px',
                background: '#25D366',
                color: '#ffffff',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 600,
                textAlign: 'center',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
              href={createWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Order on WhatsApp
            </a>
          </div>

          <p className="product-details-note">
            Beautifully prepared with care by Alexandra's Floral.
          </p>
        </div>
      </section>
    </main>
  )
}

export default ProductDetails
