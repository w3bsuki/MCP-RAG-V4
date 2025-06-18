import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Search, Filter, Star, MapPin, Clock, DollarSign } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { ServiceAd, Profile } from '@/types/supabase'

interface ServiceAdWithProvider extends ServiceAd {
  provider: Profile
}

const CATEGORIES = [
  'Home & Garden',
  'Cleaning', 
  'Repairs & Maintenance',
  'Tutoring & Education',
  'Health & Wellness',
  'Technology',
  'Events & Entertainment',
  'Transportation'
]

export default function Services() {
  const [services, setServices] = useState<ServiceAdWithProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const category = searchParams.get('category')
    if (category) {
      setSelectedCategory(category)
    }
    fetchServices()
  }, [searchParams])

  useEffect(() => {
    fetchServices()
  }, [searchTerm, selectedCategory, priceRange])

  const fetchServices = async () => {
    try {
      let query = supabase
        .from('service_ads')
        .select(`
          *,
          provider:profiles(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // Apply filters
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setServices(data as ServiceAdWithProvider[] || [])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      setError('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (service: ServiceAd) => {
    if (service.price_type === 'quote') return 'Contact for quote'
    if (service.price_type === 'hourly' && service.price_min) {
      return service.price_max 
        ? `$${service.price_min}-${service.price_max}/hr`
        : `$${service.price_min}/hr`
    }
    if (service.price_type === 'fixed' && service.price_min) {
      return service.price_max 
        ? `$${service.price_min}-${service.price_max}`
        : `$${service.price_min}`
    }
    return 'Price not set'
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setPriceRange('')
    setSearchParams({})
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Find Local Services</h1>
        <p className="mt-2 text-gray-600">
          Discover trusted service providers in your area
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search services..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="input w-full"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <select
              className="input w-full"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
            >
              <option value="">All Prices</option>
              <option value="0-50">$0 - $50</option>
              <option value="51-100">$51 - $100</option>
              <option value="101-200">$101 - $200</option>
              <option value="201+">$201+</option>
            </select>
          </div>
        </div>

        {(searchTerm || selectedCategory || priceRange) && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>Active filters:</span>
              {searchTerm && <span className="px-2 py-1 bg-gray-100 rounded">"{searchTerm}"</span>}
              {selectedCategory && <span className="px-2 py-1 bg-gray-100 rounded">{selectedCategory}</span>}
              {priceRange && <span className="px-2 py-1 bg-gray-100 rounded">${priceRange}</span>}
            </div>
            <button onClick={clearFilters} className="text-primary-600 hover:text-primary-700">
              Clear all
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          {services.length} service{services.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-500 mb-2">No services found</h3>
          <p className="text-gray-400 mb-4">
            Try adjusting your search criteria or browse all categories
          </p>
          <button onClick={clearFilters} className="btn-primary">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link
              key={service.id}
              to={`/services/${service.id}`}
              className="block bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                    {service.title}
                  </h3>
                  <div className="flex items-center text-yellow-400 ml-2">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.8</span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {service.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>By {service.provider?.name || 'Unknown Provider'}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>{formatPrice(service)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Posted {new Date(service.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {service.tags && service.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {service.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {service.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{service.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}