'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, FileText, Plus, Armchair, Clock, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/bookings', icon: Ticket },
  { name: 'Claims', href: '/claims', icon: FileText },
  { name: 'Seat Map', href: '/seatmap', icon: Armchair },
  { name: 'Queue Times', href: '/queue', icon: Clock },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-muted/40">
      <div className="flex flex-col flex-1 gap-4 p-4">
        <Link href="/bookings/new">
          <Button className="w-full justify-start">
            <Plus className="mr-2 h-4 w-4" />
            Add Booking
          </Button>
        </Link>

        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary',
                  isActive
                    ? 'bg-muted text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
