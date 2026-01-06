import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotificationType,
  NotificationStatus,
} from '../types.js';
import {
  MockEmailService,
  renderNotificationEmail,
  createEmailService,
} from '../email-service.js';
import {
  NotificationService,
  createNotificationService,
} from '../service.js';
import {
  CLAIM_ELIGIBLE_PAYLOAD,
  DEADLINE_WARNING_PAYLOAD,
  CLAIM_REMINDER_PAYLOAD,
  CLAIM_ELIGIBLE_PAYLOAD_GBP,
  TEST_NOTIFICATION_DATA,
  createClaimEligiblePayload,
  createTestNotificationData,
} from './fixtures.js';

describe('NotificationType', () => {
  // Test 1: NotificationType enum values
  it('has correct notification type values', () => {
    expect(NotificationType.CLAIM_ELIGIBLE).toBe('claim_eligible');
    expect(NotificationType.CLAIM_REMINDER).toBe('claim_reminder');
    expect(NotificationType.DEADLINE_WARNING).toBe('deadline_warning');
  });
});

describe('NotificationStatus', () => {
  // Test 2: NotificationStatus enum values
  it('has correct status values', () => {
    expect(NotificationStatus.PENDING).toBe('pending');
    expect(NotificationStatus.SENT).toBe('sent');
    expect(NotificationStatus.FAILED).toBe('failed');
  });
});

