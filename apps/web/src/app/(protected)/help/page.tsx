'use client';

import { useState, useMemo } from 'react';
import { HelpCircle, Search, FileText, Armchair, Clock, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type FAQCategory = 'autoclaim' | 'seatmap' | 'queue' | 'general';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
}

const CATEGORY_INFO: Record<FAQCategory, { label: string; icon: React.ElementType; description: string }> = {
  autoclaim: {
    label: 'AutoClaim',
    icon: FileText,
    description: 'Delay compensation and claims',
  },
  seatmap: {
    label: 'Seat Map',
    icon: Armchair,
    description: 'Seat recommendations and preferences',
  },
  queue: {
    label: 'Queue Times',
    icon: Clock,
    description: 'Terminal wait time predictions',
  },
  general: {
    label: 'General',
    icon: Settings,
    description: 'Account and app settings',
  },
};

const FAQS: FAQ[] = [
  // AutoClaim FAQs
  {
    id: 'ac-1',
    question: 'How does AutoClaim work?',
    answer: 'AutoClaim monitors your booked Eurostar journeys for delays. When a delay meets the compensation threshold (typically 60+ minutes), we automatically generate a pre-filled compensation claim form. You review the details and submit it yourself - we never submit claims on your behalf.',
    category: 'autoclaim',
  },
  {
    id: 'ac-2',
    question: 'What delays qualify for compensation?',
    answer: 'Under EU261 and UK regulations, delays of 60 minutes or more qualify for compensation. You can receive 25% of your ticket price for delays of 60-119 minutes, and 50% for delays of 120 minutes or more. Season ticket holders may have different thresholds.',
    category: 'autoclaim',
  },
  {
    id: 'ac-3',
    question: 'How do I add a booking to track?',
    answer: 'You can add bookings by entering your booking reference (PNR) and ticket number (TCN), or by forwarding your confirmation email to our import address. The booking details will be automatically extracted and added to your account.',
    category: 'autoclaim',
  },
  {
    id: 'ac-4',
    question: 'Why was my claim rejected?',
    answer: 'Claims can be rejected for several reasons: the delay was caused by extraordinary circumstances (severe weather, security incidents), the journey was not eligible (free tickets, certain promotions), or the claim was submitted after the deadline. Check your claim details for specific information.',
    category: 'autoclaim',
  },
  {
    id: 'ac-5',
    question: 'Should I choose cash or e-voucher compensation?',
    answer: 'E-vouchers typically offer 50% more value than cash refunds. Choose vouchers if you travel frequently with Eurostar. Cash refunds are better if you rarely travel or need immediate funds. You can set your preference in Settings.',
    category: 'autoclaim',
  },
  {
    id: 'ac-6',
    question: 'How long do I have to submit a compensation claim?',
    answer: 'You have up to 3 months from the date of travel to submit a compensation claim to Eurostar. We recommend submitting as soon as possible after your delayed journey.',
    category: 'autoclaim',
  },
  // Seat Map FAQs
  {
    id: 'sm-1',
    question: 'How do seat recommendations work?',
    answer: 'RailSeatMap analyzes all available seats based on your preferences (window/aisle, direction, quiet coach, table, power socket) and ranks them. We consider factors like seat orientation, proximity to toilets and bar car, and known comfort issues with specific seats.',
    category: 'seatmap',
  },
  {
    id: 'sm-2',
    question: 'What Eurostar train types are supported?',
    answer: 'We support all current Eurostar rolling stock: e300 (Siemens Velaro) and e320 trains. Each has different coach configurations - e320 trains have more consistent seat layouts while e300 has more variation between coaches.',
    category: 'seatmap',
  },
  {
    id: 'sm-3',
    question: 'Are quiet coach recommendations accurate?',
    answer: 'Yes, we track which coaches are designated as quiet coaches for each train configuration. Note that quiet coach positions can vary, and enforcement depends on passengers respecting the rules. Coach 9 is typically quiet on e320 Standard.',
    category: 'seatmap',
  },
  {
    id: 'sm-4',
    question: 'Can I save my seat preferences?',
    answer: 'Yes! Go to Settings > Seat Preferences to save your default choices for position, direction, coach type, table preference, and power socket preference. These will be pre-filled when using RailSeatMap.',
    category: 'seatmap',
  },
  {
    id: 'sm-5',
    question: 'Why do some seats show warnings?',
    answer: 'Some seats have known issues like limited recline (near bulkheads), restricted legroom, misaligned windows, or proximity to toilets/bar. We flag these so you can make an informed choice. Yellow warnings are minor inconveniences; red are significant issues.',
    category: 'seatmap',
  },
  // Queue Times FAQs
  {
    id: 'qt-1',
    question: 'How are queue predictions calculated?',
    answer: 'EuroQueue uses historical data, day-of-week patterns, departure schedules, school holidays, and real-time passenger reports to predict wait times. Predictions are most accurate for St Pancras and Paris Gare du Nord.',
    category: 'queue',
  },
  {
    id: 'qt-2',
    question: 'How accurate are the queue predictions?',
    answer: 'Our predictions are typically within 10-15 minutes of actual wait times. Accuracy is highest during regular travel periods and may vary during exceptional circumstances (strikes, severe weather, major events).',
    category: 'queue',
  },
  {
    id: 'qt-3',
    question: 'What terminals are supported?',
    answer: 'We provide predictions for St Pancras International (London), Paris Gare du Nord, Brussels Midi/Zuid, and Amsterdam Centraal. Each terminal has different check-in and security procedures.',
    category: 'queue',
  },
  {
    id: 'qt-4',
    question: 'When should I arrive at the station?',
    answer: 'The Arrival Planner suggests arrival times based on current predictions, your ticket type (Standard/Business Premier), and check-in closing times. Business Premier passengers have dedicated lanes with typically shorter waits.',
    category: 'queue',
  },
  {
    id: 'qt-5',
    question: 'Can I get notifications about queue times?',
    answer: 'Yes, enable queue notifications in Settings and set your default terminal. You\'ll receive alerts when predicted wait times exceed typical levels on days you have upcoming journeys.',
    category: 'queue',
  },
  // General FAQs
  {
    id: 'gen-1',
    question: 'Is my booking data secure?',
    answer: 'Yes. We use industry-standard encryption for all data in transit and at rest. Your booking details are only used to track delays and generate claims. We never share your personal information with third parties.',
    category: 'general',
  },
  {
    id: 'gen-2',
    question: 'How do I delete my account?',
    answer: 'Go to Settings > Account > Delete Account. This will permanently remove all your data including bookings, claims, and preferences. This action cannot be undone.',
    category: 'general',
  },
  {
    id: 'gen-3',
    question: 'Can I use Eurostar Tools on mobile?',
    answer: 'Yes, our web app is fully responsive and works on all devices. Add it to your home screen for quick access. We recommend enabling notifications for real-time delay alerts.',
    category: 'general',
  },
  {
    id: 'gen-4',
    question: 'Is there an API available?',
    answer: 'We offer API access for enterprise customers and developers. Contact us for API documentation and pricing. Individual users can export their data in CSV format from the dashboard.',
    category: 'general',
  },
  {
    id: 'gen-5',
    question: 'How do I report a bug or request a feature?',
    answer: 'Use the feedback button in the bottom corner of any page, or email support@eurostar.tools. We review all feedback and prioritize based on user impact.',
    category: 'general',
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FAQCategory | 'all'>('all');

  const filteredFAQs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesSearch =
        searchQuery === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === 'all' || faq.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const faqsByCategory = useMemo(() => {
    const grouped: Record<FAQCategory, FAQ[]> = {
      autoclaim: [],
      seatmap: [],
      queue: [],
      general: [],
    };

    filteredFAQs.forEach((faq) => {
      grouped[faq.category].push(faq);
    });

    return grouped;
  }, [filteredFAQs]);

  const categories: (FAQCategory | 'all')[] = ['all', 'autoclaim', 'seatmap', 'queue', 'general'];

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Help & FAQ</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Find answers to common questions about Eurostar Tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = activeCategory === category;
              return (
                <Badge
                  key={category}
                  variant={isActive ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setActiveCategory(category)}
                >
                  {category === 'all' ? 'All' : CATEGORY_INFO[category].label}
                </Badge>
              );
            })}
          </div>

          {/* Results count */}
          {searchQuery && (
            <p className="text-sm text-muted-foreground">
              {filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''} found
            </p>
          )}

          {/* FAQ Sections */}
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No FAQs match your search.</p>
              <p className="text-sm mt-1">Try different keywords or clear the filter.</p>
            </div>
          ) : activeCategory === 'all' ? (
            // Show grouped by category when "All" is selected
            <div className="space-y-8">
              {(Object.keys(faqsByCategory) as FAQCategory[]).map((category) => {
                const faqs = faqsByCategory[category];
                if (faqs.length === 0) return null;

                const { label, icon: Icon, description } = CATEGORY_INFO[category];

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <h2 className="font-semibold">{label}</h2>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      {faqs.map((faq) => (
                        <AccordionItem key={faq.id} value={faq.id}>
                          <AccordionTrigger className="text-left">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          ) : (
            // Show flat list when a specific category is selected
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Still need help?</CardTitle>
          <CardDescription>
            Can&apos;t find what you&apos;re looking for? Our support team is here to help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Email us at{' '}
            <a href="mailto:support@eurostar.tools" className="text-primary hover:underline">
              support@eurostar.tools
            </a>{' '}
            and we&apos;ll get back to you within 24 hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
