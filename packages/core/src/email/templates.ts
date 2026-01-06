export interface DelayDetectedData {
  passengerName: string;
  trainNumber: string;
  departureStation: string;
  arrivalStation: string;
  scheduledDeparture: string;
  actualDeparture: string;
  delayMinutes: number;
  journeyDate: string;
}

export interface ClaimEligibleData {
  passengerName: string;
  trainNumber: string;
  departureStation: string;
  arrivalStation: string;
  journeyDate: string;
  delayMinutes: number;
  compensationAmount: string;
  compensationPercentage: number;
  claimDeadline: string;
  claimUrl: string;
}

export interface WeeklySummaryData {
  userName: string;
  weekStartDate: string;
  weekEndDate: string;
  totalTrips: number;
  delayedTrips: number;
  totalDelayMinutes: number;
  pendingClaims: number;
  pendingClaimValue: string;
  submittedClaims: number;
  approvedClaims: number;
  approvedClaimValue: string;
  upcomingTrips: Array<{
    trainNumber: string;
    date: string;
    route: string;
  }>;
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .content { padding: 20px; background: #fff; }
  .footer { background: #f7f7f7; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .alert { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444; }
  .success { background: #d1fae5; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
  .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
  .button:hover { background: #1d4ed8; }
  .stats { display: flex; justify-content: space-around; margin: 20px 0; }
  .stat { text-align: center; padding: 10px; }
  .stat-value { font-size: 28px; font-weight: bold; color: #1a365d; }
  .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f8f9fa; font-weight: 600; }
`;

function wrapInLayout(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Eurostar Tools</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated notification from Eurostar Tools.</p>
      <p>You received this because you have an active account with delay monitoring enabled.</p>
    </div>
  </div>
</body>
</html>
`;
}

export function renderDelayDetected(data: DelayDetectedData): { html: string; text: string } {
  const html = wrapInLayout(
    'Delay Detected',
    `
    <h2>Delay Detected on Your Journey</h2>
    <p>Hello ${data.passengerName},</p>
    <p>We've detected a delay on your upcoming Eurostar journey:</p>

    <div class="alert">
      <strong>Train ${data.trainNumber}</strong><br>
      ${data.departureStation} → ${data.arrivalStation}<br>
      <strong>Date:</strong> ${data.journeyDate}<br>
      <strong>Scheduled Departure:</strong> ${data.scheduledDeparture}<br>
      <strong>Expected Departure:</strong> ${data.actualDeparture}<br>
      <strong>Delay:</strong> ${data.delayMinutes} minutes
    </div>

    <p>We're monitoring this journey and will notify you if you become eligible for compensation.</p>
    <p>Under EU regulations, you may be entitled to compensation if your arrival is delayed by:</p>
    <ul>
      <li>60+ minutes: 25% of ticket price</li>
      <li>120+ minutes: 50% of ticket price</li>
    </ul>
    `
  );

  const text = `
Delay Detected on Your Journey

Hello ${data.passengerName},

We've detected a delay on your upcoming Eurostar journey:

Train ${data.trainNumber}
${data.departureStation} → ${data.arrivalStation}
Date: ${data.journeyDate}
Scheduled Departure: ${data.scheduledDeparture}
Expected Departure: ${data.actualDeparture}
Delay: ${data.delayMinutes} minutes

We're monitoring this journey and will notify you if you become eligible for compensation.

Under EU regulations, you may be entitled to compensation if your arrival is delayed by:
- 60+ minutes: 25% of ticket price
- 120+ minutes: 50% of ticket price
`.trim();

  return { html, text };
}

export function renderClaimEligible(data: ClaimEligibleData): { html: string; text: string } {
  const html = wrapInLayout(
    'You\'re Eligible for Compensation',
    `
    <h2>Good News - You're Eligible for Compensation!</h2>
    <p>Hello ${data.passengerName},</p>

    <div class="success">
      <strong>You can claim ${data.compensationPercentage}% compensation</strong><br>
      Estimated amount: <strong>${data.compensationAmount}</strong>
    </div>

    <p>Your journey was delayed by <strong>${data.delayMinutes} minutes</strong>:</p>

    <table>
      <tr><td><strong>Train</strong></td><td>${data.trainNumber}</td></tr>
      <tr><td><strong>Route</strong></td><td>${data.departureStation} → ${data.arrivalStation}</td></tr>
      <tr><td><strong>Date</strong></td><td>${data.journeyDate}</td></tr>
      <tr><td><strong>Delay</strong></td><td>${data.delayMinutes} minutes</td></tr>
    </table>

    <div class="highlight">
      <strong>Claim Deadline:</strong> ${data.claimDeadline}<br>
      <small>Claims must be submitted within 3 months of travel.</small>
    </div>

    <p style="text-align: center; margin: 25px 0;">
      <a href="${data.claimUrl}" class="button">Review & Submit Claim</a>
    </p>

    <p><small>We've pre-filled the claim form with your journey details. Review the information and submit when ready.</small></p>
    `
  );

  const text = `
Good News - You're Eligible for Compensation!

Hello ${data.passengerName},

You can claim ${data.compensationPercentage}% compensation.
Estimated amount: ${data.compensationAmount}

Your journey was delayed by ${data.delayMinutes} minutes:

Train: ${data.trainNumber}
Route: ${data.departureStation} → ${data.arrivalStation}
Date: ${data.journeyDate}
Delay: ${data.delayMinutes} minutes

Claim Deadline: ${data.claimDeadline}
Claims must be submitted within 3 months of travel.

Review & Submit Claim: ${data.claimUrl}

We've pre-filled the claim form with your journey details. Review the information and submit when ready.
`.trim();

  return { html, text };
}

export function renderWeeklySummary(data: WeeklySummaryData): { html: string; text: string } {
  const upcomingTripsHtml = data.upcomingTrips.length > 0
    ? `
      <h3>Upcoming Journeys</h3>
      <table>
        <tr><th>Date</th><th>Train</th><th>Route</th></tr>
        ${data.upcomingTrips.map(trip => `
          <tr>
            <td>${trip.date}</td>
            <td>${trip.trainNumber}</td>
            <td>${trip.route}</td>
          </tr>
        `).join('')}
      </table>
    `
    : '<p>No upcoming journeys scheduled.</p>';

  const upcomingTripsText = data.upcomingTrips.length > 0
    ? `Upcoming Journeys:\n${data.upcomingTrips.map(trip =>
        `- ${trip.date}: Train ${trip.trainNumber} (${trip.route})`
      ).join('\n')}`
    : 'No upcoming journeys scheduled.';

  const html = wrapInLayout(
    'Your Weekly Summary',
    `
    <h2>Your Weekly Summary</h2>
    <p>Hello ${data.userName},</p>
    <p>Here's your travel summary for ${data.weekStartDate} - ${data.weekEndDate}:</p>

    <div style="display: table; width: 100%; margin: 20px 0;">
      <div style="display: table-cell; width: 25%; text-align: center; padding: 10px;">
        <div style="font-size: 28px; font-weight: bold; color: #1a365d;">${data.totalTrips}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase;">Total Trips</div>
      </div>
      <div style="display: table-cell; width: 25%; text-align: center; padding: 10px;">
        <div style="font-size: 28px; font-weight: bold; color: #ef4444;">${data.delayedTrips}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase;">Delayed</div>
      </div>
      <div style="display: table-cell; width: 25%; text-align: center; padding: 10px;">
        <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${data.pendingClaims}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase;">Pending Claims</div>
      </div>
      <div style="display: table-cell; width: 25%; text-align: center; padding: 10px;">
        <div style="font-size: 28px; font-weight: bold; color: #10b981;">${data.approvedClaims}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase;">Approved</div>
      </div>
    </div>

    ${data.pendingClaims > 0 ? `
      <div class="highlight">
        <strong>Pending Claims Value:</strong> ${data.pendingClaimValue}<br>
        <small>Don't forget to submit your pending claims before they expire!</small>
      </div>
    ` : ''}

    ${data.approvedClaims > 0 ? `
      <div class="success">
        <strong>Approved Claims Value:</strong> ${data.approvedClaimValue}<br>
        <small>Great job claiming what you're owed!</small>
      </div>
    ` : ''}

    ${data.totalDelayMinutes > 0 ? `
      <p>Total delay time this week: <strong>${data.totalDelayMinutes} minutes</strong></p>
    ` : ''}

    ${upcomingTripsHtml}
    `
  );

  const text = `
Your Weekly Summary

Hello ${data.userName},

Here's your travel summary for ${data.weekStartDate} - ${data.weekEndDate}:

Total Trips: ${data.totalTrips}
Delayed Trips: ${data.delayedTrips}
Pending Claims: ${data.pendingClaims}
Approved Claims: ${data.approvedClaims}

${data.pendingClaims > 0 ? `Pending Claims Value: ${data.pendingClaimValue}
Don't forget to submit your pending claims before they expire!\n` : ''}
${data.approvedClaims > 0 ? `Approved Claims Value: ${data.approvedClaimValue}\n` : ''}
${data.totalDelayMinutes > 0 ? `Total delay time this week: ${data.totalDelayMinutes} minutes\n` : ''}

${upcomingTripsText}
`.trim();

  return { html, text };
}
