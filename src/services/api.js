
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`)
  }

  return data
}

// Admin authentication
export const adminLogin = (email, password) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const adminLogout = () =>
  request('/api/auth/logout', { method: 'POST' })

export const getAdminSession = () =>
  request('/api/auth/me')

export const requestAdminPasswordReset = (email) =>
  request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const resetAdminPassword = (token, password) =>
  request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })

// Admin products
export const getAdminProducts = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return request(`/api/admin/products${query ? `?${query}` : ''}`)
}

export const getAdminProduct = (id) =>
  request(`/api/admin/products/${encodeURIComponent(id)}`)

export const createAdminProduct = (product) =>
  request('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(product),
  })

export const updateAdminProduct = (id, product) =>
  request(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(product),
  })

// Admin orders
export const getAdminOrders = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return request(`/api/admin/orders${query ? `?${query}` : ''}`)
}
// Create a new official order
export const createAdminOrder = (orderData) =>
  request('/api/admin/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  })
  
export const getAdminOrder = (id) =>
  request(`/api/admin/orders/${encodeURIComponent(id)}`)

export const updateAdminOrder = (id, updates) =>
  request(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })

// Record an additional payment against an order
export const recordAdminOrderPayment = (orderId, paymentData) =>
  request(`/api/admin/orders/${encodeURIComponent(orderId)}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  })

// Record a full refund against an order
export const refundAdminOrder = (orderId, refundData) =>
  request(`/api/admin/orders/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
    body: JSON.stringify(refundData),
  })

// Admin image uploads
export async function uploadAdminImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(
    `${API_BASE_URL}/api/admin/uploads`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData,
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Image upload failed (${response.status})`,
    )
  }

  return data
}

export function getProductImageUrl(imageKey) {
  if (!imageKey) return ''

  return `${API_BASE_URL}/api/images?key=${encodeURIComponent(imageKey)}`
}

// Public shop catalogue
export const getPublicCategories = () =>
  request('/api/categories')

export const getPublicProducts = (params = {}) => {
  const query = new URLSearchParams(params).toString()

  return request(`/api/products${query ? `?${query}` : ''}`)
}

export const getPublicProduct = (slug) =>
  request(`/api/products/${encodeURIComponent(slug)}`)
