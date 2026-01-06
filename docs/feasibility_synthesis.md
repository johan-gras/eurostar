# Eurostar Digital Tools: Feasibility Synthesis

## Executive Summary

Based on extensive research across data sources, technical feasibility, and market positioning, here is the prioritized assessment of the three identified opportunities:

| Project | Feasibility | Time to MVP | Revenue Potential | Recommendation |
|---------|-------------|-------------|-------------------|----------------|
| **AutoClaim** | HIGH | 2-3 months | High (success fees) | **BUILD FIRST** |
| **RailSeatMap** | MEDIUM-HIGH | 3-4 months | Medium (affiliate/B2B) | BUILD SECOND |
| **EuroQueue** | MEDIUM | 6-8 months | Medium (premium feature) | BUILD AS PHASE 3 |

---

## Project 1: AutoClaim — Automated Delay Compensation

### What This Is

A service that monitors Eurostar journeys in real-time, detects delays that qualify for compensation, and guides users through the claim process with pre-filled forms and documentation.

### Why It's the Best First Project

1. **Data is production-ready**: The French GTFS-RT feed provides verified delay data every 30 seconds with no authentication required
2. **Clear monetization**: Success fee model (10-15% of recovered compensation) is proven by AirHelp
3. **No competition**: No existing tool automates Eurostar compensation claims
4. **Low legal risk**: "Human-in-the-loop" approach keeps final submission with the user

### How It Would Work

```
USER FLOW:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. USER ONBOARDING                                             │
│     ├─ Forward booking confirmation email                       │
│     └─ OR connect Gmail/Outlook via OAuth                       │
│                                                                 │
│  2. AUTOMATIC PARSING                                           │
│     ├─ Extract: PNR (6-char), TCN (IV + 9 digits)              │
│     ├─ Extract: Train number (4-digit, e.g., 9007)             │
│     └─ Extract: Journey date, passenger name                    │
│                                                                 │
│  3. REAL-TIME MONITORING                                        │
│     ├─ Poll GTFS-RT every 30 seconds                           │
│     ├─ Match trip_id pattern: "{train_number}-{MMDD}"          │
│     └─ Record arrival.delay from stop_time_update              │
│                                                                 │
│  4. ELIGIBILITY CHECK (24h after journey)                       │
│     ├─ Delay 60-119 min? → 25% cash / 60% voucher              │
│     ├─ Delay 120-179 min? → 50% cash / 60% voucher             │
│     └─ Delay ≥180 min? → 50% cash / 75% voucher                │
│                                                                 │
│  5. CLAIM ASSISTANCE                                            │
│     ├─ Push notification: "You're eligible for £XX"            │
│     ├─ Pre-fill claim form data                                │
│     └─ User clicks through to Eurostar portal OR               │
│         generates email for traveller.care@eurostar.com        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

**Data Endpoint (verified working)**:
```
Real-time: https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_rt_v2.bin
Static:    https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_static_commercial_v2.zip
```

**Core Python Code**:
```python
from google.transit import gtfs_realtime_pb2
import requests

def check_eurostar_delays(train_number: str, date_mmdd: str) -> int:
    """Returns delay in minutes for a specific train."""
    response = requests.get(
        "https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_rt_v2.bin"
    )
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response.content)

    target_trip_id = f"{train_number}-{date_mmdd}"

    for entity in feed.entity:
        if entity.HasField('trip_update'):
            if entity.trip_update.trip.trip_id == target_trip_id:
                # Get final stop delay
                stops = entity.trip_update.stop_time_update
                if stops:
                    final_delay = stops[-1].arrival.delay
                    return final_delay // 60  # Convert to minutes
    return 0
```

**Email Parsing Regex**:
```python
import re

def parse_eurostar_email(email_body: str) -> dict:
    return {
        'pnr': re.search(r'(?:reference)[:\s]*([A-Z0-9]{6})', email_body, re.I),
        'tcn': re.search(r'(IV\d{9}|15\d{9})', email_body),
        'train': re.search(r'(?:train|eurostar)[:\s#]*(\d{4})', email_body, re.I),
        'date': re.search(r'(\d{1,2}[\/\-]\w+[\/\-]\d{2,4})', email_body)
    }
