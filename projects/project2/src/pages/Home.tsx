import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Bot, Search, MessageCircle, ArrowRight } from 'lucide-react'

export default function Home() {
  const { user } = useAuthStore()

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-white">
              Find Local Services with
              <span className="block text-primary-200">AI Assistance</span>
            </h1>
            <p className="mt-6 text-xl text-primary-100 max-w-3xl mx-auto">
              ServiceBot connects you with trusted local service providers. Use our AI assistant to create compelling service ads or find the perfect provider for your needs.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Link to="/create-ad" className="btn-primary bg-white text-primary-600 hover:bg-gray-50 px-8 py-3 text-lg">
                    Post Your Service
                  </Link>
                  <Link to="/services" className="btn-outline border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3 text-lg">
                    Find Services
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn-primary bg-white text-primary-600 hover:bg-gray-50 px-8 py-3 text-lg">
                    Get Started
                  </Link>
                  <Link to="/services" className="btn-outline border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3 text-lg">
                    Browse Services
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose ServiceBot?</h2>
            <p className="mt-4 text-xl text-gray-600">
              Our platform makes it easy to connect with local service providers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Bot className="h-12 w-12 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI-Powered Ad Creation
              </h3>
              <p className="text-gray-600">
                Our AI assistant helps you create compelling service advertisements that attract more customers.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Search className="h-12 w-12 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Smart Matching
              </h3>
              <p className="text-gray-600">
                Advanced search and filtering help you find the perfect service provider for your specific needs.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <MessageCircle className="h-12 w-12 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Direct Communication
              </h3>
              <p className="text-gray-600">
                Connect directly with service providers through our secure messaging system.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Popular Service Categories</h2>
            <p className="mt-4 text-xl text-gray-600">
              Find trusted professionals in these areas
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Home & Garden', icon: '🏠', count: '150+ providers' },
              { name: 'Cleaning', icon: '🧽', count: '200+ providers' },
              { name: 'Repairs & Maintenance', icon: '🔧', count: '180+ providers' },
              { name: 'Tutoring & Education', icon: '📚', count: '120+ providers' },
              { name: 'Health & Wellness', icon: '💪', count: '90+ providers' },
              { name: 'Technology', icon: '💻', count: '110+ providers' },
              { name: 'Events & Entertainment', icon: '🎉', count: '75+ providers' },
              { name: 'Transportation', icon: '🚚', count: '60+ providers' },
            ].map((category) => (
              <Link
                key={category.name}
                to={`/services?category=${encodeURIComponent(category.name)}`}
                className="group p-6 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{category.icon}</div>
                  <h3 className="font-medium text-gray-900 group-hover:text-primary-600">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{category.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* For Service Seekers */}
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">For Service Seekers</h3>
              <div className="space-y-4">
                {[
                  'Search for services in your area',
                  'Compare providers and reviews',
                  'Contact providers directly',
                  'Book and pay securely'
                ].map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* For Service Providers */}
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">For Service Providers</h3>
              <div className="space-y-4">
                {[
                  'Create your profile with AI assistance',
                  'Post compelling service advertisements',
                  'Receive and respond to inquiries',
                  'Build your reputation with reviews'
                ].map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of users who trust ServiceBot for their local service needs
          </p>
          <Link
            to="/register"
            className="btn-primary bg-white text-primary-600 hover:bg-gray-50 px-8 py-3 text-lg inline-flex items-center space-x-2"
          >
            <span>Create Your Account</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}