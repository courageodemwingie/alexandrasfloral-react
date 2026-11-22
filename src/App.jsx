import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import AnnouncementBar from "./components/AnnouncementBar.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";

import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import Category from "./pages/Category.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import BridalLookbook from "./pages/BridalLookbook.jsx";
import FAQ from "./pages/FAQ.jsx";

import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminProducts from "./pages/admin/AdminProducts.jsx";
import AdminProductForm from "./pages/admin/AdminProductForm.jsx";

import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";

function AppLayout() {
  const location = useLocation();
  const isCheckoutPage = location.pathname === "/checkout";
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <>
      {!isCheckoutPage && !isAdminPage && (
        <>
          <AnnouncementBar />
          <Header />
        </>
      )}

      <Routes>
        {/* Customer storefront */}
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:categorySlug" element={<Category />} />
        <Route path="/product/:productSlug" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/bridal-lookbook" element={<BridalLookbook />} />
        <Route path="/faq" element={<FAQ />} />

        {/* Admin login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected admin pages */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:productId" element={<AdminProductForm />} />
          </Route>
        </Route>
      </Routes>

      {!isCheckoutPage && !isAdminPage && <Footer />}
    </>
  );
}

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <AdminAuthProvider>
          <AppLayout />
        </AdminAuthProvider>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
