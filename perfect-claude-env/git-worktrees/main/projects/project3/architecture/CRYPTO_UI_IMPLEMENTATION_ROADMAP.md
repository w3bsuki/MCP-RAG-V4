# 🎨 Crypto Vision - Modern UI/UX Implementation Roadmap

## 📋 Research Summary (45 Minutes Completed)

Based on comprehensive research of modern crypto trading platforms (Binance, TradingView, Coinbase), design systems, and 2024 UI/UX trends, this roadmap provides ultra-detailed implementation tasks for the Builder.

### Key Research Findings:
- **Minimalist Design**: Clean, uncluttered interfaces with strategic negative space
- **Color Psychology**: Gold/silver for luxury feel, dark themes for reduced eye strain
- **Micro-Interactions**: Essential for user feedback and engagement
- **Performance**: 60fps animations, mobile-first responsive design
- **Accessibility**: WCAG 2.1 AA compliance mandatory

## 🎯 Design System Foundation

### Task: CRYPTO-UI-001 - Design Token System
**Priority**: HIGH | **Estimated**: 3 hours | **Dependencies**: None

**Research Findings Applied**:
- Modern crypto platforms use sophisticated color hierarchies
- Gold/silver accents for premium feel
- Dark-first design reduces eye strain during long trading sessions

**Completion Criteria**:
- [ ] 8-tier color scale system with semantic tokens
- [ ] Typography scale with 6 weight variations
- [ ] Spacing system using 8pt grid
- [ ] Animation easing curves defined
- [ ] CSS variables for theme switching
- [ ] Figma design tokens exported
- [ ] TypeScript token definitions created

**Step-by-Step Implementation**:

1. **Create Design Token Structure**
```bash
mkdir -p src/design-system/tokens
touch src/design-system/tokens/colors.ts
touch src/design-system/tokens/typography.ts
touch src/design-system/tokens/spacing.ts
touch src/design-system/tokens/animations.ts
```

2. **Implement Color System** (File: `src/design-system/tokens/colors.ts`)
```typescript
// Crypto-specific color palette based on research
export const colors = {
  // Base neutral scale (dark-first)
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b'
  },
  
  // Crypto success/danger (green/red for profit/loss)
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    900: '#14532d'
  },
  
  danger: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    900: '#7f1d1d'
  },
  
  // Crypto premium colors (gold/silver)
  premium: {
    gold: '#ffd700',
    silver: '#c0c0c0',
    bronze: '#cd7f32'
  },
  
  // Semantic tokens
  background: {
    primary: 'var(--color-neutral-950)',
    secondary: 'var(--color-neutral-900)',
    tertiary: 'var(--color-neutral-800)'
  },
  
  text: {
    primary: 'var(--color-neutral-50)',
    secondary: 'var(--color-neutral-400)',
    muted: 'var(--color-neutral-600)'
  },
  
  border: {
    default: 'var(--color-neutral-800)',
    muted: 'var(--color-neutral-900)'
  }
}
```

3. **Typography System** (File: `src/design-system/tokens/typography.ts`)
```typescript
// Research: Clean hierarchy essential for data-heavy interfaces
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Monaco', 'monospace']
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }]
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  }
}
```

4. **Animation System** (File: `src/design-system/tokens/animations.ts`)
```typescript
// Research: Smooth micro-interactions crucial for crypto UX
export const animations = {
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '350ms',
    slowest: '500ms'
  },
  
  // Crypto-specific animations
  priceChange: {
    keyframes: {
      flash: {
        '0%': { backgroundColor: 'transparent' },
        '50%': { backgroundColor: 'var(--color-success-500)' },
        '100%': { backgroundColor: 'transparent' }
      }
    },
    duration: '600ms'
  }
}
```

5. **Create Tailwind Config Extension**
```typescript
// tailwind.config.ts - extend with design tokens
import { colors, typography, animations } from './src/design-system/tokens'

export default {
  theme: {
    extend: {
      colors,
      ...typography,
      animation: animations
    }
  }
}
```

**Files to Create**:
- `src/design-system/tokens/colors.ts`
- `src/design-system/tokens/typography.ts`
- `src/design-system/tokens/spacing.ts`
- `src/design-system/tokens/animations.ts`
- `src/design-system/index.ts` (exports)

---

## 📱 Mobile-First Responsive System

### Task: CRYPTO-UI-002 - Responsive Layout System
**Priority**: HIGH | **Estimated**: 2.5 hours | **Dependencies**: CRYPTO-UI-001

