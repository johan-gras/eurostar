'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Train, LayoutDashboard, Ticket, FileText, Menu, X, Armchair, Clock, LogIn, LogOut, User, Settings } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/bookings', icon: Ticket },
  { name: 'Claims', href: '/claims', icon: FileText },
  { name: 'Seat Map', href: '/seatmap', icon: Armchair },
  { name: 'Queue Times', href: '/queue', icon: Clock },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <Train className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Eurostar Tools
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        {isAuthenticated && !isAuthPage && (
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 transition-colors hover:text-foreground/80',
                    isActive ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggle />

          {/* Auth section */}
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="hidden md:flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{user?.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void logout()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </Button>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      <LogIn className="h-4 w-4 mr-2" />
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden min-h-[44px] min-w-[44px]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t bg-background p-4">
          {isAuthenticated && !isAuthPage && navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 min-h-[44px] py-2 transition-colors hover:text-foreground/80',
                  isActive ? 'text-foreground' : 'text-foreground/60'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-base">{item.name}</span>
              </Link>
            );
          })}

          {/* Mobile Auth */}
          <div className="border-t mt-2 pt-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3 min-h-[44px] py-2 text-sm text-muted-foreground">
                  <User className="h-5 w-5" />
                  <span>{user?.name}</span>
                </div>
                <button
                  className="flex items-center space-x-3 min-h-[44px] py-2 text-foreground/60 hover:text-foreground/80 w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void logout();
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-base">Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center space-x-3 min-h-[44px] py-2 text-foreground/60 hover:text-foreground/80"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="h-5 w-5" />
                  <span className="text-base">Log in</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center space-x-3 min-h-[44px] py-2 text-foreground/60 hover:text-foreground/80"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span className="text-base">Sign up</span>
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
