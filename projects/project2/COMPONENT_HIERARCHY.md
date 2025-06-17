# ServiceBot React Component Hierarchy

## Overview
Comprehensive React component architecture for ServiceBot using modern patterns, TypeScript, and Tailwind CSS.

## Technology Stack
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: Zustand + React Query
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Maps**: Google Maps React
- **Real-time**: Supabase Realtime
- **AI**: OpenAI/Claude SDK integration

## Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI elements
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   └── features/        # Feature-specific components
├── pages/               # Route components
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
├── services/            # API services
├── types/               # TypeScript types
├── utils/               # Utility functions
└── constants/           # App constants
```

## Root App Component

### App.tsx
```typescript
interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/*" element={<AuthLayout />} />
          <Route path="/app/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};
```

## Layout Components

### AppLayout.tsx
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/create-ad" element={<CreateAdPage />} />
          <Route path="/my-ads" element={<MyAdsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/service/:id" element={<ServiceDetailPage />} />
        </Routes>
      </main>
      <AppFooter />
    </div>
  );
};
```

### AppHeader.tsx
```typescript
interface AppHeaderProps {}

const AppHeader: React.FC<AppHeaderProps> = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Logo />
            <NavigationMenu />
          </div>
          <div className="flex items-center space-x-4">
            <SearchBar />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

// Sub-components
const Logo: React.FC = () => { /* Logo component */ };
const NavigationMenu: React.FC = () => { /* Navigation menu */ };
const NotificationBell: React.FC = () => { /* Notifications */ };
const UserMenu: React.FC = () => { /* User dropdown menu */ };
```

## Authentication Components

### AuthLayout.tsx
```typescript
const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/reset-password" element={<ResetPasswordForm />} />
        </Routes>
      </div>
    </div>
  );
};
```

### LoginForm.tsx
```typescript
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const LoginForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>();
  const { login } = useAuth();

  const onSubmit = async (data: LoginFormData) => {
    await login(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          {...register('email', { required: 'Email is required' })}
          type="email"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          {...register('password', { required: 'Password is required' })}
          type="password"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            {...register('rememberMe')}
            type="checkbox"
            className="h-4 w-4 text-blue-600 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Remember me
          </label>
        </div>
        <Link to="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
          Forgot your password?
        </Link>
      </div>
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
};
```

### RegisterForm.tsx
```typescript
interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'provider' | 'seeker' | 'both';
  terms: boolean;
}

const RegisterForm: React.FC = () => {
  // Similar structure to LoginForm with additional fields
  return (
    <form className="space-y-6">
      {/* Name, email, password, confirm password, user type selection */}
      <UserTypeSelector />
      <TermsCheckbox />
      <Button type="submit">Create Account</Button>
    </form>
  );
};

const UserTypeSelector: React.FC = () => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        I want to:
      </label>
      <div className="space-y-2">
        <label className="flex items-center">
          <input type="radio" value="seeker" className="h-4 w-4" />
          <span className="ml-2">Find services</span>
        </label>
        <label className="flex items-center">
          <input type="radio" value="provider" className="h-4 w-4" />
          <span className="ml-2">Offer services</span>
        </label>
        <label className="flex items-center">
          <input type="radio" value="both" className="h-4 w-4" />
          <span className="ml-2">Both</span>
        </label>
      </div>
    </div>
  );
};
```

## Dashboard Components

### DashboardPage.tsx
```typescript
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="py-8">
      <DashboardHeader />
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <QuickActions />
          <RecentActivity />
          {user.user_type !== 'seeker' && <AdPerformance />}
        </div>
        <div className="space-y-8">
          <StatsOverview />
          <UpcomingTasks />
        </div>
      </div>
    </div>
  );
};

const DashboardHeader: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="md:flex md:items-center md:justify-between">
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          Welcome back, {user.name}!
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {user.user_type === 'provider' ? 'Manage your services and grow your business' : 'Find the perfect services for your needs'}
        </p>
      </div>
      <div className="mt-4 flex md:mt-0 md:ml-4">
        <Button variant="primary">
          {user.user_type === 'provider' ? 'Create New Ad' : 'Find Services'}
        </Button>
      </div>
    </div>
  );
};