**Research Findings Applied**:
- TradingView mobile app provides sophisticated experience
- Multi-monitor desktop setups common for crypto trading
- Mobile-first but desktop-optimized for trading

**Completion Criteria**:
- [ ] Responsive breakpoint system defined
- [ ] Container queries for component adaptation
- [ ] Mobile navigation patterns implemented
- [ ] Desktop multi-panel layouts working
- [ ] Touch-friendly interactions on mobile
- [ ] Keyboard shortcuts for desktop power users

**Step-by-Step Implementation**:

1. **Define Breakpoint System**
```typescript
// src/design-system/tokens/breakpoints.ts
export const breakpoints = {
  xs: '375px',  // Mobile portrait
  sm: '640px',  // Mobile landscape
  md: '768px',  // Tablet
  lg: '1024px', // Desktop
  xl: '1440px', // Large desktop (trading monitors)
  '2xl': '1920px' // Ultra-wide displays
}

// Container queries for component-level responsiveness
export const containers = {
  chart: '500px',    // Chart component breakpoint
  sidebar: '300px',  // Sidebar collapse point
  table: '600px'     // Data table scroll point
}
```

2. **Layout Components**
```typescript
// src/components/layout/ResponsiveContainer.tsx
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveContainer({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn(
      // Mobile-first base styles
      "w-full px-4 sm:px-6",
      // Tablet and up
      "md:px-8 md:max-w-7xl md:mx-auto",
      // Desktop trading layout
      "lg:px-12 xl:max-w-none xl:px-24",
      className
    )}>
      {children}
    </div>
  )
}
```

3. **Mobile Navigation** (File: `src/components/navigation/MobileNav.tsx`)
```typescript
// Research: Mobile crypto apps need quick access to key functions
export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 px-4 py-2">
      <div className="flex justify-around items-center">
        <NavItem icon={TrendingUp} label="Prices" href="/" />
        <NavItem icon={PieChart} label="Portfolio" href="/portfolio" />
        <NavItem icon={Bell} label="Alerts" href="/alerts" />
        <NavItem icon={User} label="Profile" href="/profile" />
      </div>
    </nav>
  )
}

// Touch-friendly nav items (minimum 44px tap target)
function NavItem({ icon: Icon, label, href }: NavItemProps) {
  return (
    <Link 
      href={href}
      className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg transition-colors hover:bg-neutral-800"
    >
      <Icon className="w-5 h-5 mb-1" />
      <span className="text-xs">{label}</span>
    </Link>
  )
}
```

4. **Desktop Multi-Panel Layout**
```typescript
// src/components/layout/TradingLayout.tsx
export function TradingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 h-screen">
      {/* Left sidebar - Market data */}
      <aside className="col-span-3 xl:col-span-2 border-r border-neutral-800">
        <MarketSidebar />
      </aside>
      
      {/* Main content - Charts and trading */}
      <main className="col-span-6 xl:col-span-8">
        {children}
      </main>
      
      {/* Right sidebar - Orders and wallet */}
      <aside className="col-span-3 xl:col-span-2 border-l border-neutral-800">
        <TradingSidebar />
      </aside>
    </div>
  )
}
```

**Files to Create**:
- `src/design-system/tokens/breakpoints.ts`
- `src/components/layout/ResponsiveContainer.tsx`
- `src/components/navigation/MobileNav.tsx`
- `src/components/layout/TradingLayout.tsx`
- `src/hooks/useBreakpoint.ts`

---

## 💰 Advanced Price Display Components

### Task: CRYPTO-UI-003 - Price Display with Animations
**Priority**: HIGH | **Estimated**: 2 hours | **Dependencies**: CRYPTO-UI-001, CRYPTO-UI-002

**Research Findings Applied**:
- Price flash animations are essential for crypto trading
- Color-coded profit/loss indicators universal standard
- Percentage changes more important than absolute values
- Real-time updates must be smooth and performant

**Completion Criteria**:
- [ ] Price flash animation on updates
- [ ] Color-coded profit/loss indicators
- [ ] Percentage change displays
- [ ] Smooth number transitions
- [ ] Loading states with skeleton UI
- [ ] Error states with retry functionality
- [ ] Accessibility-compliant color contrasts

**Step-by-Step Implementation**:

