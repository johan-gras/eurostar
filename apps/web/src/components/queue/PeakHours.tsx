'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CrowdLevel } from './QueueStatus';

// Peak hours data for each terminal
// Based on typical Eurostar traffic patterns
interface PeakHourData {
  day: number; // 0 = Monday, 6 = Sunday
  hour: number; // 0-23
  level: CrowdLevel;
}

interface TerminalPeakData {
  terminalId: string;
  data: PeakHourData[];
  bestTimes: string[];
  avoidTimes: string[];
  insights: TerminalInsight[];
}

interface TerminalInsight {
  question: string;
  answer: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5am to 10pm

const crowdLevelColors: Record<CrowdLevel, string> = {
  low: 'bg-green-200 dark:bg-green-800',
  moderate: 'bg-amber-200 dark:bg-amber-700',
  high: 'bg-orange-300 dark:bg-orange-600',
  very_high: 'bg-red-400 dark:bg-red-600',
};

const crowdLevelLabels: Record<CrowdLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  very_high: 'Very High',
};

// Generate realistic peak hour patterns for each terminal
function generateTerminalPeakData(terminalId: string): TerminalPeakData {
  const data: PeakHourData[] = [];

  for (let day = 0; day < 7; day++) {
    for (const hour of HOURS) {
      let level: CrowdLevel = 'low';

      // Terminal-specific patterns
      if (terminalId === 'st-pancras') {
        // London: Busy Friday evenings (people going to Paris for weekends)
        // Busy Monday mornings (business travelers)
        // Busy Sunday evenings (weekend returnees)
        if (day === 4 && hour >= 16 && hour <= 20) level = 'very_high'; // Friday evening
        else if (day === 0 && hour >= 6 && hour <= 9) level = 'high'; // Monday morning
        else if (day === 6 && hour >= 16 && hour <= 20) level = 'very_high'; // Sunday evening
        else if (day === 3 && hour >= 17 && hour <= 19) level = 'high'; // Thursday evening
        else if ((day === 5 || day === 6) && hour >= 7 && hour <= 10) level = 'moderate'; // Weekend mornings
        else if (hour >= 7 && hour <= 9) level = 'moderate'; // Weekday mornings
        else if (hour >= 17 && hour <= 19) level = 'moderate'; // Weekday evenings
      } else if (terminalId === 'gare-du-nord') {
        // Paris: Busy Sunday evenings (Brits returning)
        // Busy Friday mornings (French going to London for weekends)
        // Busy Monday mornings
        if (day === 6 && hour >= 15 && hour <= 19) level = 'very_high'; // Sunday afternoon/evening
        else if (day === 4 && hour >= 6 && hour <= 10) level = 'high'; // Friday morning
        else if (day === 0 && hour >= 7 && hour <= 10) level = 'high'; // Monday morning
        else if (day === 5 && hour >= 8 && hour <= 12) level = 'moderate'; // Saturday morning
        else if (hour >= 7 && hour <= 9) level = 'moderate'; // Weekday mornings
        else if (hour >= 17 && hour <= 19) level = 'moderate'; // Weekday evenings
      } else if (terminalId === 'brussels-midi') {
        // Brussels: EU business hub, busy weekday mornings
        // Less weekend traffic
        if (day >= 0 && day <= 4 && hour >= 7 && hour <= 9) level = 'high'; // Weekday mornings
        else if (day >= 0 && day <= 4 && hour >= 17 && hour <= 19) level = 'high'; // Weekday evenings
        else if (day === 4 && hour >= 15 && hour <= 18) level = 'very_high'; // Friday afternoon
        else if (day === 0 && hour >= 6 && hour <= 8) level = 'very_high'; // Monday early morning
        else if (hour >= 10 && hour <= 16) level = 'moderate'; // Midday
      } else if (terminalId === 'amsterdam-centraal' || terminalId === 'rotterdam-centraal') {
        // Amsterdam/Rotterdam: Similar patterns, less extreme peaks
        if (day === 4 && hour >= 15 && hour <= 19) level = 'high'; // Friday afternoon
        else if (day === 6 && hour >= 14 && hour <= 18) level = 'high'; // Sunday afternoon
        else if (day >= 0 && day <= 4 && hour >= 7 && hour <= 9) level = 'moderate'; // Weekday mornings
        else if (day >= 0 && day <= 4 && hour >= 17 && hour <= 19) level = 'moderate'; // Weekday evenings
      } else if (terminalId === 'lille-europe') {
        // Lille: Transit hub, busy during connections
        if (day >= 0 && day <= 4 && hour >= 7 && hour <= 9) level = 'moderate'; // Weekday mornings
        else if (day >= 0 && day <= 4 && hour >= 17 && hour <= 19) level = 'moderate'; // Weekday evenings
        else if (day === 4 && hour >= 16 && hour <= 19) level = 'high'; // Friday evening
      }

      data.push({ day, hour, level });
    }
  }

  return {
    terminalId,
    data,
    ...getTerminalRecommendations(terminalId),
  };
}

