# 🎯 PROJECT4: Claude-Powered Crypto Predictor Terminal

**THIS IS THE ONLY SPEC. IGNORE ALL OTHERS.**

## 📌 PIVOT DECISION
**From**: Full cryptocurrency trading platform (like Binance)  
**To**: Claude-powered crypto prediction dashboard with premium features

## 🎯 NEW PRODUCT VISION

### **CryptoVision Terminal** - AI-Powered Crypto Insights
A retro DOS/Windows 95 terminal that provides AI-powered cryptocurrency predictions and market analysis.

### **Core Features:**

#### **Free Tier:**
- Real-time crypto prices (top 20 coins)
- Basic price charts (24h, 7d, 30d)
- Market overview dashboard
- Portfolio tracker (manual entry)

#### **Premium Tier ($19.99/month):**
- **Claude AI Predictions**: 24h, 7d price predictions with confidence scores
- **Market Sentiment Analysis**: AI analysis of news and social media
- **Trade Timing Alerts**: "Optimal buy/sell windows" based on AI
- **Risk Assessment**: Position risk scoring
- **Custom Alerts**: AI-powered price movement predictions
- **Priority Support**: Direct support channel

## 🛠️ TECHNICAL IMPLEMENTATION

### **Tech Stack (No Changes):**
- Next.js 15.1 + TypeScript (already setup)
- Tailwind CSS (retro terminal theme)
- shadcn/ui components (retro styled)
- Zustand for state management
- TanStack Query for data fetching

### **New Additions:**
- **Claude API**: Anthropic SDK for predictions ✅ INSTALLED
- **Stripe**: Payment processing
- **Clerk/Auth0**: User authentication
- **Vercel KV**: Usage tracking/rate limiting

### **AI Integration Setup:**
```bash
# Install dependencies (already done)
npm install ai @ai-sdk/anthropic

# Configure environment variables
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
```

### **Available AI Features:**
- `/api/ai-predict` - AI prediction endpoint
- `useAIPrediction` hook - React hook for AI predictions
- Fallback predictions when API key not configured
- Support for Claude 3 models (Haiku, Opus, Sonnet)

## 📋 REVISED TASK BREAKDOWN

### **Phase 1: Complete Dashboard (2 hours)**
- [ ] DASH-001: Create market overview with real prices
- [ ] DASH-002: Build portfolio tracker interface
- [ ] DASH-003: Implement price charts (Lightweight Charts)
- [ ] DASH-004: Add WebSocket for real-time updates

### **Phase 2: Claude Integration (3 hours)**
- [ ] AI-001: Setup Claude API with Anthropic SDK
- [ ] AI-002: Create prediction prompts and parsing
- [ ] AI-003: Build prediction UI components
- [ ] AI-004: Implement caching for API efficiency

### **Phase 3: Monetization (2 hours)**
- [ ] PAY-001: Integrate Stripe for subscriptions
- [ ] PAY-002: Setup Clerk for authentication
- [ ] PAY-003: Implement free/premium tier logic
- [ ] PAY-004: Add usage tracking and limits

### **Phase 4: Polish & Deploy (1 hour)**
- [ ] SHIP-001: Complete retro styling
- [ ] SHIP-002: Add loading states and errors
- [ ] SHIP-003: Deploy to Vercel
- [ ] SHIP-004: Setup monitoring

## 🎨 RETRO DESIGN SYSTEM

### **Color Palette:**
```css
--terminal-black: #000000
--terminal-white: #FFFFFF
--terminal-gray: #C0C0C0
--terminal-green: #00FF00
--terminal-red: #FF0000
```

### **Typography:**
- Font: Courier New (monospace only)
- Sizes: 12px, 14px, 16px, 24px
- No anti-aliasing for authentic look

### **Components:**
- Windows 95 raised/sunken borders
- ASCII art headers and dividers
- Typewriter effect for price updates
- CRT scanline effect (optional)

## 💰 MONETIZATION STRATEGY

### **Pricing Tiers:**
1. **Free Forever**
   - 100 price checks/day
   - Basic charts
   - 5 portfolio items

2. **Pro ($19.99/month)**
   - Unlimited predictions
   - All AI features
   - Unlimited portfolio
   - Priority support

3. **Team ($49.99/month)**
   - 5 user accounts
   - Shared portfolios
   - API access
   - Custom alerts

## 🚀 LAUNCH CHECKLIST

- [ ] Working dashboard with real crypto prices
- [ ] Claude integration returning predictions
- [ ] Stripe payment flow complete
- [ ] User authentication working
- [ ] Free/premium tier enforcement
- [ ] Deployed to Vercel
- [ ] Landing page explaining features
- [ ] Terms of service (predictions not financial advice)

## ⚡ QUICK WIN FEATURES

1. **"Lucky 8-Ball" Predictor**: Fun Claude prediction in Magic 8-Ball style
2. **ASCII Chart Mode**: Display charts using ASCII characters
3. **Terminal Commands**: Type commands like "PREDICT BTC" 
4. **Retro Sound Effects**: Optional DOS beeps and boops

## 📊 SUCCESS METRICS

- **Technical**: 8-hour build complete
- **Functional**: All features working
- **Quality**: No critical bugs
- **Business**: Payment flow operational
- **User**: Clear value proposition

---

**This pivot maintains the retro aesthetic while delivering a focused, monetizable product that showcases Claude AI integration.**