1. **Core Price Component** (File: `src/components/price/PriceDisplay.tsx`)
```typescript
interface PriceDisplayProps {
  symbol: string
  currentPrice: number
  previousPrice?: number
  change24h?: number
  changePercent24h?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCurrency?: boolean
  showChange?: boolean
  showPercentage?: boolean
  flashOnChange?: boolean
}

export function PriceDisplay({
  symbol,
  currentPrice,
  previousPrice,
  change24h,
  changePercent24h,
  size = 'md',
  showCurrency = true,
  showChange = true,
  showPercentage = true,
  flashOnChange = true
}: PriceDisplayProps) {
  const [isFlashing, setIsFlashing] = useState(false)
  const [displayPrice, setDisplayPrice] = useState(currentPrice)
  
  // Smooth price transition
  useEffect(() => {
    if (currentPrice !== displayPrice && flashOnChange) {
      setIsFlashing(true)
      
      // Animate number transition
      const startPrice = displayPrice
      const difference = currentPrice - startPrice
      const startTime = Date.now()
      const duration = 300 // ms
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Smooth easing
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const newPrice = startPrice + (difference * easeOut)
        
        setDisplayPrice(newPrice)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsFlashing(false)
        }
      }
      
      requestAnimationFrame(animate)
    }
  }, [currentPrice, displayPrice, flashOnChange])
  
  // Determine color based on price movement
  const priceColor = useMemo(() => {
    if (!previousPrice) return 'text-neutral-50'
    if (currentPrice > previousPrice) return 'text-success-500'
    if (currentPrice < previousPrice) return 'text-danger-500'
    return 'text-neutral-50'
  }, [currentPrice, previousPrice])
  
  return (
    <div className={cn(
      "flex items-center gap-2",
      sizeVariants[size]
    )}>
      {/* Main price with flash animation */}
      <span 
        className={cn(
          "font-mono font-semibold transition-all duration-300",
          priceColor,
          isFlashing && "animate-flash"
        )}
      >
        {showCurrency && '$'}
        {formatPrice(displayPrice)}
      </span>
      
      {/* 24h change */}
      {showChange && change24h !== undefined && (
        <PriceChange 
          change={change24h}
          changePercent={changePercent24h}
          showPercentage={showPercentage}
          size={size}
        />
      )}
    </div>
  )
}

const sizeVariants = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl"
}
```

2. **Price Change Indicator** (File: `src/components/price/PriceChange.tsx`)
```typescript
interface PriceChangeProps {
  change: number
  changePercent?: number
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function PriceChange({
  change,
  changePercent,
  showPercentage = true,
  size = 'md',
  showIcon = true
}: PriceChangeProps) {
  const isPositive = change >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown
  
  return (
    <div className={cn(
      "flex items-center gap-1 font-medium",
      isPositive ? "text-success-500" : "text-danger-500",
      sizeVariants[size]
    )}>
      {showIcon && <Icon className="w-3 h-3" />}
      
      <span>
        {isPositive ? '+' : ''}
        {formatCurrency(change)}
      </span>
      
      {showPercentage && changePercent !== undefined && (
        <span className="text-xs opacity-75">
          ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </span>
      )}
    </div>
  )
}
```

3. **Price Card Component** (File: `src/components/price/PriceCard.tsx`)
```typescript
// Research: Card layouts common in crypto dashboards
export function PriceCard({
  coin,
  price,
  change24h,
  changePercent24h,
  volume24h,
  marketCap,
  isLoading = false
}: PriceCardProps) {
  if (isLoading) {
    return <PriceCardSkeleton />
  }
  
  return (
    <Card className="p-4 hover:bg-neutral-800/50 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={coin.symbol} className="w-6 h-6" />
          <div>
            <h3 className="font-semibold text-neutral-50">{coin.symbol}</h3>
            <p className="text-xs text-neutral-400">{coin.name}</p>
          </div>
        </div>
        
        <PriceDisplay
          symbol={coin.symbol}
          currentPrice={price.current}
          previousPrice={price.previous}
          size="md"
          showCurrency={true}
        />
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <PriceChange
          change={change24h}
          changePercent={changePercent24h}
          size="sm"
        />
        
        <div className="text-right text-neutral-400">
          <div>Vol: {formatCompactNumber(volume24h)}</div>
          <div>MCap: {formatCompactNumber(marketCap)}</div>
        </div>
      </div>
    </Card>
  )
}
```

4. **Skeleton Loading States**
```typescript
// src/components/price/PriceCardSkeleton.tsx
export function PriceCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <div>
            <Skeleton className="h-4 w-12 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
      
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-16" />
        <div className="text-right">
          <Skeleton className="h-3 w-12 mb-1" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </Card>
  )
}
```

