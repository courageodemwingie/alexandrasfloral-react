
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'alexandras-floral-cart'

function getSavedCart() {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEY)

    return savedCart ? JSON.parse(savedCart) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(getSavedCart)

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cartItems)
      )
    } catch (error) {
      console.error('Unable to save shopping cart:', error)
    }
  }, [cartItems])

  function addToCart(product, quantity = 1, variation = null) {
    if (!product || !product.id || !Number.isInteger(quantity) || quantity < 1) {
      return
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) =>
          item.product.id === product.id &&
          item.variation === variation
      )

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id &&
          item.variation === variation
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      return [
        ...currentItems,
        {
          product,
          quantity,
          variation,
        },
      ]
    })
  }

  function removeFromCart(productId, variation = null) {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.variation === variation
          )
      )
    )
  }

  function updateQuantity(productId, quantity, variation = null) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId &&
        item.variation === variation
          ? { ...item, quantity }
          : item
      )
    )
  }

  function clearCart() {
    setCartItems([])
  }

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  )

  const cartSubtotal = cartItems.reduce(
    (total, item) =>
      total + item.product.price * item.quantity,
    0
  )

  const value = {
    cartItems,
    cartCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error(
      'useCart must be used within a CartProvider'
    )
  }

  return context
}