```

### Important Claim Details (from research)

**Claim Portal**: `https://compensation.eurostar.com/`
**Email alternative**: `traveller.care@eurostar.com`
**Deadline**: 3 months from date of delay
**Minimum payout**: Must exceed €4
**Wait period**: 24 hours after journey (for systems to update)

**Required form fields**:
- Booking Reference (PNR) — 6 alphanumeric characters
- Ticket Number (TCN) — 9 digits prefixed with "IV" or "15"
- First Name
- Last Name
- Email address

**Partnership opportunity**: Resolver.co.uk offers free complaint drafting for Eurostar but doesn't automate — potential integration or differentiation point.

### Difficulties and Constraints

| Challenge | Severity | Mitigation |
|-----------|----------|------------|
| **Email parsing variability** | Medium | Support email forwarding + manual entry fallback |
| **24-hour claim window** | Low | Queue task, notify user when window opens |
| **Eurostar ToS on scraping** | Medium | Don't scrape — use open GTFS-RT data only |
| **Form automation blocking** | High | Keep human-in-the-loop: pre-fill, user submits |
| **Expense claims (>180min)** | Medium | Provide receipt upload + email template generator |
| **3-month deadline** | Low | Track and remind users before expiry |

### Revenue Model

| Model | Rate | Example |
|-------|------|---------|
| **Success fee** | 15% of cash refund | £45 refund → £6.75 fee |
| **Subscription** | £3.99/month | Unlimited claim assistance |
| **Freemium** | Free monitoring | Pay for claim generation |

### MVP Tech Stack

- **Backend**: Python (FastAPI) + PostgreSQL
- **Email parsing**: Gmail API OAuth or email forwarding
- **GTFS polling**: Celery worker every 30 seconds
- **Notifications**: SendGrid + OneSignal
- **Frontend**: React or simple web app

### Timeline to MVP: 8-12 weeks

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Week 1-2 | Data integration | GTFS-RT polling + parsing working |
| Week 3-4 | Email parsing | Booking extraction from forwarded emails |
| Week 5-6 | Core logic | Eligibility checking + notification system |
| Week 7-8 | Claim generation | Pre-filled form data + email templates |
| Week 9-10 | Frontend | User dashboard + booking management |
| Week 11-12 | Testing + launch | Beta with real users |

---

## Project 2: RailSeatMap — Seat Intelligence Tool

### What This Is

An interactive, visual seat selection guide that shows window view quality, seat orientation, power outlets, and crowdsourced reviews — essentially "SeatGuru for Eurostar."

### Why It's Valuable

1. **No competition**: SeatGuru, Aerolopa, and similar tools cover airlines only. No equivalent exists for rail.
2. **Proven demand**: Forum threads on TripAdvisor, Reddit, and Seat61 show travelers actively seeking seat advice
3. **High-intent traffic**: Users researching seats are about to book — valuable for affiliate monetization
4. **Defensible moat**: Crowdsourced seat photos create user-generated content competitors can't easily replicate

### How It Would Look

