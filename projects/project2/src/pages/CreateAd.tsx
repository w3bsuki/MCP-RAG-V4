import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import AIChat from '@/components/AIChat'
import { AIService, type AdData } from '@/lib/ai'
import { Camera, MapPin, DollarSign, Tag, Eye } from 'lucide-react'

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

export default function CreateAd() {
  const [adData, setAdData] = useState<AdData>({
    title: '',
    description: '',
    category: '',
    priceType: 'quote',
    priceMin: undefined,
    priceMax: undefined,
    tags: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [aiService] = useState(() => new AIService())
  
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  const handleAdDataUpdate = (updates: Partial<AdData>) => {
    setAdData(prev => ({ ...prev, ...updates }))
  }

  const handleInputChange = (field: keyof AdData, value: any) => {
    setAdData(prev => ({ ...prev, [field]: value }))
  }

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    setAdData(prev => ({ ...prev, tags }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!adData.title || !adData.description || !adData.category) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      // Insert service ad
      const { data, error } = await supabase
        .from('service_ads')
        .insert({
          provider_id: user.id,
          title: adData.title,
          description: adData.description,
          category_id: adData.category, // We'll need to map category name to ID
          price_type: adData.priceType,
          price_min: adData.priceMin,
          price_max: adData.priceMax,
          tags: adData.tags || [],
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      navigate('/dashboard')
    } catch (error) {
      console.error('Error creating ad:', error)
      setError('Failed to create ad. Please try again.')
      setLoading(false)
    }
  }

  const generatePreview = () => {
    return aiService.generateAdPreview(adData)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Service Ad</h1>
          <p className="mt-2 text-gray-600">
            Use our AI assistant to create a compelling service advertisement
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Chat */}
          <div>
            <h2 className="text-xl font-semibold mb-4">AI Assistant</h2>
            <AIChat 
              onAdDataUpdate={handleAdDataUpdate} 
              currentAdData={adData}
            />
          </div>

          {/* Ad Form */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Ad Details</h2>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="btn-outline flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
              </button>
            </div>

            {showPreview && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-medium mb-2">Ad Preview</h3>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {generatePreview()}
                </pre>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  placeholder="e.g., Professional House Cleaning Service"
                  value={adData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  className="textarea w-full"
                  placeholder="Describe your service in detail..."
                  value={adData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  className="input w-full"
                  value={adData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Type
                  </label>
                  <select
                    className="input w-full"
                    value={adData.priceType}
                    onChange={(e) => handleInputChange('priceType', e.target.value as 'fixed' | 'hourly' | 'quote')}
                  >
                    <option value="quote">Contact for Quote</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>

                {adData.priceType !== 'quote' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {adData.priceType === 'hourly' ? 'Hourly Rate' : 'Price'} ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input w-full"
                        placeholder="0.00"
                        value={adData.priceMin || ''}
                        onChange={(e) => handleInputChange('priceMin', parseFloat(e.target.value) || undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Price ($) <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input w-full"
                        placeholder="0.00"
                        value={adData.priceMax || ''}
                        onChange={(e) => handleInputChange('priceMax', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags <span className="text-gray-500">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g., Professional, Experienced, Affordable"
                  value={adData.tags?.join(', ') || ''}
                  onChange={(e) => handleTagsChange(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Publish Ad</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}