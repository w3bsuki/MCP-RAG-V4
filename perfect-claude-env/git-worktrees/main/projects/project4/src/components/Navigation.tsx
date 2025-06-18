'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AuthStatus } from '@/components/AuthStatus';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'MARKET' },
    { href: '/portfolio', label: 'PORTFOLIO' },
    { href: '/charts', label: 'CHARTS' },
    { href: '/ai', label: 'AI PREDICT' },
    { href: '/pricing', label: 'PRICING' },
  ];

  return (
    <nav className="border-2 border-terminal-darkgray bg-terminal-gray text-terminal-black p-4 mb-8 shadow-raised-thick">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold font-mono">
            ▓▓▓ CLAUDE CRYPTO PREDICTOR v1.0 ▓▓▓
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? "default" : "outline"}
                  size="sm"
                  className="font-mono"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          <AuthStatus />
        </div>
      </div>
    </nav>
  );
}