```
┌─────────────────────────────────────────────────────────────────┐
│  EUROSTAR e320 — COACH 3 (STANDARD CLASS)                       │
│  Direction: → PARIS                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   WINDOW SIDE                              AISLE                │
│   ┌──────┐ ┌──────┐          ┌──────┐ ┌──────┐                 │
│   │  31  │ │  32  │    ||    │  33  │ │  34  │                 │
│   │  🟢  │ │  🟡  │    ||    │  ⚫  │ │  ⚫  │                 │
│   │  →   │ │  →   │    ||    │  →   │ │  →   │                 │
│   └──────┘ └──────┘          └──────┘ └──────┘                 │
│                                                                 │
│   ┌──────┐ ┌──────┐          ┌──────┐ ┌──────┐                 │
│   │  35  │ │  36  │    ||    │  37  │ │  38  │                 │
│   │  🔴  │ │  🟡  │    ||    │  ⚫  │ │  ⚫  │  ← TABLE        │
│   │  ←   │ │  ←   │    ||    │  ←   │ │  ←   │                 │
│   └──────┘ └──────┘          └──────┘ └──────┘                 │
│                                                                 │
│  LEGEND:                                                        │
│  🟢 Full window view    → Forward facing (to Paris)            │
│  🟡 Partial view        ← Backward facing                      │
│  🔴 No window (pillar)  ⚫ Aisle seat                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  SEAT 31 DETAILS                                                │
│  ├─ View Score: ★★★★★ (Perfect window alignment)               │
│  ├─ Power: UK + EU socket, USB-A                               │
│  ├─ Legroom: Standard                                          │
│  ├─ 12 user photos | 4.6★ avg rating                           │
│  └─ "Great view of French countryside" — @traveler_jan25       │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

**Data Sources**:

| Train Type | Seats | Coaches | PDF Source |
|------------|-------|---------|------------|
| **e320** (Siemens Velaro) | 894 | 16 | eurostarforagents.com/.../e320_Seating-map.pdf |
| **e300** (Refurbished Alstom) | 750 | 18 | eurostarforagents.com/.../e300_Seating-map.pdf |
| **Classic** (Red routes) | 371 | 8 | eurostarforagents.com/.../Eurostar-red-classic-seat-map_EN.pdf |
| **Ruby** (Refurbished Red) | 399 | 8 | eurostarforagents.com/.../Eurostar-red-ruby-seat-map_EN.pdf |

**Good news**: PDFs are vector-based (Adobe Illustrator), making SVG conversion straightforward.

**Known problematic seats** (from Seat61 + user forums):
- Seats 22, 52: No window (pillar position)
- Seat 55 in Coach 1: "Almost entirely blank plastic"
- All table seats: Metal sections between windows can obstruct views
- The namesake "Seat 61" in first class Coaches 2/3/14/15: Perfect window alignment (recommended)

**Technical tool**: AnyChart Seat Map Framework (docs.anychart.com/Maps/Seat_Maps/) provides ready-made interactive seat selection components

**Seat Data Schema**:
```json
{
  "train_type": "e320",
  "coach": 3,
  "seat_number": "31",
  "position": "window",
  "window_view_score": 5,
  "orientation_to_paris": "forward",
  "table_type": "airline_style",
  "power": {
    "uk_socket": true,
    "eu_socket": true,
    "usb_a": true,
    "usb_c": false
  },
  "legroom": "standard",
  "accessibility": false,
  "coordinates": {"x": 150, "y": 200},
  "user_reviews": [],
  "photos": []
}
```

**Orientation Logic**:
```python
def get_seat_direction(coach: int, seat_faces_high_coach: bool, route: str) -> str:
    """
    Coach 1 is ALWAYS at London end.
    Seats facing higher coach numbers = facing Paris/Brussels/Amsterdam
    """
    if route in ["London→Paris", "London→Brussels", "London→Amsterdam"]:
        # Train moving toward high coach numbers
        return "forward" if seat_faces_high_coach else "backward"
    else:
        # Train moving toward London (low coach numbers)
        return "backward" if seat_faces_high_coach else "forward"