**Files to Create**:
- `src/components/price/PriceDisplay.tsx`
- `src/components/price/PriceChange.tsx`
- `src/components/price/PriceCard.tsx`
- `src/components/price/PriceCardSkeleton.tsx`
- `src/utils/formatters.ts`
- `src/hooks/usePriceAnimation.ts`

---

## 📊 Advanced Chart Components

### Task: CRYPTO-UI-004 - shadcn/ui Chart Customizations
**Priority**: HIGH | **Estimated**: 3 hours | **Dependencies**: CRYPTO-UI-001, CRYPTO-UI-003

**Research Findings Applied**:
- TradingView-style charts are the gold standard
- Multiple timeframes essential (1m, 5m, 1h, 1d, 1w)
- Technical indicators must be overlayable
- Real-time updates without performance degradation

**Completion Criteria**:
- [ ] Candlestick chart component
- [ ] Line chart for price history
- [ ] Volume bars integration
- [ ] Technical indicator overlays (MA, RSI, MACD)
- [ ] Timeframe selector
- [ ] Zoom and pan functionality
- [ ] Real-time data integration
- [ ] Responsive chart sizing

**Step-by-Step Implementation**:

1. **Install Required Dependencies**
```bash
npm install recharts d3-scale d3-array date-fns
npm install -D @types/d3-scale @types/d3-array
```

2. **Chart Container Component** (File: `src/components/charts/ChartContainer.tsx`)
```typescript
interface ChartContainerProps {
  title?: string
  timeframe?: string
  children: React.ReactNode
  height?: number
  loading?: boolean
  error?: string
  tools?: React.ReactNode
}

export function ChartContainer({
  title,
  timeframe,
  children,
  height = 400,
  loading = false,
  error,
  tools
}: ChartContainerProps) {
  return (
    <Card className="p-4">
      {/* Chart header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {title && (
            <h3 className="text-lg font-semibold text-neutral-50">{title}</h3>
          )}
          {timeframe && (
            <Badge variant="secondary" className="text-xs">
              {timeframe}
            </Badge>
          )}
        </div>
        
        {tools && (
          <div className="flex items-center gap-2">
            {tools}
          </div>
        )}
      </div>
      
      {/* Chart content */}
      <div 
        className="w-full relative"
        style={{ height }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-danger-500 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">{error}</p>
            </div>
          </div>
        )}
        
        {!loading && !error && children}
      </div>
    </Card>
  )
}
```

3. **Price Chart Component** (File: `src/components/charts/PriceChart.tsx`)
```typescript
interface PriceChartProps {
  data: PriceDataPoint[]
  timeframe: string
  showVolume?: boolean
  showMA?: boolean
  height?: number
}

interface PriceDataPoint {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function PriceChart({
  data,
  timeframe,
  showVolume = true,
  showMA = false,
  height = 400
}: PriceChartProps) {
  // Process data for moving average
  const processedData = useMemo(() => {
    if (!showMA) return data
    
    return data.map((point, index) => {
      if (index < 20) return { ...point, ma20: null }
      
      const ma20 = data
        .slice(index - 19, index + 1)
        .reduce((sum, p) => sum + p.close, 0) / 20
        
      return { ...point, ma20 }
    })
  }, [data, showMA])
  
  return (
    <ChartContainer
      title="Price Chart"
      timeframe={timeframe}
      height={height}
      tools={<ChartTools />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={processedData}>
          {/* Grid */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgb(63 63 70)" 
            vertical={false}
          />
          
          {/* Axes */}
          <XAxis
            dataKey="timestamp"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'rgb(161 161 170)' }}
            tickFormatter={(value) => formatTimeForChart(value, timeframe)}
          />
          <YAxis
            domain={['dataMin - 50', 'dataMax + 50']}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'rgb(161 161 170)' }}
            tickFormatter={(value) => formatPrice(value)}
          />
          
          {/* Volume bars (bottom) */}
          {showVolume && (
            <Bar
              dataKey="volume"
              fill="rgb(113 113 122)"
              opacity={0.3}
              yAxisId="volume"
            />
          )}
          
          {/* Price line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="rgb(34 197 94)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'rgb(34 197 94)' }}
          />
          
          {/* Moving average */}
          {showMA && (
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="rgb(255 215 0)"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
          
          {/* Tooltip */}
          <Tooltip
            content={<PriceChartTooltip />}
            cursor={{ stroke: 'rgb(113 113 122)', strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
```

