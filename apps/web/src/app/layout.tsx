import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toaster';
import { KeyboardShortcuts } from '@/components/ui/keyboard-shortcuts';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Eurostar Tools',
  description: 'Tools for Eurostar travelers - delay compensation, seat maps, and queue prediction',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <div className="min-h-screen flex flex-col">
                <ErrorBoundary title="Header Error">
                  <Header />
                </ErrorBoundary>
                <main className="flex-1">
                  <ErrorBoundary title="Page Error">
                    {children}
                  </ErrorBoundary>
                </main>
              </div>
              <Toaster />
              <KeyboardShortcuts />
              <OnboardingTour />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