```

### Difficulties and Constraints

| Challenge | Severity | Mitigation |
|-----------|----------|------------|
| **PDF digitization** | High (one-time) | 40-80 hours manual work to create SVG + data |
| **Train type detection** | High | Cannot reliably determine e320 vs e300 before booking |
| **Window view classification** | Medium | Manual analysis + crowdsourced verification |
| **Seat number changes** | Low | Version control + monitoring for Eurostar changes |
| **No booking integration** | Medium | Provide guidance only, user selects on Eurostar site |

### Critical Limitation: Train Type Detection

**The Problem**: GTFS does not include train type. Eurostar can swap trains without notice.

**Workarounds**:
1. **Post-booking detection**: Once booked, "Manage Your Booking" shows coach count (16 = e320, 18 = e300)
2. **Route-based heuristics**: Ski Train always uses e300
3. **Capacity indicators**: If available, 894 seats = e320, 750 = e300
4. **User education**: Show both train types, let user identify which they have

**Recommended approach**: Build for e320 first (68% of fleet, 17 units), expand later.

### Revenue Model

| Model | Implementation |
|-------|----------------|
| **Affiliate** | Partner with hotels (Booking.com), travel insurance (Allianz), luggage storage |
| **B2B API** | Sell seat intelligence API to corporate travel management tools |
| **Premium features** | Seat alerts when "good seats" become available |
| **Sponsored placements** | Feature Business Premier as "best experience" |

### Timeline to MVP: 12-16 weeks

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Week 1-4 | PDF digitization | e320 SVG maps + initial seat data |
| Week 5-6 | Data enrichment | Window scores, power mapping |
| Week 7-8 | Interactive frontend | React seat map with click-to-detail |
| Week 9-10 | Orientation logic | Route-aware direction display |
| Week 11-12 | Crowdsourcing | Photo upload, review submission |
| Week 13-16 | e300 + testing | Second train type + beta launch |

---

## Project 3: EuroQueue — Terminal Queue Predictor

### What This Is

A predictive tool that estimates security/check-in queue times at Eurostar terminals, helping travelers optimize their arrival time instead of the default "arrive 90 minutes early" advice.

### Why It's Challenging But Valuable

1. **No direct data**: Eurostar does not publish queue times (unlike some airports)
2. **High user pain point**: The "90-minute black box" is a top complaint in user reviews
3. **EES complication**: New EU biometric Entry/Exit System (full rollout April 10, 2026) adds ~90 seconds per passenger for biometric registration
4. **Crowdsourcing dependency**: Accuracy requires critical mass of user reports (~100-200 daily)
5. **Eurostar £100M renovation**: St Pancras overhaul aims to reduce waits to 15 minutes — could reduce tool value, or increase it during transition chaos

### How It Would Work

```
┌─────────────────────────────────────────────────────────────────┐
│  EUROQUEUE — ST PANCRAS INTERNATIONAL                           │
│  Your train: 9007 to Paris │ Departs: 14:04                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CURRENT STATUS                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ██████████████░░░░░░░░░░░░░░░░░░░  MODERATE            │   │
│  │  Estimated wait: 25-35 minutes                          │   │
│  │  Confidence: Medium (based on 12 reports today)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  RECOMMENDATION                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✓ Arrive by 13:15 (49 min before departure)            │   │
│  │    This gives 15 min buffer over estimated wait         │   │
│  │                                                          │   │
│  │  ⚡ Smart Alarm: Wake me at 11:45 for this train        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  TODAY'S PATTERN                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  06:00  ░░░░░░░░░░  Light                               │   │
│  │  08:00  ██████████████████  Busy (morning peak)         │   │
│  │  12:00  ██████████░░░░░░░░  Moderate                    │   │
│  │  14:00  ████████████░░░░░░  Moderate-Busy ← YOUR TRAIN  │   │
│  │  18:00  ████████████████████████  Very Busy (evening)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [ Report your wait time ]  [ Set Smart Alarm ]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

**Proxy Data Sources**:

| Source | Data | Quality | Use |
|--------|------|---------|-----|
| Eurostar GTFS | Train schedules + capacity | High | "Departure density" calculation |
| TfL API | Station entry/exit counts | Medium | Ambient crowd level proxy |
| Google Popular Times | Station busyness | Medium | Historical patterns + live calibration |
| Crowdsourced reports | Actual wait times | Variable | Ground truth for model training |

**TfL API Endpoint**:
```
https://api.tfl.gov.uk/StopPoint/{station-id}?includeCrowdingData=true
```
Returns passenger flow in 15-minute increments. Note: Covers entire King's Cross St Pancras complex — Eurostar is small fraction of total traffic.

**Google Popular Times**: No official API. Use `populartimes` Python library (github.com/m-wrzr/populartimes) or `LivePopularTimes` package for scraping.

**Departure Density Algorithm**:
```python
from datetime import datetime, timedelta

def calculate_departure_density(departure_time: datetime) -> int:
    """
    Calculate theoretical passenger load in 30-min window around departure.
    Returns estimated number of passengers competing for security.
    """
    window_start = departure_time - timedelta(minutes=90)  # When passengers arrive
    window_end = departure_time - timedelta(minutes=30)    # Gate closure

    # Query GTFS for trains departing in this window
    trains = get_trains_in_window(window_start, window_end)

    total_passengers = 0
    for train in trains:
        # e320 = 894 seats, e300 = 750 seats
        # Assume 85% load factor on average
        capacity = 894 if train.coaches == 16 else 750
        total_passengers += capacity * 0.85

    return total_passengers
```

