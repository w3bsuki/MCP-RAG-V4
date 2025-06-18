import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Bot, User, LogOut, Plus, MessageCircle, Search } from 'lucide-react'

export default function Header() {
  const { user, profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">ServiceBot</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/services" className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
              <Search className="h-4 w-4" />
              <span>Find Services</span>
            </Link>
            {user && (
              <>
                <Link to="/create-ad" className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>Post Service</span>
                </Link>
                <Link to="/messages" className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>Messages</span>
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100">
                    <User className="h-5 w-5 text-gray-600" />
                    <span className="hidden sm:block text-sm text-gray-700">
                      {profile?.name || 'User'}
                    </span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-gray-600 hover:text-gray-900">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}