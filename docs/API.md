# Eurostar Tools API Documentation

**Base URL**: `https://api.eurostar-tools.com` (production) | `http://localhost:3000` (development)

**API Version**: v1

---

## Table of Contents

- [Authentication](#authentication)
- [Common Response Formats](#common-response-formats)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health](#health-endpoints)
  - [Auth](#authentication-endpoints)
  - [Bookings](#booking-endpoints)
  - [Claims](#claim-endpoints)
  - [Seats](#seat-endpoints)
  - [Queue](#queue-endpoints)
  - [User Preferences](#user-preferences-endpoints)

---

## Authentication

The API uses JWT (JSON Web Token) bearer authentication for protected endpoints.

### Token Types

| Token Type | Expiry | Storage |
|------------|--------|---------|
| Access Token | 15 minutes | Client memory |
| Refresh Token | 7 days | HTTP-only cookie / secure storage |

### Using Authentication

Include the access token in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

### Token Refresh Flow

1. When access token expires, call `POST /api/v1/auth/refresh` with the refresh token
2. Receive new access and refresh tokens
3. Replace stored tokens with new ones

---

## Common Response Formats

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

The `meta` field is included for paginated endpoints.

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `INVALID_TOKEN` | 401 | Token format or signature is invalid |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `VALIDATION_ERROR` | 400 | Request body/params failed validation |
| `INVALID_REQUEST` | 400 | Malformed request |
| `NOT_FOUND` | 404 | Requested resource not found |
| `BOOKING_NOT_FOUND` | 404 | Booking does not exist |
| `CLAIM_NOT_FOUND` | 404 | Claim does not exist |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `ALREADY_EXISTS` | 409 | Resource already exists (duplicate) |
| `INVALID_STATUS_TRANSITION` | 422 | Invalid status change requested |
| `PARSE_ERROR` | 400 | Failed to parse email content |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `DATABASE_ERROR` | 500 | Database connection/query error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Rate Limiting

| Scope | Limit |
|-------|-------|
| Global (per IP) | 100 requests/minute |
| Auth endpoints | 10 requests/minute |
| Token refresh | 20 requests/minute |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
Retry-After: 60
```

---

## Endpoints

### Health Endpoints

Health check endpoints for monitoring and orchestration. No authentication required.

#### `GET /health`

Basic health check returning service status.

**Response**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

#### `GET /health/live`

Kubernetes liveness probe.

**Response**

```json
{
  "status": "ok"
}
```

#### `GET /health/ready`

Kubernetes readiness probe. Checks database and Redis connectivity.

**Response**

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

### Authentication Endpoints

#### `POST /api/v1/auth/register`

Register a new user account.

**Rate Limit**: 10 requests/minute

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |
| `name` | string | Yes | 1-100 characters |

**Response** `201 Created`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Errors**

- `ALREADY_EXISTS` - Email already registered

---

#### `POST /api/v1/auth/login`

Authenticate an existing user.

**Rate Limit**: 10 requests/minute

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response** `200 OK`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Errors**

- `UNAUTHORIZED` - Invalid email or password

---

#### `POST /api/v1/auth/logout`

Logout and invalidate current session.

**Authentication**: Required

**Response** `200 OK`

```json
{
  "message": "Successfully logged out"
}
```

---

#### `POST /api/v1/auth/refresh`

Refresh access token using a valid refresh token.

**Rate Limit**: 20 requests/minute

**Request Body**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** `200 OK`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Errors**

- `INVALID_TOKEN` - Refresh token is invalid or expired

---

#### `GET /api/v1/auth/me`

Get current authenticated user details.

**Authentication**: Required

**Response** `200 OK`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### Booking Endpoints

Manage Eurostar bookings for delay tracking and compensation claims.

**Authentication**: Required for all booking endpoints

#### `POST /api/v1/bookings`

Create a new booking from confirmation email or manual entry.

**Option 1: Email-based (recommended)**

```json
{
  "emailBody": "Your Eurostar booking confirmation...(full email content)"
}
```

**Option 2: Manual entry**

```json
{
  "pnr": "ABC123",
  "tcn": "IV123456789",
  "trainNumber": "9024",
  "journeyDate": "2024-03-15",
  "passengerName": "John Doe",
  "origin": "FRPNO",
  "destination": "GBSPX",
  "coach": "5",
  "seat": "42"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `pnr` | string | Yes | 6 alphanumeric characters |
| `tcn` | string | Yes | Starts with `IV` or `15` + 9 digits |
| `trainNumber` | string | Yes | 4 digits |
| `journeyDate` | string | Yes | `YYYY-MM-DD` format |
| `passengerName` | string | Yes | Non-empty string |
| `origin` | string | Yes | 2-10 character station code |
| `destination` | string | Yes | 2-10 character station code |
| `coach` | string | No | Coach number |
| `seat` | string | No | Seat number |

**Response** `201 Created`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "pnr": "ABC123",
    "tcn": "IV123456789",
    "trainNumber": "9024",
    "journeyDate": "2024-03-15",
    "passengerName": "John Doe",
    "origin": "FRPNO",
    "destination": "GBSPX",
    "coach": "5",
    "seat": "42",
    "finalDelayMinutes": null,
    "trainId": null,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Errors**

- `VALIDATION_ERROR` - Invalid booking data
- `PARSE_ERROR` - Failed to parse email content
- `ALREADY_EXISTS` - Booking with same PNR/TCN exists

---

#### `GET /api/v1/bookings`

List all bookings for the authenticated user.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status |

**Status Values**: `pending`, `completed`, `with_delay`

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "pnr": "ABC123",
      "tcn": "IV123456789",
      "trainNumber": "9024",
      "journeyDate": "2024-03-15",
      "passengerName": "John Doe",
      "origin": "FRPNO",
      "destination": "GBSPX",
      "coach": "5",
      "seat": "42",
      "finalDelayMinutes": 75,
      "trainId": "660e8400-e29b-41d4-a716-446655440001",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-02T15:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

#### `GET /api/v1/bookings/:id`

Get detailed booking information including delay status.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Booking ID |

**Response** `200 OK`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "pnr": "ABC123",
    "tcn": "IV123456789",
    "trainNumber": "9024",
    "journeyDate": "2024-03-15",
    "passengerName": "John Doe",
    "origin": "FRPNO",
    "destination": "GBSPX",
    "coach": "5",
    "seat": "42",
    "finalDelayMinutes": 75,
    "trainId": "660e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-02T15:30:00.000Z",
    "delayInfo": {
      "scheduledArrival": "2024-03-15T14:00:00.000Z",
      "actualArrival": "2024-03-15T15:15:00.000Z",
      "delayMinutes": 75,
      "eligibleForCompensation": true
    },
    "claim": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "status": "eligible",
      "eligibleCashAmount": 52.00,
      "eligibleVoucherAmount": 65.00
    }
  }
}
```

**Errors**

- `BOOKING_NOT_FOUND` - Booking does not exist or belongs to another user

---

### Claim Endpoints

Manage delay compensation claims.

**Authentication**: Required for all claim endpoints

#### `GET /api/v1/claims`

List all claims for the authenticated user.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status |

**Status Values**: `pending`, `eligible`, `submitted`, `approved`, `rejected`, `expired`

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "bookingId": "550e8400-e29b-41d4-a716-446655440000",
      "delayMinutes": 75,
      "eligibleCashAmount": 52.00,
      "eligibleVoucherAmount": 65.00,
      "status": "eligible",
      "submittedAt": null,
      "createdAt": "2024-03-16T10:00:00.000Z",
      "updatedAt": "2024-03-16T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

#### `GET /api/v1/claims/:id`

Get claim details with pre-filled form data for submission.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Claim ID |

**Response** `200 OK`

```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "bookingId": "550e8400-e29b-41d4-a716-446655440000",
    "delayMinutes": 75,
    "eligibleCashAmount": 52.00,
    "eligibleVoucherAmount": 65.00,
    "status": "eligible",
    "submittedAt": null,
    "createdAt": "2024-03-16T10:00:00.000Z",
    "updatedAt": "2024-03-16T10:00:00.000Z",
    "formData": {
      "pnr": "ABC123",
      "tcn": "IV123456789",
      "passengerName": "John Doe",
      "journeyDate": "2024-03-15",
      "trainNumber": "9024",
      "origin": "Paris Gare du Nord",
      "destination": "London St Pancras",
      "delayMinutes": 75,
      "compensationType": "cash",
      "eurostarClaimUrl": "https://www.eurostar.com/uk-en/travel-info/service-information/delay-compensation"
    },
    "booking": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "pnr": "ABC123",
      "journeyDate": "2024-03-15"
    }
  }
}
```

**Errors**

- `CLAIM_NOT_FOUND` - Claim does not exist or belongs to another user

---

#### `POST /api/v1/claims/:id/submitted`

Mark a claim as submitted (user has completed the Eurostar form).

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Claim ID |

**Response** `200 OK`

```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "bookingId": "550e8400-e29b-41d4-a716-446655440000",
    "delayMinutes": 75,
    "eligibleCashAmount": 52.00,
    "eligibleVoucherAmount": 65.00,
    "status": "submitted",
    "submittedAt": "2024-03-16T12:00:00.000Z",
    "createdAt": "2024-03-16T10:00:00.000Z",
    "updatedAt": "2024-03-16T12:00:00.000Z"
  }
}
```

**Errors**

- `CLAIM_NOT_FOUND` - Claim does not exist
- `INVALID_STATUS_TRANSITION` - Claim is not in `eligible` status

---

### Seat Endpoints

Get seat information and recommendations for Eurostar trains.

**Authentication**: Not required

#### `GET /api/v1/seats/:trainType/coaches`

List all coaches with seat counts for a train type.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `trainType` | string | One of: `e320`, `e300`, `classic`, `ruby` |

**Response** `200 OK`

```json
{
  "data": [
    {
      "coachNumber": "1",
      "class": "business-premier",
      "totalSeats": 29,
      "features": ["quiet", "meal-service", "lounge-access"]
    },
    {
      "coachNumber": "5",
      "class": "standard-premier",
      "totalSeats": 42,
      "features": ["meal-at-seat", "extra-legroom"]
    },
    {
      "coachNumber": "10",
      "class": "standard",
      "totalSeats": 56,
      "features": ["power-sockets", "wifi"]
    }
  ]
}
```

---

#### `GET /api/v1/seats/:trainType/coach/:coachNumber`

Get all seats in a specific coach.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `trainType` | string | One of: `e320`, `e300`, `classic`, `ruby` |
| `coachNumber` | string | Coach number |

**Response** `200 OK`

```json
{
  "data": [
    {
      "seatNumber": "41",
      "position": "window",
      "direction": "forward",
      "hasTable": true,
      "hasPowerSocket": true,
      "isQuietZone": false,
      "isAccessible": false,
      "nearToilet": false,
      "noWindow": false
    },
    {
      "seatNumber": "42",
      "position": "aisle",
      "direction": "forward",
      "hasTable": true,
      "hasPowerSocket": true,
      "isQuietZone": false,
      "isAccessible": false,
      "nearToilet": false,
      "noWindow": false
    }
  ]
}
```

---

#### `GET /api/v1/seats/:trainType/:coach/:seatNumber`

Get detailed information about a specific seat.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `trainType` | string | One of: `e320`, `e300`, `classic`, `ruby` |
| `coach` | string | Coach number |
| `seatNumber` | string | Seat number |

**Response** `200 OK`

```json
{
  "data": {
    "seatNumber": "42",
    "coach": "5",
    "class": "standard-premier",
    "position": "aisle",
    "direction": "forward",
    "hasTable": true,
    "hasPowerSocket": true,
    "isQuietZone": false,
    "isAccessible": false,
    "nearToilet": false,
    "noWindow": false,
    "notes": "Table seat, good for working"
  }
}
```

**Errors**

- `NOT_FOUND` - Seat not found

---

#### `POST /api/v1/seats/:trainType/recommend`

Get recommended seats based on preferences.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `trainType` | string | One of: `e320`, `e300`, `classic`, `ruby` |

**Request Body**

```json
{
  "coachClass": "standard",
  "count": 2,
  "preferences": {
    "preferWindow": true,
    "preferQuiet": false,
    "preferTable": true,
    "avoidToilet": true,
    "avoidNoWindow": true,
    "needsAccessible": false,
    "travelingTogether": 2,
    "facingPreference": "forward"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `coachClass` | string | Yes | `standard`, `standard-premier`, or `business-premier` |
| `count` | integer | No | Number of seats needed (default: 1) |
| `preferences.preferWindow` | boolean | No | Prefer window seats |
| `preferences.preferQuiet` | boolean | No | Prefer quiet coach |
| `preferences.preferTable` | boolean | No | Prefer table seats |
| `preferences.avoidToilet` | boolean | No | Avoid seats near toilets |
| `preferences.avoidNoWindow` | boolean | No | Avoid seats with no/limited window |
| `preferences.needsAccessible` | boolean | No | Need accessible seating |
| `preferences.travelingTogether` | integer | No | Number in party (for adjacent seats) |
| `preferences.facingPreference` | string | No | `forward`, `backward`, or `any` |

**Response** `200 OK`

```json
{
  "data": [
    {
      "coach": "10",
      "seats": ["41", "42"],
      "score": 95,
      "matchedPreferences": ["window", "table", "forward-facing", "adjacent"],
      "notes": "Window and aisle pair at table, forward-facing"
    },
    {
      "coach": "12",
      "seats": ["23", "24"],
      "score": 88,
      "matchedPreferences": ["window", "table", "adjacent"],
      "notes": "Window and aisle pair at table, backward-facing"
    }
  ]
}
```

---

### Queue Endpoints

Get queue predictions for Eurostar terminals.

**Authentication**: Not required

#### `GET /api/v1/queue/terminals`

List all supported terminals.

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "st-pancras",
      "name": "London St Pancras International",
      "timezone": "Europe/London",
      "checkInOpensMinutes": 90,
      "checkInClosesMinutes": 30
    },
    {
      "id": "gare-du-nord",
      "name": "Paris Gare du Nord",
      "timezone": "Europe/Paris",
      "checkInOpensMinutes": 60,
      "checkInClosesMinutes": 30
    },
    {
      "id": "brussels-midi",
      "name": "Brussels Midi/Zuid",
      "timezone": "Europe/Brussels",
      "checkInOpensMinutes": 60,
      "checkInClosesMinutes": 30
    },
    {
      "id": "amsterdam-centraal",
      "name": "Amsterdam Centraal",
      "timezone": "Europe/Amsterdam",
      "checkInOpensMinutes": 60,
      "checkInClosesMinutes": 30
    }
  ]
}
```

---

#### `GET /api/v1/queue/:terminal/current`

Get current queue prediction for a terminal.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `terminal` | string | Terminal ID |

**Response** `200 OK`

```json
{
  "data": {
    "terminal": "st-pancras",
    "timestamp": "2024-01-01T14:30:00.000Z",
    "currentWaitMinutes": 25,
    "crowdLevel": "moderate",
    "confidence": 0.85,
    "factors": [
      "Peak departure time (15:00-16:00)",
      "School holiday period",
      "No reported disruptions"
    ],
    "recommendation": "Arrive at least 60 minutes before departure"
  }
}
```

**Crowd Levels**: `very-low`, `low`, `moderate`, `high`, `very-high`

---

#### `GET /api/v1/queue/:terminal/timeline`

Get hourly queue predictions.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `terminal` | string | Terminal ID |

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hours` | integer | 12 | Number of hours to predict (1-48) |

