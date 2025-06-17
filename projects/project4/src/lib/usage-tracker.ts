import { type SubscriptionTier } from './stripe';
import { AuthService } from './auth';

export interface UsageData {
  userId: string;
  date: string; // YYYY-MM-DD format
  predictions: number;
  apiCalls: number;
  portfolioItems: number;
}

export interface UsageLimits {
  predictionsPerDay: number;
  portfolioItems: number;
  apiCalls: number;
}

export class UsageTracker {
  private static readonly STORAGE_KEY = 'cryptovision_usage';

  // Get today's date in YYYY-MM-DD format
  private static getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Get usage data from localStorage
  private static getStorageData(): Record<string, Record<string, UsageData>> {
    if (typeof window === 'undefined') return {};
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  // Save usage data to localStorage
  private static saveStorageData(data: Record<string, Record<string, UsageData>>): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save usage data:', error);
    }
  }

  // Get current user's usage for today
  static getTodayUsage(): UsageData {
    const user = AuthService.getCurrentUser();
    if (!user) {
      return {
        userId: 'anonymous',
        date: this.getTodayKey(),
        predictions: 0,
        apiCalls: 0,
        portfolioItems: 0
      };
    }

    const allData = this.getStorageData();
    const userUsage = allData[user.id] || {};
    const todayKey = this.getTodayKey();

    return userUsage[todayKey] || {
      userId: user.id,
      date: todayKey,
      predictions: 0,
      apiCalls: 0,
      portfolioItems: 0
    };
  }

  // Update usage for a specific metric
  static incrementUsage(metric: 'predictions' | 'apiCalls' | 'portfolioItems', amount: number = 1): UsageData {
    const user = AuthService.getCurrentUser();
    if (!user) return this.getTodayUsage();

    const allData = this.getStorageData();
    const todayKey = this.getTodayKey();
    
    if (!allData[user.id]) {
      allData[user.id] = {};
    }

    const currentUsage = this.getTodayUsage();
    currentUsage[metric] += amount;

    allData[user.id][todayKey] = currentUsage;
    this.saveStorageData(allData);

    return currentUsage;
  }

  // Check if user can perform an action
  static canPerformAction(action: 'prediction' | 'apiCall' | 'addPortfolioItem'): {
    allowed: boolean;
    reason?: string;
    upgrade?: boolean;
  } {
    const user = AuthService.getCurrentUser();
    const limits = AuthService.getUsageLimits();
    const usage = this.getTodayUsage();

    // Unlimited for premium tiers
    if (user && user.tier !== 'FREE') {
      return { allowed: true };
    }

    switch (action) {
      case 'prediction':
        if (limits.predictionsPerDay === -1) return { allowed: true };
        if (usage.predictions >= limits.predictionsPerDay) {
          return {
            allowed: false,
            reason: `Daily prediction limit reached (${limits.predictionsPerDay}/day)`,
            upgrade: true
          };
        }
        return { allowed: true };

      case 'apiCall':
        if (limits.apiCalls === -1) return { allowed: true };
        if (usage.apiCalls >= limits.apiCalls) {
          return {
            allowed: false,
            reason: `Daily API call limit reached (${limits.apiCalls}/day)`,
            upgrade: true
          };
        }
        return { allowed: true };

      case 'addPortfolioItem':
        if (limits.portfolioItems === -1) return { allowed: true };
        if (usage.portfolioItems >= limits.portfolioItems) {
          return {
            allowed: false,
            reason: `Portfolio item limit reached (${limits.portfolioItems} items)`,
            upgrade: true
          };
        }
        return { allowed: true };

      default:
        return { allowed: false, reason: 'Unknown action' };
    }
  }

  // Get remaining usage for each metric
  static getRemainingUsage(): {
    predictions: number | string;
    apiCalls: number | string;
    portfolioItems: number | string;
  } {
    const limits = AuthService.getUsageLimits();
    const usage = this.getTodayUsage();

    return {
      predictions: limits.predictionsPerDay === -1 
        ? 'Unlimited' 
        : Math.max(0, limits.predictionsPerDay - usage.predictions),
      apiCalls: limits.apiCalls === -1 
        ? 'Unlimited' 
        : Math.max(0, limits.apiCalls - usage.apiCalls),
      portfolioItems: limits.portfolioItems === -1 
        ? 'Unlimited' 
        : Math.max(0, limits.portfolioItems - usage.portfolioItems)
    };
  }

  // Get usage percentage for display
  static getUsagePercentages(): {
    predictions: number;
    apiCalls: number;
    portfolioItems: number;
  } {
    const limits = AuthService.getUsageLimits();
    const usage = this.getTodayUsage();

    const calculatePercentage = (used: number, limit: number): number => {
      if (limit === -1) return 0; // Unlimited
      return Math.min(100, (used / limit) * 100);
    };

    return {
      predictions: calculatePercentage(usage.predictions, limits.predictionsPerDay),
      apiCalls: calculatePercentage(usage.apiCalls, limits.apiCalls),
      portfolioItems: calculatePercentage(usage.portfolioItems, limits.portfolioItems)
    };
  }

  // Reset usage (for demo purposes)
  static resetUsage(): void {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    const allData = this.getStorageData();
    const todayKey = this.getTodayKey();
    
    if (allData[user.id]) {
      allData[user.id][todayKey] = {
        userId: user.id,
        date: todayKey,
        predictions: 0,
        apiCalls: 0,
        portfolioItems: 0
      };
      this.saveStorageData(allData);
    }
  }

  // Get usage history for analytics
  static getUsageHistory(days: number = 7): UsageData[] {
    const user = AuthService.getCurrentUser();
    if (!user) return [];

    const allData = this.getStorageData();
    const userUsage = allData[user.id] || {};
    
    const history: UsageData[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      history.push(userUsage[dateKey] || {
        userId: user.id,
        date: dateKey,
        predictions: 0,
        apiCalls: 0,
        portfolioItems: 0
      });
    }
    
    return history.reverse(); // Oldest to newest
  }

  // Clean up old usage data (keep last 30 days)
  static cleanupOldData(): void {
    if (typeof window === 'undefined') return;

    const allData = this.getStorageData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffKey = cutoffDate.toISOString().split('T')[0];

    let hasChanges = false;

    Object.keys(allData).forEach(userId => {
      const userUsage = allData[userId];
      Object.keys(userUsage).forEach(dateKey => {
        if (dateKey < cutoffKey) {
          delete userUsage[dateKey];
          hasChanges = true;
        }
      });
    });

    if (hasChanges) {
      this.saveStorageData(allData);
    }
  }
}