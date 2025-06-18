import { type SubscriptionTier } from './stripe';

// Simple user session interface for demo
export interface UserSession {
  id: string;
  email: string;
  tier: SubscriptionTier;
  customerId?: string;
  subscriptionId?: string;
  createdAt: string;
  lastLogin: string;
}

// Mock users for demonstration
const MOCK_USERS: Record<string, UserSession> = {
  'free@example.com': {
    id: 'user_free_001',
    email: 'free@example.com',
    tier: 'FREE',
    createdAt: '2025-06-17T19:00:00Z',
    lastLogin: new Date().toISOString()
  },
  'pro@example.com': {
    id: 'user_pro_001',
    email: 'pro@example.com',
    tier: 'PRO',
    customerId: 'cus_stripe_pro_001',
    subscriptionId: 'sub_stripe_pro_001',
    createdAt: '2025-06-16T19:00:00Z',
    lastLogin: new Date().toISOString()
  },
  'team@example.com': {
    id: 'user_team_001',
    email: 'team@example.com',
    tier: 'TEAM',
    customerId: 'cus_stripe_team_001',
    subscriptionId: 'sub_stripe_team_001',
    createdAt: '2025-06-15T19:00:00Z',
    lastLogin: new Date().toISOString()
  }
};

// Demo auth service (in production, use proper auth like Clerk/Auth0)
export class AuthService {
  private static readonly SESSION_KEY = 'cryptovision_session';
  
  // Get current user session from localStorage (client-side only)
  static getCurrentUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;
      
      return JSON.parse(sessionData);
    } catch {
      return null;
    }
  }

  // Login with email (demo - just selects from mock users)
  static login(email: string): UserSession | null {
    const user = MOCK_USERS[email.toLowerCase()];
    if (!user) return null;

    // Update last login
    user.lastLogin = new Date().toISOString();
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    }
    
    return user;
  }

  // Logout
  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_KEY);
    }
  }

  // Update user tier (after successful payment)
  static updateUserTier(tier: SubscriptionTier, customerId?: string, subscriptionId?: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    currentUser.tier = tier;
    if (customerId) currentUser.customerId = customerId;
    if (subscriptionId) currentUser.subscriptionId = subscriptionId;

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(currentUser));
    }

    return true;
  }

  // Check if user has access to a feature
  static hasAccess(feature: 'ai_predictions' | 'unlimited_portfolio' | 'api_access' | 'team_features'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    switch (feature) {
      case 'ai_predictions':
        return user.tier !== 'FREE';
      case 'unlimited_portfolio':
        return user.tier !== 'FREE';
      case 'api_access':
        return user.tier === 'TEAM';
      case 'team_features':
        return user.tier === 'TEAM';
      default:
        return true;
    }
  }

  // Get usage limits for current user
  static getUsageLimits(): {
    predictionsPerDay: number;
    portfolioItems: number;
    apiCalls: number;
  } {
    const user = this.getCurrentUser();
    const tier = user?.tier || 'FREE';

    switch (tier) {
      case 'PRO':
      case 'TEAM':
        return {
          predictionsPerDay: -1, // unlimited
          portfolioItems: -1, // unlimited
          apiCalls: -1 // unlimited
        };
      case 'FREE':
      default:
        return {
          predictionsPerDay: 100,
          portfolioItems: 5,
          apiCalls: 100
        };
    }
  }

  // Generate auth token for API requests (in demo, just return user email)
  static getAuthToken(): string | null {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    // In production, return JWT or actual auth token
    return `Bearer ${user.tier.toLowerCase()}-mock-token`;
  }

  // Validate auth token (for API routes)
  static validateToken(authHeader: string | null): { user: UserSession | null; isPremium: boolean } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, isPremium: false };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Demo token validation
    if (token === 'premium-mock-token' || token === 'pro-mock-token') {
      return {
        user: MOCK_USERS['pro@example.com'],
        isPremium: true
      };
    }
    
    if (token === 'team-mock-token') {
      return {
        user: MOCK_USERS['team@example.com'],
        isPremium: true
      };
    }

    // Default to free user
    return {
      user: MOCK_USERS['free@example.com'],
      isPremium: false
    };
  }

  // Get all mock users (for demo purposes)
  static getMockUsers(): Record<string, UserSession> {
    return MOCK_USERS;
  }
}