function getTerminalRecommendations(terminalId: string): {
  bestTimes: string[];
  avoidTimes: string[];
  insights: TerminalInsight[];
} {
  switch (terminalId) {
    case 'st-pancras':
      return {
        bestTimes: [
          'Tuesday or Wednesday midday (11am-2pm)',
          'Saturday early morning (before 8am)',
          'Thursday morning (9-11am)',
        ],
        avoidTimes: [
          'Friday 4-8pm (weekend travelers)',
          'Sunday 4-8pm (returning travelers)',
          'Monday 6-9am (business rush)',
        ],
        insights: [
          {
            question: 'Why is Friday evening so busy?',
            answer:
              "Many Londoners travel to Paris for weekend breaks. The 4-8pm window catches both after-work travelers and those taking a half-day. Queues can exceed 45 minutes during school holidays.",
          },
          {
            question: 'When do business travelers peak?',
            answer:
              "Monday mornings (6-9am) see heavy business traffic to Paris and Brussels. Many prefer the earliest trains to maximize their working day. Consider the 11am service for a calmer experience.",
          },
          {
            question: "What's special about Sunday evenings?",
            answer:
              "The 4-8pm Sunday slot is peak return time for weekend travelers from Paris. If returning on Sunday, consider earlier afternoon trains (1-3pm) or very late evening services.",
          },
        ],
      };
    case 'gare-du-nord':
      return {
        bestTimes: [
          'Tuesday or Wednesday afternoon (2-5pm)',
          'Saturday early afternoon (12-2pm)',
          'Thursday midday',
        ],
        avoidTimes: [
          'Sunday 3-7pm (Brits returning home)',
          'Friday 6-10am (Paris to London rush)',
          'Monday morning (business travelers)',
        ],
        insights: [
          {
            question: 'Why Sunday afternoon?',
            answer:
              "British tourists and business travelers return to London on Sunday evenings. The 3-7pm window sees the heaviest traffic. French border controls add to processing time.",
          },
          {
            question: 'Are French school holidays busy?',
            answer:
              "Yes, especially Zone C (Paris region) holidays see significant increases. Check the French school calendar before booking - the first weekend of holidays is particularly congested.",
          },
          {
            question: 'How does the World Cup/Euro affect queues?',
            answer:
              'Major sporting events can cause unpredictable spikes. Match days involving England or France teams can add 20-30 minutes to typical wait times.',
          },
        ],
      };
    case 'brussels-midi':
      return {
        bestTimes: [
          'Tuesday or Wednesday midday',
          'Weekend mornings (before 10am)',
          'Early afternoon (1-3pm)',
        ],
        avoidTimes: [
          'Monday 6-8am (EU officials returning)',
          'Friday 3-6pm (weekend departures)',
          'Thursday evening (business returns)',
        ],
        insights: [
          {
            question: 'Why Monday mornings?',
            answer:
              "Brussels hosts major EU institutions. Monday mornings see heavy traffic from officials, lobbyists, and diplomats returning from weekend travel. The 6-8am window is particularly busy.",
          },
          {
            question: 'Do EU Parliament sessions affect queues?',
            answer:
              "Yes, when Parliament is in session (typically one week per month), expect 20-30% longer queues. Check the parliamentary calendar at europarl.europa.eu for session dates.",
          },
          {
            question: 'Is Brussels a good transit option?',
            answer:
              "Brussels Midi often has shorter queues than St Pancras for London-bound travel. Consider this for Sunday evening returns - you might save 15-20 minutes in security.",
          },
        ],
      };
    case 'amsterdam-centraal':
    case 'rotterdam-centraal':
      return {
        bestTimes: [
          'Weekday midday (11am-2pm)',
          'Early morning (before 8am)',
          'Saturday morning',
        ],
        avoidTimes: [
          'Friday afternoon/evening',
          'Sunday afternoon',
          'Public holidays',
        ],
        insights: [
          {
            question: 'How do Dutch holidays affect queues?',
            answer:
              "King's Day (April 27) and Liberation Day (May 5) see significant spikes. The week around Christmas and New Year is also busy with both Dutch and British travelers.",
          },
          {
            question: 'Is Rotterdam less busy than Amsterdam?',
            answer:
              "Generally yes. Rotterdam Centraal typically has 15-20% shorter queues than Amsterdam. Consider starting your journey from Rotterdam if time is critical.",
          },
          {
            question: "What's the tulip season impact?",
            answer:
              'Mid-March to mid-May (tulip season) sees increased British tourists. Weekends during this period can add 10-15 minutes to typical wait times.',
          },
        ],
      };
    case 'lille-europe':
      return {
        bestTimes: [
          'Most weekday times',
          'Weekend mornings',
          'Early afternoon',
        ],
        avoidTimes: [
          'Friday evening (transit traffic)',
          'Connection windows (check timetables)',
          'Christmas market season (Nov-Dec)',
        ],
        insights: [
          {
            question: 'Is Lille a good alternative?',
            answer:
              "Lille Europe often has the shortest queues of all Eurostar terminals. If you're flexible on routing, consider connecting through Lille to avoid busier hubs.",
          },
          {
            question: 'Why Christmas market season?',
            answer:
              "Lille's famous Christmas market (November-December) attracts many British day-trippers. Weekend services during this period see notably higher demand.",
          },
          {
            question: 'How do connections affect queues?',
            answer:
              'As a connection hub, Lille sees brief surges when TGV connections arrive. These typically clear within 15-20 minutes. Check TGV timetables for optimal timing.',
          },
        ],
      };
    default:
      return {
        bestTimes: ['Midday on weekdays', 'Early mornings', 'Late evenings'],
        avoidTimes: ['Friday evenings', 'Sunday evenings', 'Monday mornings'],
        insights: [],
      };
  }
}