**Prediction Model Features**:
```python
features = {
    # Schedule-based (deterministic)
    'departure_density': calculate_departure_density(departure_time),
    'hour_of_day': departure_time.hour,
    'day_of_week': departure_time.weekday(),
    'month': departure_time.month,

    # Calendar-based
    'is_school_holiday': check_school_holidays(departure_time),
    'is_bank_holiday': check_bank_holidays(departure_time),
    'days_to_christmas': days_until(departure_time, 'christmas'),

    # External signals (if available)
    'tfl_station_exits': get_tfl_exits(departure_time - timedelta(hours=1)),
    'google_popular_times': get_google_busyness('St Pancras'),

    # Crowdsourced (when available)
    'recent_reports_avg': get_recent_wait_reports(hours=2),
    'report_count': count_reports_today()
}
```

### Difficulties and Constraints

| Challenge | Severity | Mitigation |
|-----------|----------|------------|
| **No direct queue data** | Critical | Proxy-based model is fundamentally limited |
| **TfL data is noisy** | High | Eurostar is tiny fraction of station traffic |
| **Google Popular Times** | Medium | Requires scraping, coarse granularity |
| **Cold start problem** | High | Launch with schedule-based baseline, improve with data |
| **Crowdsourcing critical mass** | High | Need ~100-200 daily reports for reliability |
| **EES unpredictability** | Medium | Actually increases tool value, but harder to model |
| **Eurostar £100M renovation** | Risk | May reduce queues to 15 min, reducing tool value |

### Accuracy Expectations (Realistic)

| Data Combination | Expected Accuracy |
|------------------|-------------------|
| Schedule-only baseline | ±30-45 minutes |
| + Temporal patterns | ±20-30 minutes |
| + TfL + Google data | ±15-20 minutes |
| + Active crowdsourcing | ±10-15 minutes |
| + 6 months of ML training | ±5-10 minutes |

**Key insight**: Even ±15-minute accuracy is valuable. Users want directional guidance ("busier than usual today") not precise minute estimates.

### Revenue Model

| Model | Implementation |
|-------|----------------|
| **Freemium** | Basic busyness indicator free, "Smart Alarm" is premium |
| **Data licensing** | Sell queue prediction API to corporate travel tools |
| **Integration partnerships** | Embed in Trainline, TripIt, Google Maps |

### Timeline to MVP: 20-24 weeks

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Week 1-4 | Schedule model | Departure density calculation + temporal patterns |
| Week 5-8 | External data | TfL API integration + Google scraping |
| Week 9-12 | Baseline predictor | Simple model with confidence intervals |
| Week 13-16 | Crowdsourcing | "Report wait time" feature + data collection |
| Week 17-20 | ML refinement | Train model on collected data |
| Week 21-24 | Smart Alarm | Push notification system + beta launch |

### Recommendation: Build as Phase 3

EuroQueue is the most ambitious project with the least certain data foundation. However, if AutoClaim and RailSeatMap build an engaged user base first, EuroQueue benefits from:
1. Existing users to bootstrap crowdsourcing
2. Proven technical infrastructure
3. Trust/brand recognition for new feature adoption

---

## Bonus Opportunity: API Passport Scanner

The research identified a fourth, smaller-scope tool addressing user complaints about manual Advance Passenger Information (API) entry.

### The Problem
Post-Brexit, every passenger must upload passport details before travel. User feedback indicates the current Eurostar implementation is "buggy and repetitive" — failing to save details for frequent fellow travelers.

### The Solution
A simple utility that:
1. Uses iOS/Android native OCR to scan the passport Machine Readable Zone (MRZ)
2. Parses MRZ into required fields (Name, DOB, Passport Number, Nationality, Expiry)
3. Formats data for copy/paste into Eurostar's "Manage Booking" form

