'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Shortcut {
  keys: string[];
  description: string;
  action: () => void;
}

interface ShortcutGroup {
  name: string;
  shortcuts: Shortcut[];
}

export function KeyboardShortcuts() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const keysPressed = React.useRef<Set<string>>(new Set());

  const shortcutGroups: ShortcutGroup[] = React.useMemo(
    () => [
      {
        name: 'Navigation',
        shortcuts: [
          {
            keys: ['g', 'd'],
            description: 'Go to dashboard',
            action: () => router.push('/dashboard'),
          },
          {
            keys: ['g', 'b'],
            description: 'Go to bookings',
            action: () => router.push('/bookings'),
          },
        ],
      },
      {
        name: 'Actions',
        shortcuts: [
          {
            keys: ['n'],
            description: 'New booking',
            action: () => router.push('/bookings/new'),
          },
        ],
      },
      {
        name: 'Help',
        shortcuts: [
          {
            keys: ['?'],
            description: 'Show keyboard shortcuts',
            action: () => setOpen(true),
          },
        ],
      },
    ],
    [router]
  );

  React.useEffect(() => {
    let sequenceTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except for shift on ?)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      // Handle ? key (requires shift)
      if (event.key === '?') {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Add key to pressed set
      keysPressed.current.add(key);

      // Clear sequence after delay
      if (sequenceTimeout) {
        clearTimeout(sequenceTimeout);
      }
      sequenceTimeout = setTimeout(() => {
        keysPressed.current.clear();
      }, 1000);

      // Check for matching shortcuts
      for (const group of shortcutGroups) {
        for (const shortcut of group.shortcuts) {
          if (shortcut.keys.length === 1 && shortcut.keys[0] === key) {
            if (shortcut.keys[0] !== '?') {
              event.preventDefault();
              shortcut.action();
              keysPressed.current.clear();
            }
            return;
          }

          // Multi-key sequences (e.g., g d)
          if (shortcut.keys.length > 1) {
            const pressedArray = Array.from(keysPressed.current);
            if (
              shortcut.keys.length === pressedArray.length &&
              shortcut.keys.every((k, i) => k === pressedArray[i])
            ) {
              event.preventDefault();
              shortcut.action();
              keysPressed.current.clear();
              return;
            }
          }
        }
      }
    };

    const handleKeyUp = () => {
      // We don't clear on keyup to allow sequences like g -> d
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (sequenceTimeout) {
        clearTimeout(sequenceTimeout);
      }
    };
  }, [shortcutGroups]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate quickly
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {shortcutGroups.map((group) => (
            <div key={group.name}>
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                {group.name}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys.join('-')}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, index) => (
                        <React.Fragment key={key}>
                          <Kbd>{key}</Kbd>
                          {index < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">
                              then
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground',
        className
      )}
    >
      {children}
    </kbd>
  );
}
