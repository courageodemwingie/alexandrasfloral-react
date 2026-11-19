
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'

import AnnouncementBar from './components/AnnouncementBar.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Category from './pages/Category.jsx'
import ProductDetails from './pages/ProductDetails.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import BridalLookbook from './pages/BridalLookbook.jsx'
import FAQ from './pages/FAQ.jsx'

import { CartProvider } from './context/CartContext.jsx'

function AppLayout() {
  const location = useLocation()
  const isCheckoutPage = location.pathname === '/checkout'

  return (
    <>
      {!isCheckoutPage && (
        <>
          <AnnouncementBar />
          <Header />
        </>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:categorySlug" element={<Category />} />
        <Route path="/product/:productSlug" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/bridal-lookbook" element={<BridalLookbook />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>

      {!isCheckoutPage && <Footer />}
    </>
  )
}

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </CartProvider>
  )
}

export default App
