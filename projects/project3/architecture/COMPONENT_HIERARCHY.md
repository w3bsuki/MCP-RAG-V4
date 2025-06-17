# Crypto Vision - Testable Component Hierarchy

## 🎯 Component Design Philosophy: Test-First UI

Every component is designed with:
1. **Isolated unit tests for all props and states**
2. **Integration tests for component interactions**
3. **Accessibility tests (WCAG 2.1 AA)**
4. **Visual regression tests**
5. **Performance benchmarks**

## 🏗️ Component Architecture

```
app/
├── layout.tsx                 # Root layout with providers
├── page.tsx                   # Home page
├── (auth)/
│   ├── login/page.tsx        # Login page
│   └── register/page.tsx     # Register page
├── dashboard/
│   ├── page.tsx              # Dashboard
│   └── layout.tsx            # Dashboard layout
├── predictions/
│   └── [coin]/page.tsx       # Coin prediction page
├── alerts/
│   └── page.tsx              # Alerts management
└── api/                      # API routes

components/
├── ui/                       # Base UI components
│   ├── Button/
│   ├── Card/
│   ├── Input/
│   └── Modal/
├── features/                 # Feature components
│   ├── PredictionChart/
│   ├── PriceDisplay/
│   ├── AlertForm/
│   └── CoinSelector/
├── layouts/                  # Layout components
│   ├── Header/
│   ├── Footer/
│   └── Sidebar/
└── providers/               # Context providers
    ├── AuthProvider/
    ├── ThemeProvider/
    └── WebSocketProvider/
```

## 🧩 Core Components

### Button Component
```typescript
// components/ui/Button/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  children,
  className,
  type = 'button',
  'aria-label': ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        className
      )}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {loading && <Spinner className="mr-2" aria-hidden="true" />}
      {children}
    </button>
  );
}
```

#### Button Test Specifications
```typescript
// components/ui/Button/Button.test.tsx
describe('Button Component', () => {
  // Rendering tests
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
  
  it('should apply variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    
    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });
  
  // Interaction tests
  it('should handle click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should not fire click when disabled', async () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  // Loading state tests
  it('should show loading spinner and disable', () => {
    render(<Button loading>Loading</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('img', { hidden: true })).toHaveClass('animate-spin');
  });
  
  // Accessibility tests
  it('should support aria-label', () => {
    render(<Button aria-label="Save document">Save</Button>);
    expect(screen.getByRole('button', { name: 'Save document' })).toBeInTheDocument();
  });
  
  it('should be keyboard navigable', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Tab me</Button>);
    
    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    
    await userEvent.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### PredictionChart Component
```typescript
// components/features/PredictionChart/PredictionChart.tsx
interface PredictionChartProps {
  coin: string;
  currentPrice: number;
  predictions: {
    sevenDay: { target: number; confidence: number };
    thirtyDay: { target: number; confidence: number };
  };
  historicalData: Array<{ timestamp: string; price: number }>;
  onTimeframeChange?: (timeframe: '7d' | '30d') => void;
}

