'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ONBOARDING_STORAGE_KEY = 'eurostar-onboarding-completed';

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Welcome to Eurostar Tools',
    content:
      'Your dashboard gives you an overview of all your bookings and any potential delay compensation claims.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="bookings"]',
    title: 'Manage Your Bookings',
    content:
      'Add your Eurostar bookings here. We will automatically track delays and help you claim compensation.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="new-booking"]',
    title: 'Add a New Booking',
    content:
      'Click here to add a new booking. You can enter your PNR and ticket details to start tracking.',
    placement: 'left',
  },
  {
    target: '[data-tour="keyboard-hint"]',
    title: 'Keyboard Shortcuts',
    content: 'Press ? at any time to see available keyboard shortcuts for quick navigation.',
    placement: 'bottom',
  },
];

export function OnboardingTour() {
  const [isActive, setIsActive] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    if (!isActive) return;

    const updateHighlight = () => {
      const step = tourSteps[currentStep];
      if (!step) return;
      const element = document.querySelector(step.target);

      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);

        // Calculate tooltip position based on placement
        const tooltipWidth = 320;
        const tooltipHeight = 150;
        const offset = 12;

        let top = 0;
        let left = 0;

        switch (step.placement) {
          case 'top':
            top = rect.top - tooltipHeight - offset;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'bottom':
            top = rect.bottom + offset;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - offset;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + offset;
            break;
          default:
            top = rect.bottom + offset;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
        }

        // Keep tooltip within viewport
        left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
        top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

        setTooltipPosition({ top, left });
      } else {
        // If target not found, show tooltip in center
        setHighlightRect(null);
        setTooltipPosition({
          top: window.innerHeight / 2 - 75,
          left: window.innerWidth / 2 - 160,
        });
      }
    };

    updateHighlight();

    // Update on scroll/resize
    window.addEventListener('scroll', updateHighlight, true);
    window.addEventListener('resize', updateHighlight);

    return () => {
      window.removeEventListener('scroll', updateHighlight, true);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleDone();
    }
  };

  const handleSkip = () => {
    handleDone();
  };

  const handleDone = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setIsActive(false);
  };

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;

  if (!isActive || !step) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={handleSkip} />

      {/* Spotlight cutout */}
      {highlightRect && (
        <div
          className="absolute bg-transparent ring-[9999px] ring-black/50"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            borderRadius: '8px',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          'absolute z-[101] w-80 rounded-lg border bg-background p-4 shadow-lg',
          'animate-in fade-in-0 zoom-in-95'
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        <div className="mb-1 text-xs text-muted-foreground">
          Step {currentStep + 1} of {tourSteps.length}
        </div>
        <h3 className="mb-2 font-semibold">{step.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{step.content}</p>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="mt-4 flex justify-center gap-1">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                index === currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
