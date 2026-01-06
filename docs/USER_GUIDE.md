# Eurostar Tools User Guide

This guide covers how to use the Eurostar Tools suite for tracking delays, claiming compensation, viewing seat maps, and predicting queue times.

## Getting Started

### Creating an Account

1. Navigate to the application at your deployed URL
2. Click **Sign Up** and enter your email address
3. Verify your email by clicking the link sent to your inbox
4. Complete your profile with your name and preferences

### Dashboard Overview

After logging in, you'll see your dashboard with:

- **Active Bookings**: Your upcoming Eurostar journeys
- **Delay Alerts**: Real-time status of monitored trains
- **Recent Claims**: Status of compensation claims
- **Quick Actions**: Add booking, check delays, view seat map

## Adding Bookings

### From Confirmation Email

1. Forward your Eurostar booking confirmation email to your registered address
2. The system automatically extracts:
   - PNR (6-character booking reference)
   - TCN (ticket control number)
   - Train number and date
   - Departure and arrival stations
3. You'll receive a notification once the booking is added

### Manual Entry

1. Click **Add Booking** on your dashboard
2. Enter the required information:
   - **PNR**: Your 6-character booking reference (e.g., `ABC123`)
   - **TCN**: Your ticket control number starting with `IV` or `15`
   - **Train Number**: 4-digit train number (e.g., `9012`)
   - **Journey Date**: Date of travel
   - **Route**: Select departure and arrival stations
3. Click **Save Booking**

### Booking Details

Each booking shows:

- Journey route and scheduled times
- Current train status (on-time, delayed, cancelled)
- Eligibility for delay compensation
- Link to seat map for your train

## Tracking Delays

### Automatic Monitoring

Once a booking is added, the system automatically:

- Polls real-time train data every 30 seconds
- Compares actual times against scheduled times
- Calculates total delay at final destination
- Sends notifications when thresholds are crossed

### Delay Notifications

Configure your notification preferences in **Settings > Notifications**:

- **Email**: Receive delay alerts via email
- **Push**: Browser push notifications (if enabled)
- **Thresholds**: Set minimum delay (e.g., 15 min, 30 min, 60 min)

### Understanding Delay Status

| Status | Meaning |
|--------|---------|
| On Time | Train running within 5 minutes of schedule |
| Minor Delay | 5-29 minutes behind schedule |
| Significant Delay | 30-59 minutes behind schedule |
| Major Delay | 60+ minutes behind schedule |
| Cancelled | Train service cancelled |

## Submitting Claims

### Compensation Eligibility

Eurostar's compensation policy:

| Delay at Destination | Compensation |
|---------------------|--------------|
| 60-119 minutes | 25% of ticket price |
| 120+ minutes | 50% of ticket price |
| Cancelled (no alternative) | Full refund |

### Generating a Claim

1. Navigate to a booking with an eligible delay
2. Click **Generate Claim**
3. Review the pre-filled claim form:
   - Your contact details
   - Journey information
   - Delay evidence (timestamps from GTFS data)
   - Compensation amount calculation
4. Download the completed PDF form

### Submitting to Eurostar

The system generates your claim but does not submit automatically. To complete your claim:

1. Download the generated PDF
2. Visit [eurostar.com/contact](https://www.eurostar.com/contact)
3. Select **Delay Compensation**
4. Upload your claim form and any additional documents
5. Submit and note your reference number

### Tracking Claim Status

Update your claim status manually in the app:

- **Draft**: Claim generated but not submitted
- **Submitted**: Sent to Eurostar
- **Under Review**: Eurostar processing
- **Approved**: Compensation confirmed
- **Paid**: Payment received
- **Rejected**: Claim denied (add notes for reason)

## Using Seat Map

### Viewing Train Layout

1. Click **Seat Map** from your booking or the main menu
2. Select train type:
   - **e300**: Classic Eurostar trains
   - **e320**: Newer Siemens Velaro trains
3. Browse carriages using the navigation

### Seat Information

Each seat shows:

- **Seat number** and **class** (Standard/Standard Premier/Business Premier)
- **Direction**: Forward or backward facing
- **Table**: With table, airline-style, or solo
- **Power**: Location of power outlets
- **Window**: Window or aisle position

### Finding the Best Seats

Filter seats by your preferences:

- Quiet coach (no phone calls)
- Family coach (with play area nearby)
- Near luggage racks
- Near toilets
- Wheelchair accessible

### Seat Recommendations

The system recommends seats based on:

- Your stated preferences
- Historical occupancy data
- Train configuration

## Using Queue Predictions

### Station Queue Times

View predicted queue times at:

- London St Pancras
- Paris Gare du Nord
- Brussels-Midi
- Amsterdam Centraal

### Understanding Predictions

Queue predictions show estimated wait times for:

- **Check-in**: Ticket verification
- **Security**: Bag scanning and screening
- **Border Control**: UK/Schengen passport checks

### Factors Affecting Queues

Predictions account for:

- Day of week and time of day
- Seasonal patterns (holidays, school breaks)
- Special events
- Historical data trends

### Planning Your Arrival

Recommended arrival times:

| Class | Minimum Before Departure |
|-------|-------------------------|
| Standard | 60 minutes |
| Standard Premier | 45 minutes |
| Business Premier | 30 minutes |

The queue predictor helps you decide when to arrive based on current conditions.

## Settings and Preferences

### Profile Settings

- Update contact information
- Set timezone for notifications
- Configure preferred language

### Notification Preferences

- Email notification frequency
- Push notification settings
- Delay threshold alerts

### Data and Privacy

- Download your data
- Delete booking history
- Close account

## Troubleshooting

### Booking Not Recognized

If your forwarded email isn't parsed:

1. Ensure it's the original Eurostar confirmation (not a forward chain)
2. Check the email is from `@eurostar.com`
3. Try manual entry with your booking details

### Delay Not Showing

Real-time data updates every 30 seconds. If delays aren't appearing:

1. Verify the journey date is today or in the near future
2. Check the train number is correct
3. GTFS feeds may have temporary outages; data will sync when available

### Claim Generation Failed

If you can't generate a claim:

1. Ensure the journey has completed
2. Verify the delay meets the minimum threshold (60 minutes)
3. Check all booking details are complete

## Support

For technical issues with the application:

- Check the [FAQ](/faq)
- Contact support at your-support-email

For Eurostar service issues:

- Visit [eurostar.com/contact](https://www.eurostar.com/contact)
- Call Eurostar customer service
