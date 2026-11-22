
import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext.jsx'

export default function AdminProtectedRoute() {
  const { isAuthenticated, loading } = useAdminAuth()

  if (loading) {
    return <div className="admin-auth-loading">Checking admin access...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}
