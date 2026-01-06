import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ClaimEligibleEmailProps } from '../types.js';

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '600',
  color: '#1a1a1a',
  padding: '17px 0 0',
};

const paragraph = {
  margin: '0 0 15px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#3c4149',
};

const highlightBox = {
  backgroundColor: '#f0f7ff',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const amountText = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#0066cc',
  margin: '0 0 8px',
};

const labelText = {
  fontSize: '13px',
  color: '#666',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const detailsBox = {
  backgroundColor: '#fafafa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const detailLabel = {
  color: '#666',
  fontSize: '14px',
};

const detailValue = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '500',
};

const buttonPrimary = {
  backgroundColor: '#0066cc',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
};

const warningBox = {
  backgroundColor: '#fff8e6',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  borderLeft: '4px solid #f5a623',
};

const warningText = {
  margin: '0',
  fontSize: '14px',
  color: '#8a6914',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
};

export function ClaimEligibleEmail({
  firstName,
  trainNumber,
  origin,
  destination,
  journeyDate,
  delayMinutes,
  cashAmount,
  voucherAmount,
  currency,
  claimUrl,
  deadline,
}: ClaimEligibleEmailProps) {
  const formatCurrency = (amount: number) =>
    currency === 'GBP' ? `£${amount.toFixed(2)}` : `€${amount.toFixed(2)}`;

  const formatDelay = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  return (
    <Html>
      <Head />
      <Preview>
        You're eligible for {formatCurrency(cashAmount)} compensation from Eurostar
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            Good news, {firstName}!
          </Heading>

          <Text style={paragraph}>
            Your Eurostar journey was delayed by {formatDelay(delayMinutes)}, which
            means you're entitled to compensation under EU passenger rights regulations.
          </Text>

          <Section style={highlightBox}>
            <Text style={labelText}>You can claim up to</Text>
            <Text style={amountText}>{formatCurrency(cashAmount)} cash</Text>
            <Text style={{ ...paragraph, margin: '8px 0 0', fontSize: '14px' }}>
              or {formatCurrency(voucherAmount)} in Eurostar vouchers
            </Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={{ ...labelText, marginBottom: '16px' }}>Journey Details</Text>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ ...detailLabel, padding: '8px 0', borderBottom: '1px solid #eee' }}>Train</td>
                  <td style={{ ...detailValue, padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right' }}>{trainNumber}</td>
                </tr>
                <tr>
                  <td style={{ ...detailLabel, padding: '8px 0', borderBottom: '1px solid #eee' }}>Route</td>
                  <td style={{ ...detailValue, padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right' }}>{origin} → {destination}</td>
                </tr>
                <tr>
                  <td style={{ ...detailLabel, padding: '8px 0', borderBottom: '1px solid #eee' }}>Date</td>
                  <td style={{ ...detailValue, padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right' }}>{journeyDate}</td>
                </tr>
                <tr>
                  <td style={{ ...detailLabel, padding: '8px 0' }}>Delay</td>
                  <td style={{ ...detailValue, padding: '8px 0', textAlign: 'right', color: '#cc0000' }}>{formatDelay(delayMinutes)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Button style={buttonPrimary} href={claimUrl}>
            Claim Your Compensation
          </Button>

          <Text style={{ ...paragraph, marginTop: '16px', fontSize: '14px', color: '#666' }}>
            We've pre-filled the form with your journey details. Just review and submit!
          </Text>

          <Section style={warningBox}>
            <Text style={warningText}>
              <strong>Deadline: {deadline}</strong>
              <br />
              Claims must be submitted within 3 months of your journey date.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This email was sent by Eurostar Tools. You're receiving this because you
            added a booking for delay tracking. If you didn't request this, please
            ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ClaimEligibleEmail;
