
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

export const getAdminOrder = (id) =>
  request(`/api/admin/orders/${encodeURIComponent(id)}`)

export const updateAdminOrder = (id, updates) =>
  request(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
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