### Implementation
```python
# MRZ parsing is well-documented
# Line 1: P<GBRSURNAME<<FIRSTNAME<<<<<<<<<<<<<<<<<<
# Line 2: PASSPORT#<NATIONALITY<DOB<SEX<EXPIRY<<<<<CHECK

import re

def parse_mrz(mrz_text: str) -> dict:
    lines = mrz_text.strip().split('\n')
    # Line 1: Type, Country, Names
    names = lines[0][5:].replace('<', ' ').strip().split('  ')
    surname, given = names[0], names[1] if len(names) > 1 else ''

    # Line 2: Passport number, nationality, DOB, sex, expiry
    line2 = lines[1]
    return {
        'surname': surname,
        'given_names': given,
        'passport_number': line2[0:9].replace('<', ''),
        'nationality': line2[10:13],
        'date_of_birth': parse_date(line2[13:19]),  # YYMMDD
        'expiry_date': parse_date(line2[21:27]),
    }
```

### Scope
This is a **quick-win micro-tool** — could be built in 1-2 weeks, integrated into the main app, or released as a standalone utility. Low risk, immediate value for frequent travelers with multiple passengers.

---

## Shared Technical Infrastructure

All three projects share common data needs. Building a unified backend maximizes efficiency:

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHARED DATA LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ GTFS-RT Poller  │  │ Static GTFS     │  │ Infrabel        │ │
│  │ (30-sec cycle)  │  │ (Daily update)  │  │ (Monthly)       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│           └────────────────────┼────────────────────┘          │
│                                │                               │
│                    ┌───────────▼───────────┐                   │
│                    │   Unified Train DB    │                   │
│                    │   (PostgreSQL)        │                   │
│                    └───────────┬───────────┘                   │
│                                │                               │
│         ┌──────────────────────┼──────────────────────┐        │
│         │                      │                      │        │
│  ┌──────▼──────┐       ┌───────▼───────┐      ┌──────▼──────┐ │
│  │  AutoClaim  │       │  RailSeatMap  │      │  EuroQueue  │ │
│  │  Service    │       │  Service      │      │  Service    │ │
│  └─────────────┘       └───────────────┘      └─────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Core Data Models

```python
# Shared across all services
class Train(BaseModel):
    trip_id: str           # "9007-0105"
    train_number: str      # "9007"
    date: date             # 2026-01-05
    origin: str            # "FRPLY" (Paris Gare du Nord)
    destination: str       # "GBSPX" (St Pancras)
    scheduled_departure: datetime
    scheduled_arrival: datetime
    actual_arrival: datetime | None
    delay_minutes: int | None
    train_type: str | None # "e320" | "e300" | None

class UserBooking(BaseModel):
    user_id: str
    pnr: str               # "ABC123"
    tcn: str               # "IV123456789"
    train: Train
    passenger_name: str
    class_of_service: str  # "standard" | "standard_premier" | "business_premier"
    coach: int | None
    seat: str | None

class CompensationClaim(BaseModel):
    booking: UserBooking
    delay_minutes: int
    eligible_amount_cash: Decimal
    eligible_amount_voucher: Decimal
    claim_status: str      # "pending" | "submitted" | "approved" | "rejected"
    submitted_at: datetime | None
```

### Data Integration Challenges

**Train ID Format Mismatch**:
- UK systems use letters: `9Oxx` or `9Ixx` (letter O/I)
- Continental systems use digits: `90xx` or `91xx` (digit 0/1)
- Solution: Normalize to 4-digit format, treat O↔0 and I↔1 as equivalent

**Timezone Handling**:
```python
# Eurostar crosses 3 timezones (but Paris/Brussels are same)
TIMEZONES = {
    'GBSPX': 'Europe/London',      # St Pancras
    'FRPLY': 'Europe/Paris',       # Gare du Nord
    'BEBMI': 'Europe/Brussels',    # Brussels Midi
    'NLASC': 'Europe/Amsterdam',   # Amsterdam Centraal
}

# GTFS uses agency_timezone (Europe/Paris) as default
# Always store in UTC internally, convert for display
```

**HS1 Coverage Gap**:
Network Rail Darwin/TRUST feeds may not include Eurostar services on High Speed 1. The UK leg from St Pancras to the Channel Tunnel portal operates on separate HS1 Ltd infrastructure. French GTFS-RT feed appears to cover the full journey, making this less critical but worth noting.

**Infrabel Historical Data Limitation**:
Belgian punctuality data is monthly aggregates only (not per-train), and only covers the Belgian segment. Useful for seasonal/trend analysis, not individual train reliability scoring.