**Response** `200 OK`

```json
{
  "data": [
    {
      "time": "2024-01-01T15:00:00.000Z",
      "predictedWaitMinutes": 30,
      "crowdLevel": "high",
      "confidence": 0.82
    },
    {
      "time": "2024-01-01T16:00:00.000Z",
      "predictedWaitMinutes": 20,
      "crowdLevel": "moderate",
      "confidence": 0.78
    },
    {
      "time": "2024-01-01T17:00:00.000Z",
      "predictedWaitMinutes": 10,
      "crowdLevel": "low",
      "confidence": 0.75
    }
  ]
}
```

---

#### `POST /api/v1/queue/:terminal/best-arrival`

Get recommended arrival time for a departure.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `terminal` | string | Terminal ID |

**Request Body**

```json
{
  "departureTime": "2024-01-01T16:00:00.000Z",
  "maxWaitMinutes": 30
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `departureTime` | string | Yes | ISO 8601 departure time |
| `maxWaitMinutes` | integer | No | Maximum acceptable wait (default: 45) |

**Response** `200 OK`

```json
{
  "data": {
    "recommendedArrival": "2024-01-01T14:45:00.000Z",
    "predictedWaitMinutes": 25,
    "bufferMinutes": 15,
    "crowdLevel": "moderate",
    "notes": "Arriving at 14:45 gives you 25 min queue time + 15 min buffer + 35 min for check-in/boarding"
  }
}
```

---

### User Preferences Endpoints

Manage user preferences for seats and notifications.

**Authentication**: Required

#### `GET /api/v1/user/preferences`

Get current user preferences.

**Response** `200 OK`

```json
{
  "data": {
    "seatPreferences": {
      "position": "window",
      "direction": "forward",
      "coach": "quiet",
      "table": true,
      "powerSocket": true
    },
    "queueNotifications": {
      "enabled": true,
      "advanceMinutes": 120,
      "thresholds": {
        "high": true,
        "veryHigh": true
      }
    },
    "defaultTerminal": "st-pancras",
    "preferredCompensationType": "cash"
  }
}
```

---

#### `PATCH /api/v1/user/preferences`

Update user preferences.

**Request Body**

```json
{
  "seatPreferences": {
    "position": "aisle",
    "direction": "any",
    "coach": "standard",
    "table": false,
    "powerSocket": true
  },
  "queueNotifications": {
    "enabled": true,
    "advanceMinutes": 180
  },
  "defaultTerminal": "gare-du-nord",
  "preferredCompensationType": "voucher"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `seatPreferences.position` | string | `window`, `aisle`, or `middle` |
| `seatPreferences.direction` | string | `forward`, `backward`, or `any` |
| `seatPreferences.coach` | string | `quiet`, `standard`, or `any` |
| `seatPreferences.table` | boolean | Prefer table seats |
| `seatPreferences.powerSocket` | boolean | Require power socket |
| `queueNotifications.enabled` | boolean | Enable queue alerts |
| `queueNotifications.advanceMinutes` | integer | Minutes before departure to alert |
| `defaultTerminal` | string | Default terminal ID |
| `preferredCompensationType` | string | `cash` or `voucher` |

**Response** `200 OK`

```json
{
  "data": {
    "seatPreferences": { ... },
    "queueNotifications": { ... },
    "defaultTerminal": "gare-du-nord",
    "preferredCompensationType": "voucher"
  }
}
```

---

## Examples

### Complete Authentication Flow

```bash
# 1. Register
curl -X POST https://api.eurostar-tools.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secure123","name":"John"}'

# 2. Login (if already registered)
curl -X POST https://api.eurostar-tools.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secure123"}'

# 3. Use access token for protected endpoints
curl https://api.eurostar-tools.com/api/v1/bookings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 4. Refresh token when expired
curl -X POST https://api.eurostar-tools.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGciOiJIUzI1NiIs..."}'
```

### Create Booking and Check for Delays

```bash
# Create booking from confirmation email
curl -X POST https://api.eurostar-tools.com/api/v1/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailBody":"Dear John, Thank you for booking with Eurostar..."}'

# Or create manually
curl -X POST https://api.eurostar-tools.com/api/v1/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pnr": "ABC123",
    "tcn": "IV123456789",
    "trainNumber": "9024",
    "journeyDate": "2024-03-15",
    "passengerName": "John Doe",
    "origin": "FRPNO",
    "destination": "GBSPX"
  }'

# Check booking for delay info
curl https://api.eurostar-tools.com/api/v1/bookings/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

### Claim Compensation

```bash
# List eligible claims
curl "https://api.eurostar-tools.com/api/v1/claims?status=eligible" \
  -H "Authorization: Bearer $TOKEN"

# Get claim details with pre-filled form data
curl https://api.eurostar-tools.com/api/v1/claims/770e8400-e29b-41d4-a716-446655440002 \
  -H "Authorization: Bearer $TOKEN"

# After submitting form on Eurostar website, mark as submitted
curl -X POST https://api.eurostar-tools.com/api/v1/claims/770e8400-e29b-41d4-a716-446655440002/submitted \
  -H "Authorization: Bearer $TOKEN"
```

### Get Seat Recommendations

```bash
# Get recommended seats for a group of 2
curl -X POST https://api.eurostar-tools.com/api/v1/seats/e320/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "coachClass": "standard",
    "count": 2,
    "preferences": {
      "preferWindow": true,
      "preferTable": true,
      "travelingTogether": 2,
      "facingPreference": "forward"
    }
  }'
```

### Check Queue Before Travel

```bash
# Get current queue status
curl https://api.eurostar-tools.com/api/v1/queue/st-pancras/current

# Get timeline for next 6 hours
curl "https://api.eurostar-tools.com/api/v1/queue/st-pancras/timeline?hours=6"

# Get best arrival time for your train
curl -X POST https://api.eurostar-tools.com/api/v1/queue/st-pancras/best-arrival \
  -H "Content-Type: application/json" \
  -d '{
    "departureTime": "2024-01-01T16:00:00.000Z",
    "maxWaitMinutes": 30
  }'
```

---

## SDKs and Client Libraries

Official client libraries are planned for:

- **JavaScript/TypeScript**: `@eurostar-tools/client`
- **Python**: `eurostar-tools`

Check the [GitHub repository](https://github.com/eurostar-tools) for updates.

---

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Authentication endpoints
- Booking management
- Claim tracking
- Seat recommendations
- Queue predictions
