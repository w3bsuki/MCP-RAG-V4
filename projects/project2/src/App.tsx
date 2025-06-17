import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Services from '@/pages/Services'
import Messages from '@/pages/Messages'
import Profile from '@/pages/Profile'
import CreateAd from '@/pages/CreateAd'
import ServiceDetail from '@/pages/ServiceDetail'
import LoadingSpinner from '@/components/LoadingSpinner'

function App() {
  const { initialize, loading, user } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="services/:id" element={<ServiceDetail />} />
        <Route 
          path="login" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        <Route 
          path="register" 
          element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="create-ad" 
          element={user ? <CreateAd /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="messages" 
          element={user ? <Messages /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="profile" 
          element={user ? <Profile /> : <Navigate to="/login" replace />} 
        />
      </Route>
    </Routes>
  )
}

export default App