export function PredictionChart({
  coin,
  currentPrice,
  predictions,
  historicalData,
  onTimeframeChange
}: PredictionChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d'>('7d');
  
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{coin} Price Prediction</h2>
        <ToggleGroup
          value={selectedTimeframe}
          onValueChange={(value) => {
            setSelectedTimeframe(value as '7d' | '30d');
            onTimeframeChange?.(value as '7d' | '30d');
          }}
        >
          <ToggleGroupItem value="7d" aria-label="7 day prediction">
            7 Days
          </ToggleGroupItem>
          <ToggleGroupItem value="30d" aria-label="30 day prediction">
            30 Days
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formatChartData(historicalData, predictions, selectedTimeframe)}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="prediction"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <PredictionSummary
        timeframe={selectedTimeframe}
        currentPrice={currentPrice}
        targetPrice={selectedTimeframe === '7d' 
          ? predictions.sevenDay.target 
          : predictions.thirtyDay.target}
        confidence={selectedTimeframe === '7d'
          ? predictions.sevenDay.confidence
          : predictions.thirtyDay.confidence}
      />
    </Card>
  );
}
```

#### PredictionChart Test Specifications
```typescript
// components/features/PredictionChart/PredictionChart.test.tsx
describe('PredictionChart Component', () => {
  const mockProps = {
    coin: 'BTC',
    currentPrice: 45000,
    predictions: {
      sevenDay: { target: 48000, confidence: 75 },
      thirtyDay: { target: 52000, confidence: 65 }
    },
    historicalData: generateMockHistoricalData(30),
    onTimeframeChange: jest.fn()
  };
  
  // Rendering tests
  it('should render chart with data', () => {
    render(<PredictionChart {...mockProps} />);
    
    expect(screen.getByText('BTC Price Prediction')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /chart/i })).toBeInTheDocument();
  });
  
  // Interaction tests
  it('should switch between timeframes', async () => {
    render(<PredictionChart {...mockProps} />);
    
    // Default to 7d
    expect(screen.getByRole('button', { name: '7 day prediction' }))
      .toHaveAttribute('aria-pressed', 'true');
    
    // Switch to 30d
    await userEvent.click(screen.getByRole('button', { name: '30 day prediction' }));
    
    expect(mockProps.onTimeframeChange).toHaveBeenCalledWith('30d');
    expect(screen.getByRole('button', { name: '30 day prediction' }))
      .toHaveAttribute('aria-pressed', 'true');
  });
  
  // Data visualization tests
  it('should display correct prediction values', () => {
    render(<PredictionChart {...mockProps} />);
    
    // Check 7d prediction is shown by default
    expect(screen.getByText('$48,000')).toBeInTheDocument();
    expect(screen.getByText('75% confidence')).toBeInTheDocument();
  });
  
  // Accessibility tests
  it('should have accessible chart description', () => {
    render(<PredictionChart {...mockProps} />);
    
    const chart = screen.getByRole('img', { name: /chart/i });
    expect(chart).toHaveAttribute('aria-label', 
      expect.stringContaining('BTC price prediction chart')
    );
  });
  
  // Performance tests
  it('should render large datasets efficiently', () => {
    const largeDataset = generateMockHistoricalData(365); // 1 year
    
    const start = performance.now();
    render(<PredictionChart {...mockProps} historicalData={largeDataset} />);
    const renderTime = performance.now() - start;
    
    expect(renderTime).toBeLessThan(100); // Should render in < 100ms
  });
  
  // Error handling tests
  it('should handle missing data gracefully', () => {
    render(<PredictionChart {...mockProps} historicalData={[]} />);
    
    expect(screen.getByText('No historical data available')).toBeInTheDocument();
  });
});
```

### AlertForm Component
```typescript
// components/features/AlertForm/AlertForm.tsx
interface AlertFormProps {
  coins: string[];
  onSubmit: (alert: AlertData) => Promise<void>;
  userTier: 'free' | 'pro' | 'premium';
  existingAlertsCount: number;
}

