import { describe, it, expect, beforeEach } from 'vitest';
import { MockEmailService } from '../../email/mock.service.js';
import { NotificationEmailService } from '../../email/email.service.js';
import type {
  DelayDetectedData,
  ClaimEligibleData,
  WeeklySummaryData,
} from '../../email/templates.js';

/**
 * Integration tests for email service functionality using mock mode.
 * These tests verify the email service behavior without sending real emails.
 *
 * Run with: INTEGRATION_TESTS=true pnpm test
 */

const SKIP_INTEGRATION = process.env['INTEGRATION_TESTS'] !== 'true';

describe.skipIf(SKIP_INTEGRATION)('Email Service Integration', () => {
  let mockEmailService: MockEmailService;
  let notificationService: NotificationEmailService;

  beforeEach(() => {
    mockEmailService = new MockEmailService();
    notificationService = new NotificationEmailService(mockEmailService);
  });

  describe('MockEmailService', () => {
    it('should send an email and track it', async () => {
      const result = await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toMatch(/^mock_\d+$/);
      }

      const sentEmails = mockEmailService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0]?.to).toBe('test@example.com');
      expect(sentEmails[0]?.subject).toBe('Test Subject');
    });

    it('should assign unique IDs to each email', async () => {
      await mockEmailService.sendEmail({
        to: 'test1@example.com',
        subject: 'Subject 1',
        html: '<p>Email 1</p>',
      });

      await mockEmailService.sendEmail({
        to: 'test2@example.com',
        subject: 'Subject 2',
        html: '<p>Email 2</p>',
      });

      const sentEmails = mockEmailService.getSentEmails();
      expect(sentEmails).toHaveLength(2);
      expect(sentEmails[0]?.id).toBe('mock_1');
      expect(sentEmails[1]?.id).toBe('mock_2');
    });

    it('should track sentAt timestamp', async () => {
      const before = new Date();

      await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const after = new Date();
      const lastEmail = mockEmailService.getLastEmail();

      expect(lastEmail).toBeDefined();
      expect(lastEmail!.sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastEmail!.sentAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should find emails by recipient', async () => {
      await mockEmailService.sendEmail({
        to: 'alice@example.com',
        subject: 'To Alice',
        html: '<p>Hello Alice</p>',
      });

      await mockEmailService.sendEmail({
        to: 'bob@example.com',
        subject: 'To Bob',
        html: '<p>Hello Bob</p>',
      });

      await mockEmailService.sendEmail({
        to: 'alice@example.com',
        subject: 'Another to Alice',
        html: '<p>Hello again Alice</p>',
      });

      const aliceEmails = mockEmailService.findEmailsByRecipient('alice@example.com');
      expect(aliceEmails).toHaveLength(2);

      const bobEmails = mockEmailService.findEmailsByRecipient('bob@example.com');
      expect(bobEmails).toHaveLength(1);
    });

    it('should find emails by recipient with EmailAddress object', async () => {
      await mockEmailService.sendEmail({
        to: { email: 'user@example.com', name: 'Test User' },
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const emails = mockEmailService.findEmailsByRecipient('user@example.com');
      expect(emails).toHaveLength(1);
    });

    it('should find emails by subject', async () => {
      await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Delay Detected: Train 9007',
        html: '<p>Test</p>',
      });

      await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Weekly Summary',
        html: '<p>Test</p>',
      });

      const delayEmails = mockEmailService.findEmailsBySubject('delay');
      expect(delayEmails).toHaveLength(1);

      const summaryEmails = mockEmailService.findEmailsBySubject('summary');
      expect(summaryEmails).toHaveLength(1);
    });

    it('should clear all sent emails', async () => {
      await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test 1',
        html: '<p>Test</p>',
      });

      await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test 2',
        html: '<p>Test</p>',
      });

      expect(mockEmailService.getSentEmails()).toHaveLength(2);

      mockEmailService.clear();

      expect(mockEmailService.getSentEmails()).toHaveLength(0);
      expect(mockEmailService.getLastEmail()).toBeUndefined();
    });

    it('should reset ID counter on clear', async () => {
      await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      mockEmailService.clear();

      await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const lastEmail = mockEmailService.getLastEmail();
      expect(lastEmail?.id).toBe('mock_1');
    });

    it('should handle multiple recipients', async () => {
      await mockEmailService.sendEmail({
        to: ['alice@example.com', 'bob@example.com'],
        subject: 'Group Email',
        html: '<p>Hello all</p>',
      });

      const aliceEmails = mockEmailService.findEmailsByRecipient('alice@example.com');
      const bobEmails = mockEmailService.findEmailsByRecipient('bob@example.com');

      expect(aliceEmails).toHaveLength(1);
      expect(bobEmails).toHaveLength(1);
    });

    it('should preserve email tags', async () => {
      await mockEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Tagged Email',
        html: '<p>Test</p>',
        tags: [
          { name: 'type', value: 'notification' },
          { name: 'train', value: '9007' },
        ],
      });

      const lastEmail = mockEmailService.getLastEmail();
      expect(lastEmail?.tags).toHaveLength(2);
      expect(lastEmail?.tags).toContainEqual({ name: 'type', value: 'notification' });
      expect(lastEmail?.tags).toContainEqual({ name: 'train', value: '9007' });
    });
  });

  describe('NotificationEmailService', () => {
    describe('sendDelayDetected', () => {
      it('should send delay detected notification', async () => {
        const data: DelayDetectedData = {
          passengerName: 'John Doe',
          trainNumber: '9007',
          journeyDate: '2024-06-15',
          departureStation: 'London St Pancras',
          arrivalStation: 'Paris Gare du Nord',
          scheduledDeparture: '08:30',
          actualDeparture: '09:15',
          delayMinutes: 45,
        };

        const result = await notificationService.sendDelayDetected(
          'john@example.com',
          data
        );

        expect(result.isOk()).toBe(true);

        const lastEmail = mockEmailService.getLastEmail();
        expect(lastEmail).toBeDefined();
        expect(lastEmail?.to).toBe('john@example.com');
        expect(lastEmail?.subject).toContain('Delay Detected');
        expect(lastEmail?.subject).toContain('9007');
        expect(lastEmail?.subject).toContain('2024-06-15');
        expect(lastEmail?.html).toContain('John Doe');
        expect(lastEmail?.html).toContain('45');
        expect(lastEmail?.tags).toContainEqual({ name: 'type', value: 'delay_detected' });
        expect(lastEmail?.tags).toContainEqual({ name: 'train', value: '9007' });
      });
    });

    describe('sendClaimEligible', () => {
      it('should send claim eligible notification', async () => {
        const data: ClaimEligibleData = {
          passengerName: 'Jane Smith',
          trainNumber: '9012',
          journeyDate: '2024-06-15',
          departureStation: 'Paris Gare du Nord',
          arrivalStation: 'London St Pancras',
          delayMinutes: 120,
          compensationAmount: '€125',
          compensationPercentage: 50,
          claimDeadline: '2024-09-15',
          claimUrl: 'https://example.com/claim/123',
        };

        const result = await notificationService.sendClaimEligible(
          'jane@example.com',
          data
        );

        expect(result.isOk()).toBe(true);

        const lastEmail = mockEmailService.getLastEmail();
        expect(lastEmail).toBeDefined();
        expect(lastEmail?.to).toBe('jane@example.com');
        expect(lastEmail?.subject).toContain('Claim');
        expect(lastEmail?.subject).toContain('€125');
        expect(lastEmail?.subject).toContain('9012');
        expect(lastEmail?.html).toContain('Jane Smith');
        expect(lastEmail?.html).toContain('120');
        expect(lastEmail?.html).toContain('€125');
        expect(lastEmail?.tags).toContainEqual({ name: 'type', value: 'claim_eligible' });
      });
    });

    describe('sendWeeklySummary', () => {
      it('should send weekly summary notification', async () => {
        const data: WeeklySummaryData = {
          userName: 'Bob Wilson',
          weekStartDate: '2024-06-10',
          weekEndDate: '2024-06-16',
          totalTrips: 3,
          delayedTrips: 1,
          totalDelayMinutes: 75,
          pendingClaims: 1,
          pendingClaimValue: '€62.50',
          submittedClaims: 0,
          approvedClaims: 0,
          approvedClaimValue: '€0',
          upcomingTrips: [],
        };

        const result = await notificationService.sendWeeklySummary(
          'bob@example.com',
          data
        );

        expect(result.isOk()).toBe(true);

        const lastEmail = mockEmailService.getLastEmail();
        expect(lastEmail).toBeDefined();
        expect(lastEmail?.to).toBe('bob@example.com');
        expect(lastEmail?.subject).toContain('Weekly Summary');
        expect(lastEmail?.subject).toContain('2024-06-10');
        expect(lastEmail?.subject).toContain('2024-06-16');
        expect(lastEmail?.html).toContain('Bob Wilson');
        expect(lastEmail?.html).toContain('3'); // totalTrips
        expect(lastEmail?.html).toContain('75'); // totalDelayMinutes
        expect(lastEmail?.tags).toContainEqual({ name: 'type', value: 'weekly_summary' });
      });

      it('should render upcoming trips when provided', async () => {
        const data: WeeklySummaryData = {
          userName: 'Alice Brown',
          weekStartDate: '2024-06-17',
          weekEndDate: '2024-06-23',
          totalTrips: 2,
          delayedTrips: 0,
          totalDelayMinutes: 0,
          pendingClaims: 0,
          pendingClaimValue: '€0',
          submittedClaims: 1,
          approvedClaims: 1,
          approvedClaimValue: '€50',
          upcomingTrips: [
            { trainNumber: '9001', date: '2024-06-25', route: 'London → Paris' },
            { trainNumber: '9010', date: '2024-06-28', route: 'Paris → London' },
          ],
        };

        const result = await notificationService.sendWeeklySummary(
          'alice@example.com',
          data
        );

        expect(result.isOk()).toBe(true);

        const lastEmail = mockEmailService.getLastEmail();
        expect(lastEmail?.html).toContain('9001');
        expect(lastEmail?.html).toContain('9010');
        expect(lastEmail?.html).toContain('2024-06-25');
        expect(lastEmail?.html).toContain('London → Paris');
      });
    });

    describe('Email Content Rendering', () => {
      it('should include both HTML and text versions', async () => {
        const data: DelayDetectedData = {
          passengerName: 'Test User',
          trainNumber: '9001',
          journeyDate: '2024-06-15',
          departureStation: 'London',
          arrivalStation: 'Paris',
          scheduledDeparture: '10:00',
          actualDeparture: '10:30',
          delayMinutes: 30,
        };

        await notificationService.sendDelayDetected('test@example.com', data);

        const lastEmail = mockEmailService.getLastEmail();
        expect(lastEmail?.html).toBeDefined();
        expect(lastEmail?.text).toBeDefined();
        expect(lastEmail?.html).not.toBe(lastEmail?.text);
      });

      it('should include all relevant data in email body', async () => {
        const data: ClaimEligibleData = {
          passengerName: 'Full Data Test',
          trainNumber: '9999',
          journeyDate: '2024-12-31',
          departureStation: 'Brussels-Midi',
          arrivalStation: 'Amsterdam Centraal',
          delayMinutes: 180,
          compensationAmount: '€250',
          compensationPercentage: 50,
          claimDeadline: '2025-03-31',
          claimUrl: 'https://example.com/claim/456',
        };

        await notificationService.sendClaimEligible('test@example.com', data);

        const lastEmail = mockEmailService.getLastEmail();
        const html = lastEmail?.html ?? '';

        expect(html).toContain('Full Data Test');
        expect(html).toContain('9999');
        expect(html).toContain('Brussels-Midi');
        expect(html).toContain('Amsterdam Centraal');
        expect(html).toContain('180');
        expect(html).toContain('€250');
        expect(html).toContain('2025-03-31');
      });
    });
  });

  describe('Email Service Factory Pattern', () => {
    it('should work with different email service implementations', async () => {
      // Create a second mock service instance
      const anotherMockService = new MockEmailService();
      const anotherNotificationService = new NotificationEmailService(anotherMockService);

      // Send email through first service
      await notificationService.sendDelayDetected('first@example.com', {
        passengerName: 'First',
        trainNumber: '1111',
        journeyDate: '2024-01-01',
        departureStation: 'A',
        arrivalStation: 'B',
        scheduledDeparture: '09:00',
        actualDeparture: '09:10',
        delayMinutes: 10,
      });

      // Send email through second service
      await anotherNotificationService.sendDelayDetected('second@example.com', {
        passengerName: 'Second',
        trainNumber: '2222',
        journeyDate: '2024-02-02',
        departureStation: 'C',
        arrivalStation: 'D',
        scheduledDeparture: '14:00',
        actualDeparture: '14:20',
        delayMinutes: 20,
      });

      // Verify emails are isolated to their respective services
      expect(mockEmailService.getSentEmails()).toHaveLength(1);
      expect(mockEmailService.getLastEmail()?.to).toBe('first@example.com');

      expect(anotherMockService.getSentEmails()).toHaveLength(1);
      expect(anotherMockService.getLastEmail()?.to).toBe('second@example.com');
    });
  });
});
