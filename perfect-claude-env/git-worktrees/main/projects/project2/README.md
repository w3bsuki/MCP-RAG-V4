# ServiceBot - AI-Powered Local Services Marketplace

A modern web application that revolutionizes how people find and offer local services using AI-powered chatbots.

## 🚀 Features Implemented

### ✅ Core Features Complete
- **User Authentication & Profiles** - Registration, login, profile management
- **AI Chatbot for Ad Creation** - Conversational interface using Anthropic Claude
- **Service Ad Management** - Create, edit, delete, and manage service advertisements
- **Service Discovery & Search** - Advanced search with filters and categories
- **Communication System** - Real-time messaging between providers and seekers
- **Review & Rating System** - Star ratings and written reviews
- **Responsive Design** - Mobile-first UI with Tailwind CSS

### 🔧 Technical Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **AI**: Anthropic Claude API for conversational ad creation
- **State Management**: Zustand
- **Routing**: React Router
- **UI Components**: Custom components with Lucide React icons

### 📊 Database Schema
Complete PostgreSQL schema with:
- Users/Profiles with authentication
- Service categories and advertisements
- Reviews and ratings system
- Real-time messaging
- Row Level Security (RLS) policies

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Anthropic API key

### Installation
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and Anthropic credentials
   ```

3. **Database Setup**
   - Create new Supabase project
   - Run the SQL schema from `supabase/schema.sql`
   - Configure RLS policies

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

## 📱 Key User Flows

### For Service Providers
1. **Registration** → Email verification
2. **Profile Setup** → Service area selection
3. **AI-Guided Ad Creation** → Ad review and publish
4. **Message Management** → Respond to inquiries
5. **Review Management** → Build reputation

### For Service Seekers
1. **Browse/Search Services** → Filter by category, price, location
2. **View Provider Profiles** → Check ratings and reviews
3. **Direct Messaging** → Contact providers
4. **Service Booking** → Arrange services
5. **Leave Reviews** → Rate and review completed services

## 🤖 AI Assistant Features

The AI chatbot helps providers create compelling service ads by:
- Asking relevant questions to gather service details
- Suggesting improvements for better appeal
- Providing pricing guidance based on service type
- Ensuring all required fields are completed
- Offering real-time ad preview

## 🔒 Security Features

- **Authentication**: Supabase Auth with email verification
- **Authorization**: Row Level Security policies
- **Input Validation**: Form validation and sanitization
- **API Security**: Secure API endpoints with user context
- **Session Management**: Secure session handling

## 📈 Success Metrics Tracked

- User registration and retention rates
- Ad creation completion rates
- Message response rates
- Review and rating completion
- Service matching success

## 🛠 Development Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run test       # Run tests
npm run preview    # Preview production build
```

## 📊 Performance Targets

- **Page Load Speed**: < 3 seconds
- **API Response Time**: < 500ms
- **Test Coverage**: 90%+
- **Accessibility**: WCAG 2.1 AA compliance

## 🚀 Deployment

The application is ready for deployment to:
- **Frontend**: Vercel, Netlify, or any static hosting
- **Backend**: Supabase (already cloud-hosted)
- **Environment**: Production environment variables required

## 📝 API Documentation

### Key Endpoints
- **Authentication**: Supabase Auth API
- **Service Ads**: CRUD operations with filtering
- **Messages**: Real-time messaging with Supabase Realtime
- **Reviews**: Rating and review management
- **AI Chat**: Anthropic Claude integration for ad assistance

## 🎯 Future Enhancements

- **Geographic Integration**: Maps and location services
- **Payment Processing**: Stripe integration for transactions
- **Photo Uploads**: Service portfolio galleries
- **Push Notifications**: Real-time alerts
- **Advanced Analytics**: Provider performance dashboards
- **Mobile App**: React Native implementation

## 🐛 Known Issues

- Categories are stored as strings (should be foreign keys)
- File upload for service photos not yet implemented
- Geographic service areas need map integration
- Real-time notifications need optimization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request with detailed description

## 📄 License

MIT License - see LICENSE file for details

---

**ServiceBot MVP** - Connecting local service providers with seekers through AI-powered assistance.

Built with ❤️ using modern web technologies and AI.