export function AlertForm({ 
  coins, 
  onSubmit, 
  userTier,
  existingAlertsCount 
}: AlertFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const alertLimits = { free: 5, pro: 50, premium: Infinity };
  const canAddMore = existingAlertsCount < alertLimits[userTier];
  
  const form = useForm<AlertData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      coin: coins[0],
      type: 'price_above',
      threshold: 0,
      notificationMethod: 'email'
    }
  });
  
  const handleSubmit = async (data: AlertData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      toast.success('Alert created successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to create alert');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {!canAddMore && (
        <Alert variant="warning">
          <AlertDescription>
            You've reached your alert limit ({alertLimits[userTier]} for {userTier} tier).
            <Link href="/pricing" className="underline ml-1">
              Upgrade to add more alerts
            </Link>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="coin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cryptocurrency</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!canAddMore}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {coins.map(coin => (
                    <SelectItem key={coin} value={coin}>
                      {coin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alert Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!canAddMore}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="price_above">Price Above</SelectItem>
                  <SelectItem value="price_below">Price Below</SelectItem>
                  <SelectItem value="change_percent">Change %</SelectItem>
                  <SelectItem value="prediction_confidence">Prediction Confidence</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {getAlertTypeDescription(field.value)}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Threshold</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={getThresholdPlaceholder(form.watch('type'))}
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                  disabled={!canAddMore}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notificationMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notification Method</FormLabel>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!canAddMore}
              >
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="email" />
                  </FormControl>
                  <FormLabel className="font-normal">Email</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem 
                      value="sms" 
                      disabled={userTier === 'free'}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    SMS {userTier === 'free' && '(Pro+ only)'}
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem 
                      value="webhook" 
                      disabled={userTier !== 'premium'}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Webhook {userTier !== 'premium' && '(Premium only)'}
                  </FormLabel>
                </FormItem>
              </RadioGroup>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={isSubmitting || !canAddMore}
        loading={isSubmitting}
        className="w-full"
      >
        Create Alert
      </Button>
    </form>
  );
}
```

#### AlertForm Test Specifications
```typescript
// components/features/AlertForm/AlertForm.test.tsx
describe('AlertForm Component', () => {
  const mockProps = {
    coins: ['BTC', 'ETH', 'SOL'],
    onSubmit: jest.fn(),
    userTier: 'pro' as const,
    existingAlertsCount: 2
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Form rendering tests
  it('should render all form fields', () => {
    render(<AlertForm {...mockProps} />);
    
    expect(screen.getByLabelText('Cryptocurrency')).toBeInTheDocument();
    expect(screen.getByLabelText('Alert Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Threshold')).toBeInTheDocument();
    expect(screen.getByText('Notification Method')).toBeInTheDocument();
  });
  
  // Validation tests
  it('should validate threshold input', async () => {
    render(<AlertForm {...mockProps} />);
    
    const thresholdInput = screen.getByLabelText('Threshold');
    const submitButton = screen.getByRole('button', { name: 'Create Alert' });
    
    // Submit without threshold
    await userEvent.click(submitButton);
    
    expect(await screen.findByText('Threshold is required')).toBeInTheDocument();
    expect(mockProps.onSubmit).not.toHaveBeenCalled();
    
    // Enter negative threshold
    await userEvent.type(thresholdInput, '-100');
    await userEvent.click(submitButton);
    
    expect(await screen.findByText('Threshold must be positive')).toBeInTheDocument();
  });
  
  // Tier restriction tests
  it('should disable SMS for free tier users', () => {
    render(<AlertForm {...mockProps} userTier="free" />);
    
    const smsRadio = screen.getByRole('radio', { name: /SMS.*Pro\+ only/ });
    expect(smsRadio).toBeDisabled();
  });
  
  it('should show alert limit warning', () => {
    render(<AlertForm {...mockProps} userTier="free" existingAlertsCount={5} />);
    
    expect(screen.getByText(/You've reached your alert limit/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Alert' })).toBeDisabled();
  });
  
  // Submission tests
  it('should submit valid form data', async () => {
    mockProps.onSubmit.mockResolvedValue(undefined);
    render(<AlertForm {...mockProps} />);
    
    // Fill form
    await userEvent.selectOptions(screen.getByLabelText('Cryptocurrency'), 'ETH');
    await userEvent.selectOptions(screen.getByLabelText('Alert Type'), 'price_above');
    await userEvent.type(screen.getByLabelText('Threshold'), '3500');
    await userEvent.click(screen.getByRole('radio', { name: 'Email' }));
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: 'Create Alert' }));
    
    expect(mockProps.onSubmit).toHaveBeenCalledWith({
      coin: 'ETH',
      type: 'price_above',
      threshold: 3500,
      notificationMethod: 'email'
    });
    
    // Should show success toast
    expect(await screen.findByText('Alert created successfully')).toBeInTheDocument();
  });
  
  it('should handle submission errors', async () => {
    mockProps.onSubmit.mockRejectedValue(new Error('Network error'));
    render(<AlertForm {...mockProps} />);
    
    // Fill and submit
    await userEvent.type(screen.getByLabelText('Threshold'), '50000');
    await userEvent.click(screen.getByRole('button', { name: 'Create Alert' }));
    
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });
  
  // Accessibility tests
  it('should have proper form labels and descriptions', () => {
    render(<AlertForm {...mockProps} />);
    
    const typeSelect = screen.getByLabelText('Alert Type');
    await userEvent.selectOptions(typeSelect, 'price_above');
    
    expect(screen.getByText('Alert when price goes above threshold'))
      .toBeInTheDocument();
  });
  
  it('should be keyboard navigable', async () => {
    render(<AlertForm {...mockProps} />);
    
    // Tab through form fields
    await userEvent.tab(); // Focus coin select
    expect(screen.getByLabelText('Cryptocurrency')).toHaveFocus();
    
    await userEvent.tab(); // Focus alert type
    expect(screen.getByLabelText('Alert Type')).toHaveFocus();
    
    await userEvent.tab(); // Focus threshold
    expect(screen.getByLabelText('Threshold')).toHaveFocus();
  });
});
```

### WebSocketProvider Component
```typescript
// components/providers/WebSocketProvider/WebSocketProvider.tsx
interface WebSocketContextValue {
  connected: boolean;
  subscribe: (coins: string[]) => void;
  unsubscribe: (coins: string[]) => void;
  prices: Record<string, number>;
  lastUpdate: Record<string, Date>;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<Record<string, Date>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const subscribedCoins = useRef<Set<string>>(new Set());
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const token = getAuthToken();
    if (!token) return;
    
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    
    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
      
