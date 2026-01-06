# Eurostar Domain Knowledge

## Compensation Rules

### Legal Basis
EU Regulation 2021/782 on Rail Passenger Rights (replaced 1371/2007 on 7 June 2023), plus Eurostar's own Customer Charter.

**Key Changes in 2021/782**:
- Force majeure exemptions now exist (pandemics, extreme weather)
- Same compensation percentages as before
- Better provisions for passengers with disabilities

### Compensation Tiers

| Delay Duration | Cash Refund | E-Voucher |
|----------------|-------------|-----------|
| 60-119 minutes | 25% of ticket price | 60% of ticket price |
| 120-179 minutes | 50% of ticket price | 60% of ticket price |
| 180+ minutes | 50% of ticket price | 75% of ticket price |

### Important Rules
- **Wait period**: 24 hours after journey before claiming
- **Deadline**: **60 days** from date of travel
- **Payment timeline**: Within 28 days of receiving claim
- **Minimum payout**: Must exceed €4
- **Per-leg calculation**: Each journey leg calculated separately
- **Return tickets**: Compensation based on half the ticket price
- **Excludes**: Force majeure circumstances (but Eurostar is generally generous)

### Expense Reimbursement (Severe Delays)
For delays > 180 minutes or cancellations requiring overnight stay:
- Hotel: Up to £150 per room per night
- Meals: Up to £35 per person
- Transport: Reasonable taxi fares to accommodation
- Submit separately via email to traveller.care@eurostar.com

## Claim Process

### Required Information
| Field | Format | Example |
|-------|--------|---------|
| Booking Reference (PNR) | 6 alphanumeric | ABC123 |
| Ticket Number (TCN) | IV + 9 digits OR 15 + 9 digits | IV123456789 |
| First Name | As on booking | John |
| Last Name | As on booking | Smith |
| Email | Valid email | john@example.com |

### Submission Methods
1. **Online Portal**: https://compensation.eurostar.com/
2. **Manage Booking**: https://www.eurostar.com/uk-en/manage-booking
3. **Email**: traveller.care@eurostar.com (for expenses)

### Claim Statuses
```typescript
type ClaimStatus =
  | 'pending'      // Waiting for 24h window
  | 'eligible'     // Can submit claim
  | 'submitted'    // User submitted to Eurostar
  | 'approved'     // Eurostar approved
  | 'rejected'     // Eurostar rejected
  | 'expired';     // Past 3-month deadline
```

## Train Fleet

### e320 (Class 374) — Siemens Velaro
- **Capacity**: 894 passengers
- **Coaches**: 16
- **Fleet size**: 17 units
- **Max speed**: 320 km/h
- **First Class**: Coaches 2-3 (London end), 14-15 (Continent end)
- **Café/Bar**: Coach 9
- **Power**: UK + EU sockets at every seat, USB-A

### e300 (Class 373) — Alstom (Refurbished 2015)
- **Capacity**: 750 passengers
- **Coaches**: 18
- **Fleet size**: 8 units
- **Max speed**: 300 km/h
- **First Class**: Middle of train
- **Notes**: Always used for Ski Train, older design

### Classic (Red Routes)
- **Capacity**: 371 passengers
- **Coaches**: 8
- **Routes**: Former Thalys services

### Ruby (Refurbished Red)
- **Capacity**: 399 passengers
- **Coaches**: 8
- **Routes**: Former Thalys services

## Classes of Service

| Class | e320 Coaches | Features |
|-------|--------------|----------|
| **Business Premier** | 1, 16 | Lounge access, meals, flexible tickets |
| **Standard Premier** | 2-3, 14-15 | Light meal, more legroom |
| **Standard** | 4-8, 10-13 | Basic service |

## Routes and Stations

### Core Routes
| Route | Duration | Trains/Day |
|-------|----------|------------|
| London ↔ Paris | 2h 16m | ~15 |
| London ↔ Brussels | 2h 01m | ~10 |
| London ↔ Amsterdam | 4h 09m | ~5 |
| London ↔ Rotterdam | 3h 13m | ~3 |

