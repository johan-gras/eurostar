'use client';

import { Info, Code2, Scale, MessageSquare, ExternalLink, Github, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const APP_VERSION = '1.0.0';

const TECH_STACK = [
  { category: 'Frontend', items: ['Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS', 'shadcn/ui'] },
  { category: 'Backend', items: ['Node.js 20', 'Fastify', 'Drizzle ORM', 'PostgreSQL 16'] },
  { category: 'Infrastructure', items: ['BullMQ', 'Redis 7', 'Docker', 'Railway'] },
  { category: 'Testing', items: ['Vitest', 'Playwright'] },
];

export default function AboutPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Info className="h-6 w-6" />
        <h1 className="text-2xl font-bold">About</h1>
      </div>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Eurostar Tools
            <Badge variant="secondary">v{APP_VERSION}</Badge>
          </CardTitle>
          <CardDescription>
            A suite of tools for Eurostar travelers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Eurostar Tools helps you travel smarter with automated delay compensation tracking,
            intelligent seat recommendations, and real-time queue predictions.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="font-medium">AutoClaim</div>
              <div className="text-sm text-muted-foreground">
                Automatic delay detection and compensation claim generation
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">RailSeatMap</div>
              <div className="text-sm text-muted-foreground">
                Intelligent seat recommendations based on your preferences
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">EuroQueue</div>
              <div className="text-sm text-muted-foreground">
                Real-time terminal queue predictions and arrival planning
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Tech Stack
          </CardTitle>
          <CardDescription>
            Built with modern, reliable technologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TECH_STACK.map((stack) => (
              <div key={stack.category} className="space-y-2">
                <div className="font-medium text-sm">{stack.category}</div>
                <div className="flex flex-wrap gap-1">
                  {stack.items.map((item) => (
                    <Badge key={item} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legal Notices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Legal Notices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="font-medium">Disclaimer</div>
            <p className="text-sm text-muted-foreground">
              Eurostar Tools is an independent service and is not affiliated with, endorsed by,
              or connected to Eurostar International Limited. &quot;Eurostar&quot; is a registered
              trademark of Eurostar International Limited.
            </p>
          </div>
          <div className="border-t" />
          <div className="space-y-2">
            <div className="font-medium">Data Processing</div>
            <p className="text-sm text-muted-foreground">
              We process your booking information solely to provide delay tracking and claim
              generation services. Your data is encrypted at rest and in transit. We do not
              sell or share your personal information with third parties.
            </p>
          </div>
          <div className="border-t" />
          <div className="space-y-2">
            <div className="font-medium">Compensation Claims</div>
            <p className="text-sm text-muted-foreground">
              AutoClaim generates pre-filled claim forms based on detected delays. You are
              responsible for reviewing and submitting claims. We do not guarantee compensation
              approval, as this is subject to Eurostar&apos;s terms and conditions.
            </p>
          </div>
          <div className="border-t" />
          <div className="space-y-2">
            <div className="font-medium">Open Source</div>
            <p className="text-sm text-muted-foreground">
              Portions of this software are built on open source technologies. We are grateful
              to the open source community for their contributions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback
          </CardTitle>
          <CardDescription>
            We&apos;d love to hear from you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Have a suggestion, found a bug, or want to request a feature? Let us know!
            Your feedback helps us improve Eurostar Tools for everyone.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="default">
              <a href="mailto:feedback@eurostar.tools?subject=Eurostar Tools Feedback">
                <Mail className="mr-2 h-4 w-4" />
                Send Feedback
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://github.com/eurostar-tools/eurostar-tools/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                Report Issue
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>Eurostar Tools v{APP_VERSION}</p>
        <p>&copy; {new Date().getFullYear()} Eurostar Tools. All rights reserved.</p>
      </div>
    </div>
  );
}