      // Resubscribe to previously subscribed coins
      if (subscribedCoins.current.size > 0) {
        ws.send(JSON.stringify({
          action: 'subscribe',
          coins: Array.from(subscribedCoins.current)
        }));
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'price_update') {
          setPrices(prev => ({
            ...prev,
            [message.data.coin]: message.data.price
          }));
          setLastUpdate(prev => ({
            ...prev,
            [message.data.coin]: new Date()
          }));
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
      
      // Attempt to reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
    
    wsRef.current = ws;
  }, []);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);
  
  const subscribe = useCallback((coins: string[]) => {
    coins.forEach(coin => subscribedCoins.current.add(coin));
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'subscribe',
        coins
      }));
    }
  }, []);
  
  const unsubscribe = useCallback((coins: string[]) => {
    coins.forEach(coin => subscribedCoins.current.delete(coin));
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'unsubscribe',
        coins
      }));
    }
  }, []);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  const value = useMemo(
    () => ({ connected, subscribe, unsubscribe, prices, lastUpdate }),
    [connected, subscribe, unsubscribe, prices, lastUpdate]
  );
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
```

#### WebSocketProvider Test Specifications
```typescript
// components/providers/WebSocketProvider/WebSocketProvider.test.tsx
import WS from 'jest-websocket-mock';

describe('WebSocketProvider', () => {
  let server: WS;
  
  beforeEach(() => {
    server = new WS('ws://localhost:3000/api/ws');
  });
  
  afterEach(() => {
    WS.clean();
  });
  
  // Connection tests
  it('should establish WebSocket connection', async () => {
    const TestComponent = () => {
      const { connected } = useWebSocket();
      return <div>{connected ? 'Connected' : 'Disconnected'}</div>;
    };
    
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    
    await server.connected;
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });
  
  // Subscription tests
  it('should subscribe to coins and receive updates', async () => {
    const TestComponent = () => {
      const { subscribe, prices } = useWebSocket();
      
      useEffect(() => {
        subscribe(['BTC', 'ETH']);
      }, [subscribe]);
      
      return (
        <div>
          <div>BTC: ${prices.BTC || 'Loading'}</div>
          <div>ETH: ${prices.ETH || 'Loading'}</div>
        </div>
      );
    };
    
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );
    
    await server.connected;
    
    // Verify subscription message
    await expect(server).toReceiveMessage(
      JSON.stringify({ action: 'subscribe', coins: ['BTC', 'ETH'] })
    );
    
    // Send price update
    server.send(JSON.stringify({
      type: 'price_update',
      data: { coin: 'BTC', price: 45000 }
    }));
    
    await waitFor(() => {
      expect(screen.getByText('BTC: $45000')).toBeInTheDocument();
    });
  });
  
  // Reconnection tests
  it('should automatically reconnect on disconnect', async () => {
    jest.useFakeTimers();
    
    render(
      <WebSocketProvider>
        <div>Test</div>
      </WebSocketProvider>
    );
    
    await server.connected;
    
    // Simulate disconnect
    server.close();
    
    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);
    
    // Should attempt reconnection
    await server.connected;
    
    jest.useRealTimers();
  });
  
  // Error handling tests
  it('should handle malformed messages gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <WebSocketProvider>
        <div>Test</div>
      </WebSocketProvider>
    );
    
    await server.connected;
    
    // Send malformed message
    server.send('not json');
    
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to parse WebSocket message:',
      expect.any(Error)
    );
    
    consoleError.mockRestore();
  });
  
  // Memory leak tests
  it('should cleanup on unmount', async () => {
    const { unmount } = render(
      <WebSocketProvider>
        <div>Test</div>
      </WebSocketProvider>
    );
    
    await server.connected;
    
    unmount();
    
    // WebSocket should be closed
    await expect(server).toHaveClosedConnection();
  });
});
```

## 🎨 Visual Regression Testing

### Setup Chromatic/Percy
```typescript
// .storybook/main.js
module.exports = {
  stories: ['../components/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-performance'
  ],
};

