
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  adminLogin,
  adminLogout,
  getAdminSession,
} from '../services/api.js'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      const response = await getAdminSession()
      setAdmin(response.admin || null)
    } catch {
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const login = async (email, password) => {
    const response = await adminLogin(email, password)
    setAdmin(response.admin || null)
    return response
  }

  const logout = async () => {
    try {
      await adminLogout()
    } finally {
      setAdmin(null)
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        isAuthenticated: Boolean(admin),
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)

  if (!context) {
    throw new Error(
      'useAdminAuth must be used within an AdminAuthProvider'
    )
  }

  return context
}
