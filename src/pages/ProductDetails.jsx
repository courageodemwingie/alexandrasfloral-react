
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  getPublicProduct,
  getProductImageUrl,
} from '../services/api.js'
import { useCart } from '../context/CartContext.jsx'
import './ProductDetails.css'

const BOUQUET_ORDERS_WHATSAPP = '2349133502119'
const OTHER_ORDERS_WHATSAPP = '2348133695329'

function getWhatsAppNumber(categoryName) {
  const category = categoryName?.trim().toLowerCase()

  return category === 'bouquets'
    ? BOUQUET_ORDERS_WHATSAPP
    : OTHER_ORDERS_WHATSAPP
}

function ProductDetails() {
  const { productSlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart } = useCart()

  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showMainProductImage, setShowMainProductImage] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadProduct() {
      try {
        setIsLoading(true)
        setError('')
        setProduct(null)

        const data = await getPublicProduct(productSlug)

        if (!isMounted) return

        setProduct(data.product || null)
      } catch (err) {
        if (!isMounted) return

        setError(err.message || 'Unable to load this product.')
        setProduct(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      isMounted = false
    }
  }, [productSlug])

  const variations = product?.variations || []

  const selectedVariation = useMemo(() => {
    const variationId = searchParams.get('variation')

    return (
      variations.find(
        (variation) => variation.id === variationId
      ) || variations[0] || null
    )
  }, [variations, searchParams])

  const categoryName = product?.category_name
  const categorySlug = product?.category_slug
  const whatsappNumber = getWhatsAppNumber(categoryName)

  const hasVariablePricing =
    product?.has_variable_pricing === true

  const selectedPrice = product
    ? hasVariablePricing
      ? Number(selectedVariation?.price || 0)
      : Number(product.base_price || 0)
    : 0

  const mainProductImageKey =
    product?.main_image_key || variations[0]?.image_key

  const selectedImageKey = showMainProductImage
    ? mainProductImageKey
    : selectedVariation?.image_key || mainProductImageKey

  const selectedImageUrl =
    getProductImageUrl(selectedImageKey)

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(Number(price) || 0)

  const selectVariation = (variation) => {
    setSearchParams({ variation: variation.id })
    setShowMainProductImage(false)
    setAddedToCart(false)
  }

  const handleAddToCart = () => {
    if (!product) return

    // Variable-priced products must have a selected variation.
    if (hasVariablePricing && !selectedVariation) return

    const productWithSelectedPrice = {
      ...product,
      price: selectedPrice,
    }

    addToCart(
      productWithSelectedPrice,
      quantity,
      selectedVariation?.id || null
    )

    setAddedToCart(true)
  }

  const createWhatsAppUrl = () => {
    if (!product) return '#'

    const productUrl =
      `${window.location.origin}/product/${productSlug}` +
      (selectedVariation
        ? `?variation=${encodeURIComponent(selectedVariation.id)}`
        : '')

    const message = [
      "Hello, I'd like to place an order.",
      '',
      `Product: ${product.name}`,
      ...(selectedVariation
        ? [`Variation: ${selectedVariation.name}`]
        : []),
      `Quantity: ${quantity}`,
      `Price: ${formatPrice(selectedPrice)}`,
      '',
      productUrl,
    ].join('\n')

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
  }

  if (isLoading) {
    return (
      <main className="product-details-page">
        <div className="product-details-not-found">
          <p>Loading product...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="product-details-page">
        <div className="product-details-not-found">
          <p className="product-details-eyebrow">
            ALEXANDRA'S FLORAL
          </p>
          <h1>Unable to load product</h1>
          <p>{error}</p>
          <Link to="/shop" className="product-details-back-link">
            Return to shop
          </Link>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="product-details-page">
        <div className="product-details-not-found">
          <p className="product-details-eyebrow">
            ALEXANDRA'S FLORAL
          </p>
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

  // Only variable-priced products require variations.
  if (hasVariablePricing && !selectedVariation) {
    return (
      <main className="product-details-page">
        <div className="product-details-not-found">
          <h1>Product unavailable</h1>
          <p>
            This product currently has no available pricing options.
          </p>
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

        {categoryName && categorySlug && (
          <>
            <Link to={`/shop/${categorySlug}`}>
              {categoryName}
            </Link>
            <span>/</span>
          </>
        )}

        <span>{product.name}</span>
      </nav>

      <section className="product-details-layout">
        <div className="product-details-gallery">

          {/* Main product image and selected variation image */}
          <div className="product-details-main-image">
            {selectedImageUrl ? (
              <img
                src={selectedImageUrl}
                alt={
                  showMainProductImage || !selectedVariation
                    ? product.name
                    : `${product.name} - ${selectedVariation.name}`
                }
              />
            ) : (
              <div className="product-image-placeholder">
                <span>✿</span>
              </div>
            )}
          </div>

          {/* Main product and variation thumbnails */}
          <div className="product-details-thumbnails">

            <button
              type="button"
              className={showMainProductImage ? 'active' : ''}
              onClick={() => setShowMainProductImage(true)}
              aria-label="View main product image"
              aria-pressed={showMainProductImage}
            >
              {mainProductImageKey ? (
                <img
                  src={getProductImageUrl(mainProductImageKey)}
                  alt={product.name}
                />
              ) : (
                <span>✿</span>
              )}

              <span className="product-details-thumbnail-name">
                Main product
              </span>
            </button>

            {variations.map((variation) => {
              const imageUrl = getProductImageUrl(
                variation.image_key || product.main_image_key
              )

              const isSelected =
                !showMainProductImage &&
                selectedVariation?.id === variation.id

              return (
                <button
                  key={variation.id}
                  type="button"
                  className={isSelected ? 'active' : ''}
                  onClick={() => selectVariation(variation)}
                  aria-label={`View ${variation.name}`}
                  aria-pressed={isSelected}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={variation.name}
                    />
                  ) : (
                    <span>✿</span>
                  )}

                  <span className="product-details-thumbnail-name">
                    {variation.name}
                  </span>
                </button>
              )
            })}

          </div>
        </div>

        {/* Product information */}
        <div className="product-details-information">
          <p className="product-details-eyebrow">
            {categoryName || "ALEXANDRA'S FLORAL"}
          </p>

          <h1>{product.name}</h1>

          <p className="product-details-price">
            {formatPrice(selectedPrice)}
          </p>

          {product.description && (
            <p className="product-details-description">
              {product.description}
            </p>
          )}

          {/* Show selected option only when variations exist */}
          {selectedVariation && (
            <div className="product-details-selected-variation">
              <span>Selected option</span>
              <strong>{selectedVariation.name}</strong>
            </div>
          )}

          {/* Quantity and Add to Cart */}
          <div className="product-details-purchase">
            <div className="product-details-quantity">
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) =>
                    Math.max(1, current - 1)
                  )
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

          {/* WhatsApp ordering */}
          <div className="product-details-whatsapp">
            <a
              className="product-details-whatsapp-button"
              href={createWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">↗</span>
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