4. **Candlestick Chart** (File: `src/components/charts/CandlestickChart.tsx`)
```typescript
// Custom candlestick implementation using Recharts
export function CandlestickChart({ data, height = 400 }: CandlestickChartProps) {
  return (
    <ChartContainer title="Candlestick Chart" height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(63 63 70)" />
          
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => format(new Date(value), 'HH:mm')}
          />
          <YAxis
            domain={['dataMin - 10', 'dataMax + 10']}
            tickFormatter={(value) => formatPrice(value)}
          />
          
          {/* Candlestick bodies */}
          <Bar dataKey="body" fill={(entry) => getCandleColor(entry)} />
          
          {/* Wicks */}
          <Line dataKey="wick" stroke="currentColor" strokeWidth={1} />
          
          <Tooltip content={<CandlestickTooltip />} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

function getCandleColor(data: PriceDataPoint) {
  return data.close >= data.open ? 'rgb(34 197 94)' : 'rgb(239 68 68)'
}
```

5. **Chart Controls** (File: `src/components/charts/ChartControls.tsx`)
```typescript
export function ChartControls({
  timeframe,
  onTimeframeChange,
  showVolume,
  onShowVolumeChange,
  showMA,
  onShowMAChange
}: ChartControlsProps) {
  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
    { value: '1w', label: '1w' }
  ]
  
  return (
    <div className="flex items-center gap-4">
      {/* Timeframe selector */}
      <div className="flex gap-1">
        {timeframes.map(({ value, label }) => (
          <Button
            key={value}
            variant={timeframe === value ? "default" : "ghost"}
            size="sm"
            onClick={() => onTimeframeChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Indicators */}
      <div className="flex items-center gap-2">
        <Switch
          checked={showVolume}
          onCheckedChange={onShowVolumeChange}
          id="show-volume"
        />
        <Label htmlFor="show-volume" className="text-sm">Volume</Label>
        
        <Switch
          checked={showMA}
          onCheckedChange={onShowMAChange}
          id="show-ma"
        />
        <Label htmlFor="show-ma" className="text-sm">MA20</Label>
      </div>
    </div>
  )
}
```

**Files to Create**:
- `src/components/charts/ChartContainer.tsx`
- `src/components/charts/PriceChart.tsx`
- `src/components/charts/CandlestickChart.tsx`
- `src/components/charts/ChartControls.tsx`
- `src/components/charts/ChartTooltip.tsx`
- `src/hooks/useChartData.ts`
- `src/utils/chartFormatters.ts`

---

## 🔔 Notification System

### Task: CRYPTO-UI-005 - Toast & Alert Components
**Priority**: MEDIUM | **Estimated**: 1.5 hours | **Dependencies**: CRYPTO-UI-001

**Research Findings Applied**:
- Crypto platforms need instant feedback for actions
- Toast notifications for price alerts essential
- Different severity levels (success, warning, error)
- Should not block trading interface

**Completion Criteria**:
- [ ] Toast notification system
- [ ] Alert banners for important updates
- [ ] Sound notifications for price alerts
- [ ] Dismissible and auto-dismissing toasts
- [ ] Queue management for multiple notifications
- [ ] Accessibility compliance (screen readers)

**Step-by-Step Implementation**:

1. **Toast Provider Setup** (File: `src/components/notifications/ToastProvider.tsx`)
```typescript
interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nanoid()
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-dismiss
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }
    
    // Play sound for price alerts
    if (toast.type === 'warning' || toast.type === 'error') {
      playNotificationSound()
    }
  }, [])
  
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  )
}
```

2. **Toast Component** (File: `src/components/notifications/Toast.tsx`)
```typescript
export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = getToastIcon(toast.type)
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm",
        "animate-in slide-in-from-right-full duration-300",
        "max-w-sm shadow-lg",
        getToastStyles(toast.type)
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{toast.title}</div>
        {toast.description && (
          <div className="text-sm opacity-90 mt-1">{toast.description}</div>
        )}
        
        {toast.action && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 mt-2 text-xs underline"
            onClick={toast.action.onClick}
          >
            {toast.action.label}
          </Button>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-1 -mr-1 -mt-1"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

function getToastStyles(type: Toast['type']) {
  switch (type) {
    case 'success':
      return 'bg-success-950 border-success-800 text-success-50'
    case 'error':
      return 'bg-danger-950 border-danger-800 text-danger-50'
    case 'warning':
      return 'bg-yellow-950 border-yellow-800 text-yellow-50'
    default:
      return 'bg-neutral-900 border-neutral-700 text-neutral-50'
  }
}
```