---

## Risk Matrix

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Eurostar launches competing feature** | High | Medium | Move fast, build community moat |
| **GTFS-RT feed discontinued** | Critical | Low | It's government-mandated open data |
| **ToS enforcement on form automation** | Medium | Medium | Human-in-the-loop design |
| **Low user adoption** | High | Medium | Start with AutoClaim (clear value prop) |
| **Train type detection impossible** | Medium | High | Accept limitation, show both options |
| **EuroQueue accuracy insufficient** | Medium | High | Set expectations as "indicator" not "precise" |
| **GDPR/data privacy issues** | High | Low | Standard consent flows, data minimization |

---

## Recommended Execution Order

### Phase 1: AutoClaim MVP (Months 1-3)
- Build GTFS-RT polling infrastructure
- Email parsing for booking extraction
- Delay monitoring + compensation calculation
- Notification system + claim generation
- **Goal**: 1,000 beta users, first successful claims

### Phase 2: RailSeatMap MVP (Months 3-6)
- Digitize e320 seat maps
- Build interactive visualization
- Implement orientation logic
- Launch crowdsourced reviews
- **Goal**: 10,000 monthly visitors, affiliate revenue

### Phase 3: EuroQueue Beta (Months 6-9)
- Build departure density model
- Integrate TfL + Google data
- Launch crowdsourcing in app
- Train initial ML model
- **Goal**: Prove ±15-minute accuracy possible

### Phase 4: Super-App Integration (Months 9-12)
- Unify all three tools into single experience
- Cross-sell features to engaged users
- Launch premium subscription tier
- **Goal**: Sustainable revenue, 50,000+ users

---

## Conclusion

The research confirms a genuine market opportunity. The data infrastructure is more accessible than expected (French GTFS-RT is excellent), and competition is minimal. The recommended path is:

1. **Start with AutoClaim** — clearest value, best data, proven revenue model
2. **Add RailSeatMap** — builds engaged user base, complements AutoClaim
3. **Expand to EuroQueue** — most ambitious, benefits from existing users

The "Super-App" vision is achievable, but should be built incrementally with each tool validating demand before expanding scope.

---

## Appendix: Key URLs and Resources

### Data Endpoints (Production Ready)

| Resource | URL |
|----------|-----|
| **Eurostar GTFS-RT (real-time)** | `https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_rt_v2.bin` |
| **Eurostar GTFS (static)** | `https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_static_commercial_v2.zip` |
| **French Transport Portal** | `https://transport.data.gouv.fr/datasets/eurostar-gtfs-plan-de-transport-et-temps-reel` |
| **Infrabel Punctuality** | `https://www.odwb.be/explore/dataset/stiptheid-van-eurostar-treinen/` |
| **TfL Crowding API** | `https://api.tfl.gov.uk/StopPoint/{id}?includeCrowdingData=true` |

### Eurostar Official Resources

| Resource | URL |
|----------|-----|
| **Compensation Portal** | `https://compensation.eurostar.com/` |
| **Compensation Email** | `traveller.care@eurostar.com` |
| **Agent Seat Maps** | `https://eurostarforagents.com/door-to-door/plan-a-trip/seating-maps/` |
| **Service Status** | `https://www.eurostar.com/uk-en/travel-info/service-information` |

### Libraries and Tools

| Library | Language | Purpose |
|---------|----------|---------|
| `gtfs-realtime-bindings` | Python | Parse GTFS-RT Protocol Buffers |
| `populartimes` | Python | Scrape Google Popular Times |
| `stomp.py` | Python | Network Rail Darwin STOMP client |
| `nre-darwin-py` | Python | National Rail Enquiries wrapper |
| AnyChart Seat Maps | JavaScript | Interactive seat visualization |

### Community Resources

| Resource | URL |
|----------|-----|
| **Seat61** | `https://www.seat61.com/Eurostar.htm` |
| **Resolver (Complaints)** | `https://www.resolver.co.uk/companies/eurostar-complaints` |
| **r/Eurostar** | `https://www.reddit.com/r/Eurostar/` |
| **Open Rail Data Wiki** | `https://wiki.openraildata.com/` |