const QuickActions: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickActionCard
          icon={<PlusIcon />}
          title="Create Ad"
          description="Post a new service"
          href="/app/create-ad"
        />
        <QuickActionCard
          icon={<SearchIcon />}
          title="Find Services"
          description="Browse providers"
          href="/app/search"
        />
        <QuickActionCard
          icon={<MessageIcon />}
          title="Messages"
          description="Check conversations"
          href="/app/messages"
        />
        <QuickActionCard
          icon={<ChartIcon />}
          title="Analytics"
          description="View performance"
          href="/app/analytics"
        />
      </div>
    </div>
  );
};
```

## AI Chatbot Components

### CreateAdPage.tsx
```typescript
const CreateAdPage: React.FC = () => {
  const [mode, setMode] = useState<'chat' | 'form'>('chat');
  
  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Service Ad</h1>
        <p className="mt-2 text-gray-600">
          Let our AI assistant help you create the perfect service advertisement
        </p>
      </div>
      
      <div className="mb-6">
        <div className="flex space-x-2">
          <Button
            variant={mode === 'chat' ? 'primary' : 'secondary'}
            onClick={() => setMode('chat')}
          >
            AI Assistant
          </Button>
          <Button
            variant={mode === 'form' ? 'primary' : 'secondary'}
            onClick={() => setMode('form')}
          >
            Manual Form
          </Button>
        </div>
      </div>
      
      {mode === 'chat' ? <AdCreationChat /> : <AdCreationForm />}
    </div>
  );
};
```

### AdCreationChat.tsx
```typescript
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface AdDraft {
  title?: string;
  description?: string;
  category_id?: string;
  price_type?: string;
  price_min?: number;
  price_max?: number;
  skills?: string[];
  photos?: string[];
}

const AdCreationChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [adDraft, setAdDraft] = useState<AdDraft>({});
  const [isLoading, setIsLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: nanoid(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatService.continueAdChat({
        chat_session_id: chatSessionId,
        message: content,
        context: { current_ad_draft: adDraft }
      });

      const assistantMessage: Message = {
        id: nanoid(),
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
        suggestions: response.suggested_responses
      };

      setMessages(prev => [...prev, assistantMessage]);
      setAdDraft(response.updated_ad_draft);
      
      if (!chatSessionId) {
        setChatSessionId(response.chat_session_id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow h-96 flex flex-col">
          <ChatHeader />
          <ChatMessages messages={messages} isLoading={isLoading} />
          <ChatInput
            value={currentMessage}
            onChange={setCurrentMessage}
            onSend={sendMessage}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-6">
        <AdPreview adDraft={adDraft} />
        <CompletionProgress adDraft={adDraft} />
      </div>
    </div>
  );
};

const ChatMessages: React.FC<{ messages: Message[]; isLoading: boolean }> = ({ messages, isLoading }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Hi! I'm here to help you create an amazing service ad.</p>
          <p className="text-sm mt-2">Tell me about the service you'd like to offer!</p>
        </div>
      )}
      
      {messages.map((message) => (
        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            message.type === 'user' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            <p>{message.content}</p>
            {message.suggestions && (
              <div className="mt-3 space-y-1">
                {message.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="block w-full text-left px-2 py-1 text-sm bg-white bg-opacity-20 rounded hover:bg-opacity-30"
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 px-4 py-2 rounded-lg">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdPreview: React.FC<{ adDraft: AdDraft }> = ({ adDraft }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Ad Preview</h3>
      <div className="space-y-4">
        {adDraft.title && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <p className="mt-1 text-sm text-gray-900">{adDraft.title}</p>
          </div>
        )}
        
        {adDraft.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <p className="mt-1 text-sm text-gray-900">{adDraft.description}</p>
          </div>
        )}
        
        {(adDraft.price_min || adDraft.price_max) && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Pricing</label>
            <p className="mt-1 text-sm text-gray-900">
              ${adDraft.price_min} - ${adDraft.price_max}
            </p>
          </div>
        )}
        
        {adDraft.skills && adDraft.skills.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Skills</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {adDraft.skills.map((skill, idx) => (
                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

## Service Components

### ServiceCard.tsx
```typescript
interface ServiceCardProps {
  service: ServiceAd;
  onClick?: () => void;
  showProvider?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onClick, showProvider = true }) => {
  return (
    <div 
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-w-16 aspect-h-9">
        <img 
          src={service.photos[0] || '/placeholder-service.jpg'} 
          alt={service.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {service.title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {service.description}
            </p>
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <PriceDisplay service={service} />
          </div>
        </div>
        
        {showProvider && (
          <div className="mt-4 flex items-center">
            <img
              src={service.users.profile_photo || '/default-avatar.png'}
              alt={service.users.name}
              className="h-8 w-8 rounded-full"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{service.users.name}</p>
              <div className="flex items-center">
                <StarRating rating={service.provider_rating} size="sm" />
                <span className="ml-1 text-xs text-gray-500">
                  ({service.provider_review_count} reviews)
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LocationIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">{service.location}</span>
          </div>
          
          <Button size="sm" variant="outline">
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

const PriceDisplay: React.FC<{ service: ServiceAd }> = ({ service }) => {
  if (service.price_type === 'quote') {
    return <span className="text-lg font-semibold text-gray-900">Quote</span>;
  }
  
  if (service.price_min === service.price_max) {
    return (
      <div className="text-right">
        <span className="text-lg font-semibold text-gray-900">${service.price_min}</span>
        {service.price_type === 'hourly' && (
          <span className="text-sm text-gray-500">/hr</span>
        )}
      </div>
    );
  }
  
  return (
    <div className="text-right">
      <span className="text-lg font-semibold text-gray-900">
        ${service.price_min} - ${service.price_max}
      </span>
      {service.price_type === 'hourly' && (
        <span className="text-sm text-gray-500">/hr</span>
      )}
    </div>
  );
};
```

## Search Components

### SearchPage.tsx
```typescript
const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  
  return (
    <div className="py-8">
      <SearchHeader
        query={searchQuery}
        onQueryChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        
        <div className="lg:col-span-3">
          <SearchResults
            query={searchQuery}
            filters={filters}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
};

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, onFiltersChange }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <CategoryFilter />
      <LocationFilter />
      <PriceRangeFilter />
      <RatingFilter />
      <AvailabilityFilter />
      
      <div className="pt-4 border-t">
        <Button variant="outline" className="w-full">
          Clear All Filters
        </Button>
      </div>
    </div>
  );
};

const MapView: React.FC<MapViewProps> = ({ services, onServiceSelect }) => {
  return (
    <div className="h-96 rounded-lg overflow-hidden">
      <GoogleMap
        defaultZoom={12}
        defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
        className="w-full h-full"
      >
        {services.map(service => (
          <Marker
            key={service.id}
            position={{
              lat: service.service_location.y,
              lng: service.service_location.x
            }}
            onClick={() => onServiceSelect(service)}
          />
        ))}
      </GoogleMap>
    </div>
  );
};
```

## Messaging Components

### MessagesPage.tsx
```typescript
const MessagesPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
  return (
    <div className="py-8">
      <div className="bg-white rounded-lg shadow h-96">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
          <div className="md:col-span-1 border-r">
            <ConversationList
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
            />
          </div>
          
          <div className="md:col-span-2">
            {selectedConversation ? (
              <ChatWindow conversationId={selectedConversation} />
            ) : (
              <EmptyMessageState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatWindow: React.FC<{ conversationId: string }> = ({ conversationId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Real-time subscription to new messages
  useEffect(() => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [conversationId]);
  
  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversationId={conversationId} />
      <MessageList messages={messages} />
      <MessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSend={sendMessage}
      />
    </div>
  );
};
```

## Shared UI Components

### Button.tsx
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-blue-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};
```

### StarRating.tsx
```typescript
interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  return (
    <div className="flex items-center">
      {Array.from({ length: maxRating }, (_, index) => {
        const isFilled = index < Math.floor(rating);
        const isPartial = index === Math.floor(rating) && rating % 1 !== 0;
        
        return (
          <button
            key={index}
            type="button"
            className={`${sizeClasses[size]} ${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } transition-transform`}
            onClick={() => interactive && onRatingChange?.(index + 1)}
            disabled={!interactive}
          >
            {isFilled ? (
              <StarIconSolid className="text-yellow-400" />
            ) : isPartial ? (
              <StarIconPartial className="text-yellow-400" />
            ) : (
              <StarIconOutline className="text-gray-300" />
            )}
          </button>
        );
      })}
    </div>
  );
};
```

## Custom Hooks

### useAuth.ts
```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null
  });
  
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      setState(prev => ({ ...prev, user: data.user, error: null }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  };
  
  const logout = async () => {
    await supabase.auth.signOut();
    setState({ user: null, isLoading: false, error: null });
  };
  
  const register = async (email: string, password: string, userData: any) => {
    // Registration logic
  };
  
  return {
    ...state,
    login,
    logout,
    register
  };
};
```

### useServices.ts
```typescript
export const useServices = (filters?: SearchFilters) => {
  return useQuery({
    queryKey: ['services', filters],
    queryFn: () => servicesApi.getServices(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: servicesApi.createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};
```

## State Management (Zustand)

### authStore.ts
```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  
  login: (user) => set({ user, isAuthenticated: true }),
  
  logout: () => set({ user: null, isAuthenticated: false }),
  
  updateProfile: (updates) => set(state => ({
    user: state.user ? { ...state.user, ...updates } : null
  }))
}));
```

## Performance Optimizations

1. **Code Splitting**: Use React.lazy for route-based splitting
2. **Memoization**: React.memo for expensive components
3. **Virtual Scrolling**: For large lists of services
4. **Image Optimization**: Lazy loading and responsive images
5. **Bundle Optimization**: Tree shaking and dead code elimination

## Accessibility Features

1. **ARIA Labels**: All interactive elements
2. **Keyboard Navigation**: Full keyboard support
3. **Focus Management**: Clear focus indicators
4. **Screen Reader Support**: Semantic HTML and ARIA
5. **Color Contrast**: WCAG AA compliance

## Testing Strategy

1. **Unit Tests**: React Testing Library for components
2. **Integration Tests**: User flow testing
3. **E2E Tests**: Cypress for critical paths
4. **Visual Testing**: Storybook for component library
5. **Accessibility Testing**: axe-core integration