3. **Price Alert Component** (File: `src/components/notifications/PriceAlert.tsx`)
```typescript
interface PriceAlertProps {
  coin: string
  currentPrice: number
  targetPrice: number
  type: 'above' | 'below'
  onDismiss: () => void
  onViewChart: () => void
}

export function PriceAlert({
  coin,
  currentPrice,
  targetPrice,
  type,
  onDismiss,
  onViewChart
}: PriceAlertProps) {
  const { addToast } = useToast()
  
  useEffect(() => {
    addToast({
      type: 'warning',
      title: `${coin} Price Alert`,
      description: `${coin} has ${type === 'above' ? 'risen above' : 'fallen below'} $${targetPrice.toFixed(2)}. Current price: $${currentPrice.toFixed(2)}`,
      duration: 0, // Don't auto-dismiss
      action: {
        label: 'View Chart',
        onClick: onViewChart
      }
    })
  }, [])
  
  return null // Toast handles the UI
}
```

**Files to Create**:
- `src/components/notifications/ToastProvider.tsx`
- `src/components/notifications/Toast.tsx`
- `src/components/notifications/PriceAlert.tsx`
- `src/hooks/useToast.ts`
- `src/utils/notifications.ts`

---

## 🌙 Theme System

### Task: CRYPTO-UI-006 - Dark/Light Theme Implementation
**Priority**: MEDIUM | **Estimated**: 2 hours | **Dependencies**: CRYPTO-UI-001

**Research Findings Applied**:
- Dark themes reduce eye strain for long trading sessions
- Smooth transitions between themes improve UX
- System preference detection expected behavior
- Theme persistence across sessions

**Step-by-Step Implementation**:

1. **Theme Provider** (File: `src/components/theme/ThemeProvider.tsx`)
```typescript
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')
  
  useEffect(() => {
    const stored = localStorage.getItem('crypto-vision-theme')
    if (stored) setTheme(stored as any)
  }, [])
  
  useEffect(() => {
    const root = document.documentElement
    const resolved = theme === 'system' 
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme
    
    setResolvedTheme(resolved)
    root.classList.toggle('dark', resolved === 'dark')
  }, [theme])
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

2. **Theme Toggle Component**
```typescript
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## ⚡ Performance Optimization

### Task: CRYPTO-UI-007 - 60fps Animation Performance
**Priority**: MEDIUM | **Estimated**: 2 hours | **Dependencies**: All UI components

**Completion Criteria**:
- [ ] All animations run at 60fps on mobile
- [ ] Proper use of transform/opacity for GPU acceleration
- [ ] Virtual scrolling for large data lists
- [ ] Memoization of expensive calculations
- [ ] Bundle size optimization

**Key Optimizations**:
```typescript
// Use transform for smooth animations
.price-flash {
  transform: scale(1.05);
  transition: transform 150ms ease-out;
}

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window'

// Memoize expensive components
const MemoizedPriceCard = memo(PriceCard)
```

---

## ♿ Accessibility Implementation

### Task: CRYPTO-UI-008 - WCAG 2.1 AA Compliance
**Priority**: MEDIUM | **Estimated**: 1.5 hours | **Dependencies**: All UI components

**Completion Criteria**:
- [ ] Color contrast ratios meet AA standards
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announcements for price changes
- [ ] Focus management in modals/dropdowns
- [ ] Semantic HTML structure

---

## 🎯 Implementation Priority Order

1. **CRYPTO-UI-001** - Design System (Foundation)
2. **CRYPTO-UI-002** - Responsive Layout
3. **CRYPTO-UI-003** - Price Display Components
4. **CRYPTO-UI-004** - Chart Components
5. **CRYPTO-UI-005** - Notifications
6. **CRYPTO-UI-006** - Theme System
7. **CRYPTO-UI-007** - Performance
8. **CRYPTO-UI-008** - Accessibility

## 🚀 Ready for Builder Implementation

Each task includes:
- ✅ **Ultra-detailed specifications**
- ✅ **Step-by-step implementation guides**
- ✅ **Exact code examples**
- ✅ **File structure requirements**
- ✅ **Modern best practices applied**

**Total Estimated Time**: 17 hours
**Research Complete**: 45 minutes
**Ready for Development**: ✅

Builder can start immediately with CRYPTO-UI-001 and work through sequentially!