/**
 * Test fixtures for email parser tests.
 *
 * TODO: These are realistic mock emails based on typical confirmation patterns.
 * They need to be validated against real Eurostar booking confirmation emails
 * to ensure the parser works correctly in production.
 */

/**
 * Standard plain text booking confirmation email.
 */
export const VALID_PLAIN_TEXT_EMAIL = `
Your Eurostar booking confirmation

Thank you for booking with Eurostar!

Booking Reference: ABC123
Ticket Number: IV123456789

OUTBOUND JOURNEY
----------------
Train: Eurostar 9007
Date: 05 January 2026
Departs: London St Pancras 08:01
Arrives: Paris Gare du Nord 11:17

Passenger: Mr John Smith
Coach: 3
Seat: 61

Please arrive at the station at least 90 minutes before departure.

Best regards,
Eurostar Team
`;

/**
 * HTML format booking confirmation email.
 */
export const VALID_HTML_EMAIL = `
<!DOCTYPE html>
<html>
<head><title>Your Eurostar Booking</title></head>
<body>
<div style="font-family: Arial, sans-serif;">
  <h1>Your Eurostar booking confirmation</h1>
  <p>Thank you for booking with Eurostar!</p>

  <table>
    <tr><td><strong>Booking Reference:</strong></td><td>XYZ789</td></tr>
    <tr><td><strong>Ticket Number:</strong></td><td>15987654321</td></tr>
  </table>

  <h2>OUTBOUND JOURNEY</h2>
  <p>Train: Eurostar 9015</p>
  <p>Date: 15 March 2026</p>
  <p>Departs: Brussels Midi 14:52</p>
  <p>Arrives: London St Pancras 16:57</p>

  <p>Passenger: Mrs Jane Doe</p>
  <p>Coach: 7</p>
  <p>Seat: 42</p>
</div>
</body>
</html>
`;

/**
 * Forwarded email with quote markers.
 */
export const FORWARDED_EMAIL = `
---------- Forwarded message ---------
From: Eurostar <noreply@eurostar.com>
Date: Mon, Jan 5, 2026 at 10:00 AM
Subject: Your Eurostar booking confirmation - DEF456
To: traveler@example.com

> Your Eurostar booking confirmation
>
> Thank you for booking with Eurostar!
>
> Booking Reference: DEF456
> Ticket Number: IV999888777
>
> OUTBOUND JOURNEY
> ----------------
> Train: Eurostar 9023
> Date: 20 February 2026
> Departs: Amsterdam Centraal 07:17
> Arrives: London St Pancras 10:57
>
> Passenger: Dr Emma Watson
> Coach: 12
> Seat: 85
`;

/**
 * Email with ISO date format.
 */
export const ISO_DATE_EMAIL = `
Eurostar Booking Confirmation

Booking Reference: GHI321
Ticket Number: IV111222333

Journey Details:
Train: Eurostar 9031
Date: 2026-04-10
Departs: Paris Gare du Nord 18:43
Arrives: London St Pancras 19:57

Passenger: Ms Sarah Connor
Coach: 5
Seat: 33
`;

/**
 * Email with slash date format (DD/MM/YYYY).
 */
export const SLASH_DATE_EMAIL = `
Your Eurostar Trip

Booking Reference: JKL654
Ticket Number: 15444555666

Train: Eurostar 9045
Date: 25/12/2025
Departs: Rotterdam 09:32
Arrives: London St Pancras 12:03

Passenger: Mr Tom Hanks
Coach: 2
Seat: 17
`;

/**
 * Email with ordinal date format (5th January 2026).
 */
export const ORDINAL_DATE_EMAIL = `
Booking Confirmation - Eurostar

Collection Reference: MNO987
Ticket Number: IV777666555

Train: Eurostar 9052
Date: 5th January 2026
Departs: Lille 10:05
Arrives: London 10:41

Passenger: Miss Alice Brown
Coach: 9
Seat: 72
`;

/**
 * Email missing PNR.
 */
