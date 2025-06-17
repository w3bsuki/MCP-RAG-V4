// Simple AI service without external dependencies for now

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AdData {
  title?: string
  description?: string
  category?: string
  priceType?: 'fixed' | 'hourly' | 'quote'
  priceMin?: number
  priceMax?: number
  tags?: string[]
}

// AD_CREATION_SYSTEM_PROMPT moved to separate constant for reuse

export class AIService {
  private messages: ChatMessage[] = []

  constructor() {
    this.messages = [
      {
        role: 'assistant',
        content: "Hi! I'm here to help you create an amazing service ad. What type of service would you like to offer? For example, are you a plumber, cleaner, tutor, or something else?"
      }
    ]
  }

  async sendMessage(userMessage: string, _currentAdData?: AdData): Promise<{ response: string; suggestedAdData?: Partial<AdData> }> {
    try {
      this.messages.push({ role: 'user', content: userMessage })

      // Mock AI response for now - replace with real API later
      const mockResponses = [
        "That's a great service! What category would you like to list it under?",
        "Can you tell me more about your pricing? Do you charge hourly or have fixed rates?",
        "What makes your service unique? This will help your ad stand out.",
        "Where do you provide this service? What's your service area?",
        "That sounds perfect! Let me help you create a compelling title for your ad.",
        "Great! Would you like to add any special offers or guarantees to attract customers?"
      ]

      const assistantResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]
      this.messages.push({ role: 'assistant', content: assistantResponse })

      // Extract suggested ad data from the conversation
      const suggestedAdData = this.extractAdDataFromConversation(userMessage, assistantResponse)

      return {
        response: assistantResponse,
        suggestedAdData
      }
    } catch (error) {
      console.error('AI Service error:', error)
      return {
        response: "I'm having trouble connecting right now. Could you please try again?"
      }
    }
  }

  private extractAdDataFromConversation(userMessage: string, _aiResponse: string): Partial<AdData> {
    const suggestions: Partial<AdData> = {}
    const lowerUser = userMessage.toLowerCase()

    // Extract service type/category
    const categories = {
      'plumber': 'Repairs & Maintenance',
      'electrician': 'Repairs & Maintenance',
      'cleaner': 'Cleaning',
      'cleaning': 'Cleaning',
      'tutor': 'Tutoring & Education',
      'gardener': 'Home & Garden',
      'handyman': 'Repairs & Maintenance',
      'mover': 'Transportation',
      'photographer': 'Events & Entertainment',
      'trainer': 'Health & Wellness',
      'tech': 'Technology'
    }

    for (const [keyword, category] of Object.entries(categories)) {
      if (lowerUser.includes(keyword)) {
        suggestions.category = category
        break
      }
    }

    // Extract pricing information
    const priceMatch = lowerUser.match(/\$(\d+)/)
    if (priceMatch) {
      const price = parseInt(priceMatch[1])
      if (lowerUser.includes('hour')) {
        suggestions.priceType = 'hourly'
        suggestions.priceMin = price
      } else {
        suggestions.priceType = 'fixed'
        suggestions.priceMin = price
      }
    }

    // Extract service title hints
    if (lowerUser.includes('professional') || lowerUser.includes('expert')) {
      if (!suggestions.tags) suggestions.tags = []
      suggestions.tags.push('Professional')
    }

    return suggestions
  }

  getMessages(): ChatMessage[] {
    return this.messages
  }

  generateAdPreview(adData: AdData): string {
    const { title, description, category, priceType, priceMin } = adData
    
    let priceText = ''
    if (priceType === 'fixed' && priceMin) {
      priceText = `$${priceMin}`
    } else if (priceType === 'hourly' && priceMin) {
      priceText = `$${priceMin}/hour`
    } else if (priceType === 'quote') {
      priceText = 'Contact for quote'
    }

    return `${title || 'Service Title'}

${description || 'Service description will appear here...'}

Category: ${category || 'Not specified'}
Price: ${priceText || 'Not specified'}

${adData.tags?.length ? `Tags: ${adData.tags.join(', ')}` : ''}`
  }
}