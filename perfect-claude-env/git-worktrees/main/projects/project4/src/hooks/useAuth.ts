'use client';

import { useState, useEffect } from 'react';
import { AuthService, type UserSession } from '@/lib/auth';
import { type SubscriptionTier } from '@/lib/stripe';

export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user session on mount
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // Listen for storage changes (if user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cryptovision_session') {
        const newUser = AuthService.getCurrentUser();
        setUser(newUser);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = (email: string): boolean => {
    const loggedInUser = AuthService.login(email);
    if (loggedInUser) {
      setUser(loggedInUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const updateTier = (tier: SubscriptionTier, customerId?: string, subscriptionId?: string): boolean => {
    const success = AuthService.updateUserTier(tier, customerId, subscriptionId);
    if (success) {
      const updatedUser = AuthService.getCurrentUser();
      setUser(updatedUser);
    }
    return success;
  };

  const hasAccess = (feature: 'ai_predictions' | 'unlimited_portfolio' | 'api_access' | 'team_features'): boolean => {
    return AuthService.hasAccess(feature);
  };

  const getUsageLimits = () => {
    return AuthService.getUsageLimits();
  };

  const getAuthToken = (): string | null => {
    return AuthService.getAuthToken();
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isPremium: user ? user.tier !== 'FREE' : false,
    login,
    logout,
    updateTier,
    hasAccess,
    getUsageLimits,
    getAuthToken
  };
}