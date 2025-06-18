import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { 
  Star, 
  DollarSign, 
  MessageCircle, 
  User,
  Calendar,
  Tag,
  ArrowLeft,
  Eye
} from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { ServiceAd, Profile, Review } from '@/types/supabase'

interface ServiceAdWithProvider extends ServiceAd {
  provider: Profile
}

interface ReviewWithUser extends Review {
  reviewer: Profile
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [service, setService] = useState<ServiceAdWithProvider | null>(null)
  const [reviews, setReviews] = useState<ReviewWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [error, setError] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    if (id) {
      fetchServiceDetails()
      fetchReviews()
    }
  }, [id])

  const fetchServiceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('service_ads')
        .select(`
          *,
          provider:profiles(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
      } else if (data) {
        setService(data as ServiceAdWithProvider)
        // Increment view count
        await supabase.rpc('increment_ad_views', { ad_id: id })
      }
    } catch (error) {
      console.error('Error fetching service:', error)
      setError('Failed to load service details')
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    setReviewLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles(*)
        `)
        .eq('service_ad_id', id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching reviews:', error)
      } else {
        setReviews(data as ReviewWithUser[] || [])
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setReviewLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !service || !user || sendingMessage) return

    setSendingMessage(true)

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: service.provider_id,
          service_ad_id: service.id,
          content: messageText.trim()
        })

      if (error) {
        setError(error.message)
      } else {
        setMessageText('')
        navigate('/messages')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const formatPrice = (service: ServiceAd) => {
    if (service.price_type === 'quote') return 'Contact for quote'
    if (service.price_type === 'hourly' && service.price_min) {
      return service.price_max 
        ? `$${service.price_min}-${service.price_max}/hour`
        : `$${service.price_min}/hour`
    }
    if (service.price_type === 'fixed' && service.price_min) {
      return service.price_max 
        ? `$${service.price_min}-${service.price_max}`
        : `$${service.price_min}`
    }
    return 'Price not set'
  }

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested service could not be found.'}</p>
          <button onClick={() => navigate('/services')} className="btn-primary">
            Back to Services
          </button>
        </div>
      </div>
    )
  }

  const averageRating = calculateAverageRating()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Header */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{service.title}</h1>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center text-yellow-400">
                <Star className="h-5 w-5 fill-current" />
                <span className="text-gray-600 ml-1">
                  {averageRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center text-gray-500">
                <Eye className="h-4 w-4 mr-1" />
                <span>{service.views_count} views</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                <span>{formatPrice(service)}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Posted {new Date(service.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                <span>{service.category_id}</span>
              </div>
            </div>

            {service.tags && service.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {service.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{service.description}</p>
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Reviews ({reviews.length})
            </h3>

            {reviewLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No reviews yet</p>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {review.reviewer.name || 'Anonymous'}
                          </h4>
                          <div className="flex items-center text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? 'fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Provider Info */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Service Provider</h3>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {service.provider.name || 'Provider'}
                </h4>
                <p className="text-sm text-gray-500 capitalize">
                  {service.provider.user_type === 'both' ? 'Provider & Seeker' : service.provider.user_type}
                </p>
              </div>
            </div>

            {service.provider.bio && (
              <p className="text-gray-600 text-sm mb-4">{service.provider.bio}</p>
            )}

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-2 text-yellow-400" />
                <span>{averageRating} average rating</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Member since {new Date(service.provider.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          {user && user.id !== service.provider_id && (
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Provider</h3>
              
              <textarea
                rows={3}
                className="textarea w-full mb-4"
                placeholder="Hi! I'm interested in your service..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              
              <button
                onClick={sendMessage}
                disabled={sendingMessage || !messageText.trim()}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {sendingMessage ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                <span>{sendingMessage ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          )}

          {user?.id === service.provider_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">This is your service</h4>
              <p className="text-sm text-blue-700">
                You can manage this service from your dashboard.
              </p>
            </div>
          )}

          {!user && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Want to contact this provider?</h4>
              <p className="text-sm text-gray-600 mb-4">
                Sign up or log in to send messages and book services.
              </p>
              <button
                onClick={() => navigate('/register')}
                className="btn-primary w-full"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}