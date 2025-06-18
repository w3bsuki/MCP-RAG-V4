'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/auth';

export function AuthStatus() {
  const { user, loading, login, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="text-xs font-mono text-terminal-darkgray">
        LOADING...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLogin(!showLogin)}
          className="font-mono text-xs"
        >
          LOGIN
        </Button>
        
        {showLogin && (
          <div className="absolute top-full right-0 mt-2 z-50">
            <Card className="w-80">
              <CardHeader>
                <CardTitle className="text-sm">DEMO LOGIN</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-xs text-terminal-darkgray">
                    Select a demo account:
                  </div>
                  
                  {Object.entries(AuthService.getMockUsers()).map(([email, userData]) => (
                    <Button
                      key={email}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        login(email);
                        setShowLogin(false);
                      }}
                      className="w-full justify-start font-mono text-xs"
                    >
                      <div className="text-left">
                        <div>{email}</div>
                        <div className="text-terminal-darkgray">
                          {userData.tier} TIER
                        </div>
                      </div>
                    </Button>
                  ))}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLogin(false)}
                    className="w-full font-mono text-xs"
                  >
                    CANCEL
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs font-mono">
        <div>{user.email}</div>
        <div className="text-terminal-green">{user.tier}</div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={logout}
        className="font-mono text-xs"
      >
        LOGOUT
      </Button>
    </div>
  );
}