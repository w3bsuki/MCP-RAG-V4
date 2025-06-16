import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Plus, Eye, Edit, Trash2, MessageCircle, Star } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { ServiceAd } from '@/types/supabase'

export default function Dashboard() {
  const [ads, setAds] = useState<ServiceAd[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, profile } = useAuthStore()

  useEffect(() => {
    if (user) {
      fetchUserAds()
    }
  }, [user])

  const fetchUserAds = async () => {
    try {
      const { data, error } = await supabase
        .from('service_ads')
        .select('*')
        .eq('provider_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setAds(data || [])
      }
    } catch (error) {
      console.error('Error fetching ads:', error)
      setError('Failed to load your ads')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return

    try {
      const { error } = await supabase
        .from('service_ads')
        .delete()
        .eq('id', adId)

      if (error) {
        setError(error.message)
      } else {
        setAds(ads.filter(ad => ad.id !== adId))
      }
    } catch (error) {
      console.error('Error deleting ad:', error)
      setError('Failed to delete ad')
    }
  }

  const toggleAdStatus = async (adId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    try {
      const { error } = await supabase
        .from('service_ads')
        .update({ status: newStatus })
        .eq('id', adId)

      if (error) {
        setError(error.message)
      } else {
        setAds(ads.map(ad => 
          ad.id === adId ? { ...ad, status: newStatus as any } : ad
        ))
      }
    } catch (error) {
      console.error('Error updating ad status:', error)
      setError('Failed to update ad status')
    }
  }

  const formatPrice = (ad: ServiceAd) => {
    if (ad.price_type === 'quote') return 'Contact for quote'
    if (ad.price_type === 'hourly' && ad.price_min) return `$${ad.price_min}/hour`
    if (ad.price_type === 'fixed' && ad.price_min) return `$${ad.price_min}`
    return 'Price not set'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {profile?.name || 'User'}! Manage your service ads and track your performance.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link to="/create-ad" className="btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Create New Ad</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Eye className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Ads</p>
              <p className="text-2xl font-semibold text-gray-900">{ads.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Ads</p>
              <p className="text-2xl font-semibold text-gray-900">
                {ads.filter(ad => ad.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Views</p>
              <p className="text-2xl font-semibold text-gray-900">
                {ads.reduce((sum, ad) => sum + ad.views_count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Rating</p>
              <p className="text-2xl font-semibold text-gray-900">4.8</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ads List */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Your Service Ads</h2>
        </div>

        {ads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-2">No ads yet</h3>
            <p className="text-gray-400 mb-4">
              Create your first service ad to start attracting customers
            </p>
            <Link to="/create-ad" className="btn-primary">
              Create Your First Ad
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {ads.map((ad) => (
              <div key={ad.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">{ad.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ad.status)}`}>
                        {ad.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1 line-clamp-2">{ad.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>Category: {ad.category_id}</span>
                      <span>Price: {formatPrice(ad)}</span>
                      <span>Views: {ad.views_count}</span>
                      <span>Created: {new Date(ad.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      to={`/services/${ad.id}`}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="View Ad"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => toggleAdStatus(ad.id, ad.status)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title={ad.status === 'active' ? 'Pause Ad' : 'Activate Ad'}
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 text-red-400 hover:text-red-600"
                      title="Delete Ad"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}