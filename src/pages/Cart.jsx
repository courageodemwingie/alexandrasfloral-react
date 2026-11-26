
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { getProductImageUrl } from '../services/api.js'
import '../styles/cart.css'

function getCartItemImage(item) {
  const variation = item.product.variations?.find(
    (option) => option.id === item.variation
  )

  const imageKey =
    variation?.image_key ||
    item.product.main_image_key ||
    item.product.variations?.[0]?.image_key

  return getProductImageUrl(imageKey)
}

function Cart() {
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    removeFromCart,
    updateQuantity,
  } = useCart()

  if (cartItems.length === 0) {
    return (
      <main className="cart-page">
        <div className="cart-empty">
          <h1>Your Shopping Cart</h1>
          <p>Your cart is currently empty.</p>
          <Link to="/shop" className="cart-continue-button">
            Continue Shopping
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="cart-page">
      <div className="cart-container">
        <div className="cart-heading">
          <h1>Your Shopping Cart</h1>
          <p>
            {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <div className="cart-layout">
          <section className="cart-items">
            {cartItems.map((item) => {
              const variation = item.product.variations?.find(
                (option) => option.id === item.variation
              )

              const productImage = getCartItemImage(item)

              return (
                <article
                  className="cart-item"
                  key={`${item.product.id}-${item.variation || 'default'}`}
                >
                  {productImage && (
                    <img
                      className="cart-item-image"
                      src={productImage}
                      alt={item.product.name}
                    />
                  )}

                  <div className="cart-item-details">
                    <h2>{item.product.name}</h2>

                    {variation && (
                      <p className="cart-item-variation">
                        Selected variation: {variation.name}
                      </p>
                    )}

                    <p className="cart-item-price">
                      ₦{Number(item.product.price).toLocaleString('en-NG')}
                    </p>

                    <div className="cart-item-actions">
                      <div className="cart-quantity">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              item.quantity - 1,
                              item.variation
                            )
                          }
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              item.quantity + 1,
                              item.variation
                            )
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() =>
                          removeFromCart(item.product.id, item.variation)
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <p className="cart-item-total">
                    ₦{(
                      item.product.price * item.quantity
                    ).toLocaleString('en-NG')}
                  </p>
                </article>
              )
            })}
          </section>

          <aside className="cart-summary">
            <h2>Order Summary</h2>

            <div className="cart-summary-row">
              <span>Items ({cartCount})</span>
              <span>₦{cartSubtotal.toLocaleString('en-NG')}</span>
            </div>

            <div className="cart-summary-row cart-total">
              <span>Catalogue Subtotal</span>
              <span>₦{cartSubtotal.toLocaleString('en-NG')}</span>
            </div>

            <p className="cart-summary-note">
              This is an estimated catalogue subtotal, not your final amount.
              Alexandra's Floral will confirm product availability, delivery
              charges and the final price after reviewing your order request.
            </p>

            <Link to="/checkout" className="cart-checkout-button">
              Proceed to Checkout
            </Link>

            <Link to="/shop" className="cart-back-to-shop">
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default Cart