describe('MockEmailService', () => {
  let mockService: MockEmailService;

  beforeEach(() => {
    mockService = new MockEmailService();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 3: MockEmailService sends email successfully
  it('sends email and returns success result', async () => {
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test content</p>',
    };

    const result = await mockService.send(email);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toMatch(/^mock-/);
  });

  // Test 4: MockEmailService tracks sent emails
  it('tracks sent emails in history', async () => {
    const email1 = { to: 'a@example.com', subject: 'Email 1', html: '<p>1</p>' };
    const email2 = { to: 'b@example.com', subject: 'Email 2', html: '<p>2</p>' };

    await mockService.send(email1);
    await mockService.send(email2);

    const sentEmails = mockService.getSentEmails();
    expect(sentEmails).toHaveLength(2);
    expect(sentEmails[0]?.email.to).toBe('a@example.com');
    expect(sentEmails[1]?.email.to).toBe('b@example.com');
  });

  // Test 5: MockEmailService getLastEmail
  it('returns the last sent email', async () => {
    await mockService.send({ to: 'first@example.com', subject: 'First', html: '' });
    await mockService.send({ to: 'last@example.com', subject: 'Last', html: '' });

    const lastEmail = mockService.getLastEmail();
    expect(lastEmail?.email.to).toBe('last@example.com');
    expect(lastEmail?.email.subject).toBe('Last');
  });

  // Test 6: MockEmailService clearHistory
  it('clears email history', async () => {
    await mockService.send({ to: 'test@example.com', subject: 'Test', html: '' });
    expect(mockService.getSentEmails()).toHaveLength(1);

    mockService.clearHistory();
    expect(mockService.getSentEmails()).toHaveLength(0);
  });
});

describe('renderNotificationEmail', () => {
  // Test 7: Renders claim eligible email
  it('renders claim eligible email with correct subject', async () => {
    const { subject, html } = await renderNotificationEmail(CLAIM_ELIGIBLE_PAYLOAD);

    expect(subject).toContain('€45.00');
    expect(subject).toContain('compensation');
    expect(html).toContain('John');
    expect(html).toContain('9007');
    expect(html).toContain('London St Pancras');
    expect(html).toContain('Paris Gare du Nord');
  });

  // Test 8: Renders deadline warning email
  it('renders deadline warning email with correct subject', async () => {
    const { subject, html } = await renderNotificationEmail(DEADLINE_WARNING_PAYLOAD);

    expect(subject).toContain('7 days');
    expect(subject).toContain('€45.00');
    expect(html).toContain('deadline');
    expect(html).toContain('7');
  });

  // Test 9: Renders claim reminder email
  it('renders claim reminder email', async () => {
    const { subject, html } = await renderNotificationEmail(CLAIM_REMINDER_PAYLOAD);

    expect(subject).toContain('Reminder');
    expect(subject).toContain('€45.00');
    expect(html).toBeDefined();
  });

  // Test 10: Formats GBP currency correctly
  it('formats GBP currency correctly in email', async () => {
    const { subject, html } = await renderNotificationEmail(CLAIM_ELIGIBLE_PAYLOAD_GBP);

    expect(subject).toContain('£38.25');
    expect(html).toContain('£38.25');
    expect(html).toContain('£57.38');
  });

  // Test 11: Formats delay time correctly
  it('formats delay time correctly (hours and minutes)', async () => {
    const payload = createClaimEligiblePayload({ delayMinutes: 125 });
    const { html } = await renderNotificationEmail(payload);

    expect(html).toContain('2h 5m');
  });

  // Test 12: Formats delay time for exact hours
  it('formats delay time correctly (exact hours)', async () => {
    const payload = createClaimEligiblePayload({ delayMinutes: 120 });
    const { html } = await renderNotificationEmail(payload);

    expect(html).toContain('2h');
  });
});

describe('MockEmailService sendNotification', () => {
  let mockService: MockEmailService;

  beforeEach(() => {
    mockService = new MockEmailService();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 13: Sends notification using template
  it('sends notification email using template', async () => {
    const result = await mockService.sendNotification(CLAIM_ELIGIBLE_PAYLOAD);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();

    const lastEmail = mockService.getLastEmail();
    expect(lastEmail?.email.to).toBe(CLAIM_ELIGIBLE_PAYLOAD.email);
    expect(lastEmail?.email.subject).toContain('compensation');
    expect(lastEmail?.email.html).toContain('John');
  });
});

describe('createEmailService', () => {
  beforeEach(() => {
    // Clear any env vars
    delete process.env['RESEND_API_KEY'];
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 14: Creates MockEmailService when no API key
  it('creates MockEmailService when RESEND_API_KEY is not set', () => {
    const service = createEmailService();
    expect(service).toBeInstanceOf(MockEmailService);
  });
});

describe('NotificationService', () => {
  let service: NotificationService;
  let mockEmailService: MockEmailService;

  beforeEach(() => {
    mockEmailService = new MockEmailService();
    service = new NotificationService({
      emailService: mockEmailService,
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 15: Sends claim eligible notification immediately
  it('sends claim eligible notification in immediate mode', async () => {
    const result = await service.sendClaimEligibleNotification(
      TEST_NOTIFICATION_DATA,
      { immediate: true }
    );

    expect(result.success).toBe(true);
    expect(result.type).toBe(NotificationType.CLAIM_ELIGIBLE);
    expect(result.email).toBe(TEST_NOTIFICATION_DATA.user.email);
    expect(result.messageId).toBeDefined();

    const lastEmail = mockEmailService.getLastEmail();
    expect(lastEmail?.email.subject).toContain('compensation');
  });

  // Test 16: Sends deadline warning notification
  it('sends deadline warning notification', async () => {
    // Use a journey date in the near future to have valid days remaining
    const futureJourneyDate = new Date();
    futureJourneyDate.setMonth(futureJourneyDate.getMonth() - 2);
    futureJourneyDate.setDate(futureJourneyDate.getDate() + 20); // About 20 days until deadline

    const data = createTestNotificationData({
      booking: { ...TEST_NOTIFICATION_DATA.booking, journeyDate: futureJourneyDate },
    });

    const result = await service.sendDeadlineWarning(data, { immediate: true });

    expect(result.success).toBe(true);
    expect(result.type).toBe(NotificationType.DEADLINE_WARNING);
  });

  // Test 17: Fails deadline warning when deadline passed
  it('fails deadline warning when deadline has passed', async () => {
    // Use a journey date from 4 months ago (past deadline)
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 4);

    const data = createTestNotificationData({
      booking: { ...TEST_NOTIFICATION_DATA.booking, journeyDate: pastDate },
    });

    const result = await service.sendDeadlineWarning(data, { immediate: true });

    expect(result.success).toBe(false);
    expect(result.error).toContain('deadline has already passed');
  });

  // Test 18: Falls back to immediate when queue not initialized
  it('falls back to immediate send when queue not initialized', async () => {
    const result = await service.sendClaimEligibleNotification(TEST_NOTIFICATION_DATA);

    expect(result.success).toBe(true);
    expect(mockEmailService.getSentEmails()).toHaveLength(1);
  });
});

describe('createNotificationService', () => {
  // Test 19: Creates service with default options
  it('creates notification service with defaults', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const service = createNotificationService();
    expect(service).toBeInstanceOf(NotificationService);

    vi.restoreAllMocks();
  });

  // Test 20: Creates service with custom email service
  it('creates notification service with custom email service', () => {
    const mockEmailService = new MockEmailService();
    const service = createNotificationService({
      emailService: mockEmailService,
    });

    expect(service).toBeInstanceOf(NotificationService);
    expect(service.getQueue()).toBeNull(); // Queue not initialized
  });
});

describe('Notification payloads', () => {
  // Test 21: ClaimEligiblePayload has all required fields
  it('claim eligible payload contains all required fields', () => {
    const payload = CLAIM_ELIGIBLE_PAYLOAD;

    expect(payload.type).toBe(NotificationType.CLAIM_ELIGIBLE);
    expect(payload.userId).toBeDefined();
    expect(payload.email).toBeDefined();
    expect(payload.firstName).toBeDefined();
    expect(payload.claimId).toBeDefined();
    expect(payload.trainNumber).toBeDefined();
    expect(payload.origin).toBeDefined();
    expect(payload.destination).toBeDefined();
    expect(payload.journeyDate).toBeDefined();
    expect(payload.delayMinutes).toBeDefined();
    expect(payload.cashAmount).toBeDefined();
    expect(payload.voucherAmount).toBeDefined();
    expect(payload.currency).toBeDefined();
    expect(payload.claimUrl).toBeDefined();
    expect(payload.deadline).toBeDefined();
  });

  // Test 22: DeadlineWarningPayload has all required fields
  it('deadline warning payload contains all required fields', () => {
    const payload = DEADLINE_WARNING_PAYLOAD;

    expect(payload.type).toBe(NotificationType.DEADLINE_WARNING);
    expect(payload.userId).toBeDefined();
    expect(payload.email).toBeDefined();
    expect(payload.firstName).toBeDefined();
    expect(payload.claimId).toBeDefined();
    expect(payload.trainNumber).toBeDefined();
    expect(payload.daysRemaining).toBeDefined();
    expect(payload.daysRemaining).toBe(7);
  });
});

describe('Email template rendering', () => {
  // Test 23: Claim eligible email contains CTA button
  it('claim eligible email contains CTA button with claim URL', async () => {
    const { html } = await renderNotificationEmail(CLAIM_ELIGIBLE_PAYLOAD);

    expect(html).toContain('Claim Your Compensation');
    expect(html).toContain(CLAIM_ELIGIBLE_PAYLOAD.claimUrl);
  });

  // Test 24: Deadline warning email shows urgency
  it('deadline warning email shows urgency message', async () => {
    const { html } = await renderNotificationEmail(DEADLINE_WARNING_PAYLOAD);

    // React Email adds HTML comments around interpolated values
    expect(html).toContain('7 days');
    expect(html).toContain('remaining');
    expect(html).toContain('Claim Now Before');
  });

  // Test 25: Email contains journey details
  it('emails contain journey details', async () => {
    const { html } = await renderNotificationEmail(CLAIM_ELIGIBLE_PAYLOAD);

    expect(html).toContain('9007'); // Train number
    expect(html).toContain('London St Pancras');
    expect(html).toContain('Paris Gare du Nord');
    expect(html).toContain('5 January 2026');
  });
});