### Station Codes (GTFS)
```typescript
const STATIONS = {
  // UK
  'GBSPX': { name: 'London St Pancras', tz: 'Europe/London' },
  'GBEBS': { name: 'Ebbsfleet International', tz: 'Europe/London' },
  'GBASH': { name: 'Ashford International', tz: 'Europe/London' },

  // France
  'FRCFK': { name: 'Calais-Fréthun', tz: 'Europe/Paris' },
  'FRLPD': { name: 'Lille Europe', tz: 'Europe/Paris' },
  'FRPLY': { name: 'Paris Gare du Nord', tz: 'Europe/Paris' },

  // Belgium
  'BEBMI': { name: 'Brussels Midi/Zuid', tz: 'Europe/Brussels' },

  // Netherlands
  'NLASC': { name: 'Amsterdam Centraal', tz: 'Europe/Amsterdam' },
  'NLRDA': { name: 'Rotterdam Centraal', tz: 'Europe/Amsterdam' },
} as const;
```

## Booking Email Patterns

### Typical Structure
```
Subject: Your Eurostar booking confirmation - ABC123

Booking Reference: ABC123
Ticket Number: IV123456789

OUTBOUND JOURNEY
Train: Eurostar 9007
Date: 05 January 2026
Departs: London St Pancras 08:01
Arrives: Paris Gare du Nord 11:17

Passenger: Mr John Smith
Coach: 3
Seat: 61
```

### Regex Patterns
```typescript
const PATTERNS = {
  pnr: /(?:booking\s*reference|collection\s*reference)[:\s]*([A-Z0-9]{6})/i,
  tcn: /(IV\d{9}|15\d{9})/,
  trainNumber: /(?:eurostar|train)[:\s#]*(\d{4})/i,
  date: /(\d{1,2}\s+\w+\s+\d{4})/,
  coach: /coach[:\s]*(\d{1,2})/i,
  seat: /seat[:\s]*(\d{1,3})/i,
};
```

## Seat Intelligence

### Window View Scoring
```typescript
type WindowScore = 1 | 2 | 3 | 4 | 5;

// 5 = Perfect window alignment
// 4 = Good view, minor obstruction
// 3 = Partial view (pillar at edge)
// 2 = Mostly obstructed
// 1 = No window (wall/pillar)
```

### Known Problem Seats (e320)
- Seats 22, 52: No window (pillar position)
- Seat 55 in Coach 1: Almost entirely blank plastic
- Table seats: Metal sections between windows

### Recommended Seats
- Seat 61 in Coaches 2, 3, 14, 15: Perfect window alignment
- Seats 71, 75 in Coach 2: Good views

### Orientation Rules
```typescript
// Coach 1 is ALWAYS at London end, regardless of direction

function getSeatDirection(
  coach: number,
  seatFacesHighCoach: boolean,  // From PDF seat map
  route: 'to_london' | 'to_continent'
): 'forward' | 'backward' {
  // Seats facing higher coach numbers face toward Continent
  const facesContinent = seatFacesHighCoach;

  if (route === 'to_continent') {
    return facesContinent ? 'forward' : 'backward';
  } else {
    return facesContinent ? 'backward' : 'forward';
  }
}
```

## Check-in Requirements

### Timeline
| Event | Time Before Departure |
|-------|----------------------|
| Gates open | 60 minutes |
| Recommended arrival | 90 minutes |
| Gates close (Standard) | 30 minutes |
| Gates close (Business) | 10 minutes |

### Required Documents
- Valid passport (or ID card for EU citizens)
- Booking confirmation / barcode
- Advance Passenger Information (API) submitted

### EES (Entry/Exit System) — From April 10, 2026
- Biometric registration: face + fingerprints
- First-time registration: ~90 seconds per person
- Returning travelers: Faster (data already registered)

## Common Delay Causes

From GTFS-RT service alerts:
- Overhead power supply issues (Channel Tunnel)
- Cable theft (Northern France)
- Signaling failures (HS1 in UK)
- Border Force staffing issues
- Weather (extreme heat affects track)
- Animals on track
- Security incidents

## Useful URLs

| Resource | URL |
|----------|-----|
| Compensation Portal | https://compensation.eurostar.com/ |
| Manage Booking | https://www.eurostar.com/uk-en/manage-booking |
| Service Status | https://www.eurostar.com/uk-en/travel-info/service-information |
| Seat Maps (Agents) | https://eurostarforagents.com/door-to-door/plan-a-trip/seating-maps/ |
| Customer Service | traveller.care@eurostar.com |