function HeatmapCell({
  level,
  hour,
  day,
}: {
  level: CrowdLevel;
  hour: number;
  day: string;
}) {
  const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
  return (
    <div
      className={cn(
        'h-6 w-full rounded-sm transition-all hover:ring-2 hover:ring-primary hover:ring-offset-1',
        crowdLevelColors[level]
      )}
      title={`${day} ${timeLabel}: ${crowdLevelLabels[level]} crowd`}
    />
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span>Crowd level:</span>
      {(Object.keys(crowdLevelColors) as CrowdLevel[]).map((level) => (
        <div key={level} className="flex items-center gap-1">
          <div className={cn('h-3 w-3 rounded-sm', crowdLevelColors[level])} />
          <span>{crowdLevelLabels[level]}</span>
        </div>
      ))}
    </div>
  );
}

interface InsightAccordionProps {
  insights: TerminalInsight[];
}

function InsightAccordion({ insights }: InsightAccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Understanding the patterns
      </h4>
      {insights.map((insight, index) => (
        <div
          key={index}
          className="rounded-lg border bg-muted/30"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between p-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <span>{insight.question}</span>
            <svg
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                openIndex === index && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === index && (
            <div className="px-3 pb-3 text-sm text-muted-foreground">
              {insight.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface PeakHoursProps {
  terminalId: string;
  defaultExpanded?: boolean;
}

export function PeakHours({ terminalId, defaultExpanded = false }: PeakHoursProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const peakData = React.useMemo(
    () => generateTerminalPeakData(terminalId),
    [terminalId]
  );

  const getCellLevel = (day: number, hour: number): CrowdLevel => {
    const cell = peakData.data.find((d) => d.day === day && d.hour === hour);
    return cell?.level ?? 'low';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <CardTitle className="text-lg">Peak Hours Guide</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Typical crowd patterns throughout the week
            </p>
          </div>
          <svg
            className={cn(
              'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Heatmap Grid */}
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="min-w-[500px]">
              {/* Hour labels */}
              <div className="flex mb-1">
                <div className="w-10 shrink-0" />
                {HOURS.filter((_, i) => i % 3 === 0).map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-xs text-muted-foreground text-center"
                    style={{ minWidth: '3rem' }}
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Day rows */}
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-1 mb-1">
                  <div className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                  <div className="flex-1 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                    {HOURS.map((hour) => (
                      <HeatmapCell
                        key={`${dayIndex}-${hour}`}
                        level={getCellLevel(dayIndex, hour)}
                        hour={hour}
                        day={day}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <Legend />

          {/* Recommendations */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Best Times */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="h-5 w-5 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h4 className="font-medium text-green-700 dark:text-green-300">
                  Best times to travel
                </h4>
              </div>
              <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                {peakData.bestTimes.map((time, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    {time}
                  </li>
                ))}
              </ul>
            </div>

            {/* Times to Avoid */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="h-5 w-5 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h4 className="font-medium text-red-700 dark:text-red-300">
                  Avoid these times
                </h4>
              </div>
              <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                {peakData.avoidTimes.map((time, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    {time}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Educational Insights */}
          <InsightAccordion insights={peakData.insights} />

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground">
            These patterns are based on historical data and may vary during holidays,
            special events, or disruptions. Always check real-time queue status above
            before traveling.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
