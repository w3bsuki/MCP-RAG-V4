import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Send, User, MessageCircle } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { Message, Profile } from '@/types/supabase'

interface ConversationWithDetails {
  user1_id: string
  user2_id: string
  service_ad_id: string | null
  last_message_at: string
  other_user: Profile
  last_message: Message
}

export default function Messages() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState('')
  
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user])

  useEffect(() => {
    if (selectedConversation && user) {
      fetchMessages()
    }
  }, [selectedConversation, user])

  const fetchConversations = async () => {
    try {
      // This is a simplified version - in a real app, you'd want to implement proper conversation grouping
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*),
          recipient:profiles!messages_recipient_id_fkey(*)
        `)
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        // Group messages by conversation and get the latest one
        const conversationMap = new Map()
        
        data?.forEach((message: any) => {
          const otherUserId = message.sender_id === user?.id ? message.recipient_id : message.sender_id
          const userId1 = user?.id || ''
          const userId2 = otherUserId
          const conversationKey = userId1 < userId2 ? `${userId1}-${userId2}` : `${userId2}-${userId1}`
          
          if (!conversationMap.has(conversationKey) || 
              new Date(message.created_at) > new Date(conversationMap.get(conversationKey).created_at)) {
            conversationMap.set(conversationKey, {
              user1_id: userId1 < userId2 ? userId1 : userId2,
              user2_id: userId1 < userId2 ? userId2 : userId1,
              service_ad_id: message.service_ad_id,
              last_message_at: message.created_at,
              other_user: message.sender_id === user?.id ? message.recipient : message.sender,
              last_message: message
            })
          }
        })
        
        setConversations(Array.from(conversationMap.values()))
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!selectedConversation || !user) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`
          and(sender_id.eq.${user.id},recipient_id.eq.${selectedConversation.other_user.id}),
          and(sender_id.eq.${selectedConversation.other_user.id},recipient_id.eq.${user.id})
        `)
        .order('created_at', { ascending: true })

      if (error) {
        setError(error.message)
      } else {
        setMessages(data || [])
        markMessagesAsRead()
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const markMessagesAsRead = async () => {
    if (!selectedConversation || !user) return

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', selectedConversation.other_user.id)
        .eq('recipient_id', user.id)
        .is('read_at', null)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !user || sendingMessage) return

    setSendingMessage(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedConversation.other_user.id,
          content: newMessage.trim(),
          service_ad_id: selectedConversation.service_ad_id
        })
        .select()
        .single()

      if (error) {
        setError(error.message)
      } else {
        setMessages(prev => [...prev, data])
        setNewMessage('')
        // Update the last message in conversations
        setConversations(prev => 
          prev.map(conv => 
            conv.other_user.id === selectedConversation.other_user.id 
              ? { ...conv, last_message: data, last_message_at: data.created_at }
              : conv
          )
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString()
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-2 text-gray-600">
          Communicate with service providers and seekers
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden" style={{ height: '600px' }}>
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900">Conversations</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={`${conversation.user1_id}-${conversation.user2_id}`}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 ${
                      selectedConversation?.other_user.id === conversation.other_user.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.other_user.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.last_message.content}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatTime(conversation.last_message_at)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {selectedConversation.other_user.name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.other_user.user_type === 'provider' ? 'Service Provider' : 'Service Seeker'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          message.sender_id === user?.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_id === user?.id ? 'text-primary-200' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 input"
                      disabled={sendingMessage}
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !newMessage.trim()}
                      className="btn-primary px-4"
                    >
                      {sendingMessage ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}