export const MISSING_PNR_EMAIL = `
Your Eurostar booking

Ticket Number: IV123456789

Train: Eurostar 9007
Date: 05 January 2026
Departs: London St Pancras 08:01
Arrives: Paris Gare du Nord 11:17

Passenger: Mr John Smith
`;

/**
 * Email missing TCN.
 */
export const MISSING_TCN_EMAIL = `
Your Eurostar booking

Booking Reference: ABC123

Train: Eurostar 9007
Date: 05 January 2026
Departs: London St Pancras 08:01
Arrives: Paris Gare du Nord 11:17

Passenger: Mr John Smith
`;

/**
 * Email missing train number.
 */
export const MISSING_TRAIN_EMAIL = `
Your Eurostar booking

Booking Reference: ABC123
Ticket Number: IV123456789

Date: 05 January 2026
Departs: London St Pancras 08:01
Arrives: Paris Gare du Nord 11:17

Passenger: Mr John Smith
`;

/**
 * Email missing date.
 */
export const MISSING_DATE_EMAIL = `
Your Eurostar booking

Booking Reference: ABC123
Ticket Number: IV123456789

Train: Eurostar 9007
Departs: London St Pancras 08:01
Arrives: Paris Gare du Nord 11:17

Passenger: Mr John Smith
`;

/**
 * Email missing passenger name.
 */
export const MISSING_PASSENGER_EMAIL = `
Your Eurostar booking

Booking Reference: ABC123
Ticket Number: IV123456789

Train: Eurostar 9007
Date: 05 January 2026
Departs: London 08:01
Arrives: Paris 11:17
`;

/**
 * Email without coach/seat (optional fields).
 */
export const NO_SEAT_INFO_EMAIL = `
Your Eurostar booking

Booking Reference: QRS246
Ticket Number: IV555444333

Train: Eurostar 9060
Date: 30 June 2026
Departs: London 12:30
Arrives: Brussels 15:57

Passenger: Prof Richard Feynman
`;

/**
 * Email with minimal formatting.
 */
export const MINIMAL_EMAIL = `
Booking Reference: TUV135 Ticket Number: IV222333444 Train: Eurostar 9070 Date: 15 August 2026 Departs: London St Pancras 06:00 Arrives: Paris Gare du Nord 09:17 Passenger: Mr Alan Turing Coach: 1 Seat: 55
`;

/**
 * Email with US date format (Month Day, Year).
 */
export const US_DATE_EMAIL = `
Eurostar Booking

Booking Reference: WXY864
Ticket Number: 15333222111

Train: Eurostar 9080
Date: September 15, 2026
Departs: London St Pancras 16:00
Arrives: Amsterdam 21:03

Passenger: Mrs Ada Lovelace
Coach: 14
Seat: 28
`;

/**
 * Complex HTML email with nested elements and styles.
 */
export const COMPLEX_HTML_EMAIL = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial; }
  .header { background: #003B5C; color: white; }
  .content { padding: 20px; }
</style>
</head>
<body>
<div class="header">
  <img src="eurostar-logo.png" alt="Eurostar">
</div>
<div class="content">
  <script>console.log("tracking");</script>
  <h1>Booking Confirmed!</h1>
  <div class="booking-ref">
    <span class="label">Booking Reference:</span>
    <span class="value">ZZZ999</span>
  </div>
  <p>Ticket Number: <strong>IV888999000</strong></p>
  <table class="journey">
    <tr><th colspan="2">Journey Details</th></tr>
    <tr><td>Train</td><td>Eurostar 9099</td></tr>
    <tr><td>Date</td><td>01 November 2026</td></tr>
    <tr><td>Departs</td><td>Paris Gare du Nord 07:00</td></tr>
    <tr><td>Arrives</td><td>London St Pancras 08:05</td></tr>
    <tr><td>Passenger</td><td>Dr Grace Hopper</td></tr>
    <tr><td>Coach</td><td>16</td></tr>
    <tr><td>Seat</td><td>99</td></tr>
  </table>
</div>
</body>
</html>
`;

/**
 * Empty email body.
 */
export const EMPTY_EMAIL = '';

/**
 * Whitespace-only email.
 */
export const WHITESPACE_EMAIL = '   \n\n   \t   ';