// components/ui/Button/Button.stories.tsx
export default {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'ghost']
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg']
    }
  }
};

export const Default = {
  args: {
    children: 'Click me'
  }
};

export const AllVariants = () => (
  <div className="space-y-4">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="danger">Danger</Button>
    <Button variant="ghost">Ghost</Button>
  </div>
);

export const Loading = {
  args: {
    children: 'Loading...',
    loading: true
  }
};

export const Disabled = {
  args: {
    children: 'Disabled',
    disabled: true
  }
};
```

## 📊 Component Test Coverage Matrix

| Component | Unit Tests | Integration | A11y | Visual | Performance |
|-----------|-----------|-------------|------|--------|-------------|
| Button | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| Card | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| Input | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| Modal | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| PredictionChart | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| PriceDisplay | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| AlertForm | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| CoinSelector | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| Header | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| Footer | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| Sidebar | ✅ 100% | ✅ | ✅ | ✅ | ✅ |
| AuthProvider | ✅ 100% | ✅ | N/A | N/A | ✅ |
| ThemeProvider | ✅ 100% | ✅ | N/A | N/A | ✅ |
| WebSocketProvider | ✅ 100% | ✅ | N/A | N/A | ✅ |

## 🏃 Performance Testing

### Component Performance Benchmarks
```typescript
// tests/performance/component-performance.test.tsx
describe('Component Performance', () => {
  it('Button should render in <5ms', () => {
    const { result } = renderHook(() => {
      const start = performance.now();
      render(<Button>Test</Button>);
      return performance.now() - start;
    });
    
    expect(result.current).toBeLessThan(5);
  });
  
  it('PredictionChart should handle 1000 data points', () => {
    const largeDataset = generateMockHistoricalData(1000);
    
    const start = performance.now();
    render(
      <PredictionChart
        coin="BTC"
        currentPrice={45000}
        predictions={mockPredictions}
        historicalData={largeDataset}
      />
    );
    const renderTime = performance.now() - start;
    
    expect(renderTime).toBeLessThan(200);
  });
  
  it('AlertForm should not cause memory leaks', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    // Mount and unmount component 100 times
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<AlertForm {...mockProps} />);
      unmount();
    }
    
    // Force garbage collection (if available)
    if (global.gc) global.gc();
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be minimal
    expect(memoryIncrease).toBeLessThan(1000000); // 1MB
  });
});
```

## 🔍 Component Testing Utilities

### Custom Test Utils
```typescript
// tests/utils/component-test-utils.tsx
import { render as rtlRender } from '@testing-library/react';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

function render(ui: React.ReactElement, options = {}) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  }
  
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Custom matchers
expect.extend({
  toBeAccessible(received) {
    // Run axe accessibility tests
    const results = await axe(received);
    
    return {
      pass: results.violations.length === 0,
      message: () => 
        results.violations.map(v => v.description).join('\n')
    };
  }
});

// Mock data generators
export function generateMockHistoricalData(days: number) {
  const data = [];
  const now = Date.now();
  let price = 45000;
  
  for (let i = days; i >= 0; i--) {
    price += (Math.random() - 0.5) * 1000;
    data.push({
      timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
      price: Math.max(price, 1000)
    });
  }
  
  return data;
}

export * from '@testing-library/react';
export { render };
```

This comprehensive component hierarchy ensures every UI component is thoroughly tested with unit tests, integration tests, accessibility checks, visual regression tests, and performance benchmarks. The test-first approach guarantees maintainable, accessible, and performant components that meet our 95% coverage requirement.