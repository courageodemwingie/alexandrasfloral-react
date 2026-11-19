import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { useCart } from '../context/CartContext.jsx'
import logo from '../assets/logo/alexandras_floral_logo.webp'
import '../styles/checkout.css'

function formatPrice(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

function getSelectedVariation(item) {
  return item.product.variations?.find(
    variation => variation.id === item.variation
  ) || null
}

function getProductImage(item) {
  const variation = getSelectedVariation(item)

  return (
    variation?.image ||
    item.product.image ||
    item.product.variations?.[0]?.image ||
    ''
  )
}

function formatDeliveryDate(date) {
  if (!date) return ''

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function CheckoutLogo() {
  return (
    <div className="checkout-brand-logo">
      <img src={logo} alt="Alexandra's Floral" />
    </div>
  )
}

export default function Checkout() {
  const { cartItems, cartSubtotal } = useCart()

  const orderDocumentRef = useRef(null)

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    deliveryDate: '',
  })

  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  const subtotal = cartSubtotal ?? cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  )

  const today = new Date()
  const minimumDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  function handleChange(event) {
    const { name, value } = event.target

    setCustomer(current => ({
      ...current,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (cartItems.length === 0) {
      setError('Your cart is empty. Please add products before proceeding.')
      return
    }

    if (
      !customer.name.trim() ||
      !customer.phone.trim() ||
      !customer.address.trim() ||
      !customer.deliveryDate
    ) {
      setError('Please complete all the required fields.')
      return
    }

    const orderReference = `AF-${Date.now().toString().slice(-8)}`

    setOrder({
      customer: { ...customer },
      items: [...cartItems],
      subtotal,
      reference: orderReference,
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDownload() {
    if (!orderDocumentRef.current || isDownloading) return

    setError('')
    setIsDownloading(true)

    try {
      await document.fonts.ready

      const images = Array.from(
        orderDocumentRef.current.querySelectorAll('img')
      )

      await Promise.all(
        images.map(image => {
          if (image.complete && image.naturalWidth > 0) {
            return Promise.resolve()
          }

          return new Promise(resolve => {
            image.onload = resolve
            image.onerror = resolve
          })
        })
      )

      const canvas = await html2canvas(orderDocumentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imageData = canvas.toDataURL('image/jpeg', 0.95)

      const downloadLink = document.createElement('a')
      downloadLink.href = imageData
      downloadLink.download = `${order.reference}-Alexandras-Floral.jpg`

      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    } catch (downloadError) {
      console.error('Order image download failed:', downloadError)
      setError('We could not generate your order image. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  // EMPTY CART
  if (cartItems.length === 0) {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <CheckoutLogo />

          <div className="checkout-empty">
            <h1>Your cart is empty</h1>
            <p>Add some beautiful flowers before proceeding to checkout.</p>

            <Link to="/shop" className="checkout-primary-button">
              Browse Flowers
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ORDER REQUEST READY
  if (order) {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-brand-heading">
            <img
              src={logo}
              alt="Alexandra's Floral"
              className="checkout-heading-logo"
            />

            <div className="checkout-heading">
              <p className="checkout-eyebrow">ORDER REQUEST READY</p>
              <h1>Your order summary is ready!</h1>
            </div>
          </div>

          <p className="checkout-heading-description">
            Download your order request image and send it to Alexandra's
            Floral via WhatsApp for review and confirmation.
          </p>

          <div
            ref={orderDocumentRef}
            className="order-request-document"
          >
            <header className="order-document-header">
              <img
                src={logo}
                alt="Alexandra's Floral"
                className="order-document-logo"
              />
            </header>

            <div className="order-document-reference">
              <strong>Order reference: {order.reference}</strong>
            </div>

            <section className="order-document-section order-document-customer">
              <h2>Customer and Delivery Information</h2>
              <div className="order-document-customer-grid">
                <p><strong>Customer:</strong> {order.customer.name}</p>
                <p><strong>Receiver's phone:</strong> {order.customer.phone}</p>
                <p className="order-document-address">
                  <strong>Delivery address:</strong> {order.customer.address}
                </p>
                <p>
                  <strong>Delivery date:</strong>{' '}
                  {formatDeliveryDate(order.customer.deliveryDate)}
                </p>
              </div>
            </section>

            <section className="order-document-section">
              <h2>Requested Products</h2>

              <div className="order-document-items">
                {order.items.map(item => {
                  const variation = getSelectedVariation(item)
                  const image = getProductImage(item)
                  const unitPrice = item.product.price
                  const lineTotal = unitPrice * item.quantity

                  return (
                    <article
                      className="order-document-item"
                      key={`${item.product.id}-${item.variation || 'default'}`}
                    >
                      {image && (
                        <img
                          src={image}
                          alt={item.product.name}
                          className="order-document-image"
                          crossOrigin="anonymous"
                        />
                      )}

                      <div className="order-document-item-details">
                        <h3>{item.product.name}</h3>

                        <p className="order-document-variation">
                          {variation?.name || 'Standard'} <span>·</span> Qty {item.quantity}
                        </p>
                        <p className="order-document-prices">
                          Unit {formatPrice(unitPrice)} <span>·</span>{' '}
                          <strong>Subtotal {formatPrice(lineTotal)}</strong>
                        </p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <div className="order-document-subtotal">
              <strong>Catalogue Subtotal</strong>
              <strong>{formatPrice(order.subtotal)}</strong>
            </div>

            <div className="order-document-notice">
              <strong>Please note:</strong> This is an order request, not a
              confirmed order. Product availability, delivery arrangements
              and delivery charges will be reviewed by Alexandra's Floral.
              Your final order total and payment instructions will be
              communicated directly to you.
            </div>
          </div>

          {error && (
            <p className="checkout-error" role="alert">
              {error}
            </p>
          )}

          <div className="order-download-actions">
            <button
              type="button"
              className="checkout-primary-button"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading
                ? 'Preparing your image...'
                : 'Download Order Request'}
            </button>

            <p className="checkout-disclaimer">
              Save the JPEG image to your device, then send it to
              Alexandra's Floral via WhatsApp.
            </p>

            <Link to="/shop" className="checkout-back-link">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // CHECKOUT FORM
  return (
    <main className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-brand-heading">
          <img
            src={logo}
            alt="Alexandra's Floral"
            className="checkout-heading-logo"
          />

          <div className="checkout-heading">
            <p className="checkout-eyebrow">ALMOST THERE</p>
            <h1>Complete Your Order Request</h1>
          </div>
        </div>

        <p className="checkout-heading-description">
          Provide your details below to prepare your order request.
          We'll confirm availability, delivery arrangements and final
          pricing with you afterwards.
        </p>

        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <section className="checkout-section">
              <h2>Customer Information</h2>

              <div className="checkout-field">
                <label htmlFor="customer-name">Your name</label>
                <input
                  id="customer-name"
                  type="text"
                  name="name"
                  value={customer.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="receiver-phone">
                  Receiver's phone number
                </label>
                <input
                  id="receiver-phone"
                  type="tel"
                  name="phone"
                  value={customer.phone}
                  onChange={handleChange}
                  placeholder="Enter receiver's phone number"
                  autoComplete="tel"
                  required
                />
              </div>
            </section>

            <section className="checkout-section">
              <h2>Delivery Information</h2>

              <div className="checkout-field">
                <label htmlFor="delivery-address">Delivery address</label>
                <textarea
                  id="delivery-address"
                  name="address"
                  value={customer.address}
                  onChange={handleChange}
                  placeholder="Enter the complete delivery address"
                  rows="4"
                  autoComplete="street-address"
                  required
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="delivery-date">
                  Preferred delivery date
                </label>
                <input
                  id="delivery-date"
                  type="date"
                  name="deliveryDate"
                  value={customer.deliveryDate}
                  onChange={handleChange}
                  min={minimumDate}
                  required
                />
              </div>
            </section>

            {error && (
              <p className="checkout-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="checkout-primary-button">
              Prepare My Order Request
            </button>

            <p className="checkout-disclaimer">
              Your order is not confirmed until Alexandra's Floral reviews
              your request and communicates the final price and delivery
              details.
            </p>
          </form>

          <aside className="checkout-summary">
            <h2>Order Summary</h2>

            <div className="checkout-items">
              {cartItems.map(item => {
                const variation = getSelectedVariation(item)
                const image = getProductImage(item)

                return (
                  <div
                    className="checkout-item"
                    key={`${item.product.id}-${item.variation || 'default'}`}
                  >
                    {image && (
                      <img
                        src={image}
                        alt={item.product.name}
                        className="checkout-item-image"
                      />
                    )}

                    <div className="checkout-item-details">
                      <h3>{item.product.name}</h3>
                      <p>
                        Variation: {variation?.name || 'Standard'}
                      </p>
                      <p>Quantity: {item.quantity}</p>
                      <strong>
                        {formatPrice(item.product.price * item.quantity)}
                      </strong>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="checkout-subtotal">
              <span>Catalogue subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className="checkout-delivery-note">
              <strong>Delivery fee</strong>
              <span>To be confirmed</span>
            </div>

            <div className="checkout-final-total">
              <span>Final amount payable</span>
              <strong>Awaiting confirmation</strong>
            </div>

            <p className="checkout-summary-note">
              The displayed catalogue subtotal is for reference only.
              Alexandra's Floral will confirm your final total after
              reviewing your delivery address and order.
            </p>

            <Link to="/cart" className="checkout-back-link">
              ← Return to cart
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}