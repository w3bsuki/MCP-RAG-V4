import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

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

const AD_CREATION_SYSTEM_PROMPT = `You are an AI assistant helping users create compelling service advertisements. Your goal is to guide them through creating a complete, professional ad that will attract customers.

Key responsibilities:
1. Ask relevant questions to gather all necessary information
2. Suggest improvements to make the ad more appealing
3. Help with pricing guidance based on the service type
4. Ensure the ad has all required fields: title, description, category, pricing
5. Be conversational and helpful, not robotic

Always end your responses with a specific question to keep the conversation flowing. When the ad seems complete, ask if they'd like to review and publish it.

Categories available: Home & Garden, Cleaning, Repairs & Maintenance, Tutoring & Education, Health & Wellness, Technology, Events & Entertainment, Transportation

Keep responses concise but helpful (2-3 sentences max).`

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

  async sendMessage(userMessage: string, currentAdData?: AdData): Promise<{ response: string; suggestedAdData?: Partial<AdData> }> {
    try {
      this.messages.push({ role: 'user', content: userMessage })

      const contextMessage = currentAdData 
        ? `Current ad data: ${JSON.stringify(currentAdData, null, 2)}\n\nUser message: ${userMessage}`
        : userMessage

      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: AD_CREATION_SYSTEM_PROMPT,
        messages: this.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
      })

      const assistantResponse = response.content[0].type === 'text' ? response.content[0].text : ''
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

  private extractAdDataFromConversation(userMessage: string, aiResponse: string): Partial<AdData> {
    const suggestions: Partial<AdData> = {}
    const lowerUser = userMessage.toLowerCase()
    const lowerAI = aiResponse.toLowerCase()

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
    const { title, description, category, priceType, priceMin, priceMax } = adData
    
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