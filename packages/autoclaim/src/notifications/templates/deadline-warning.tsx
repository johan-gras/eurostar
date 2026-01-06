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
import type { DeadlineWarningEmailProps } from '../types.js';

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

const urgentBox = {
  backgroundColor: '#fff0f0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  borderLeft: '4px solid #cc0000',
};

const urgentHeading = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#cc0000',
  margin: '0 0 8px',
};

const urgentText = {
  fontSize: '14px',
  color: '#8a1414',
  margin: '0',
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
  backgroundColor: '#cc0000',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
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

export function DeadlineWarningEmail({
  firstName,
  trainNumber,
  origin,
  destination,
  journeyDate,
  cashAmount,
  currency,
  claimUrl,
  deadline,
  daysRemaining,
}: DeadlineWarningEmailProps) {
  const formatCurrency = (amount: number) =>
    currency === 'GBP' ? `£${amount.toFixed(2)}` : `€${amount.toFixed(2)}`;

  const getDaysText = () => {
    if (daysRemaining === 1) return '1 day';
    return `${daysRemaining} days`;
  };

  return (
    <Html>
      <Head />
      <Preview>
        Only {getDaysText()} left to claim {formatCurrency(cashAmount)} compensation
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            {firstName}, your claim deadline is approaching
          </Heading>

          <Section style={urgentBox}>
            <Text style={urgentHeading}>
              Only {getDaysText()} remaining
            </Text>
            <Text style={urgentText}>
              Your compensation claim expires on {deadline}. Don't miss out on
              your {formatCurrency(cashAmount)}!
            </Text>
          </Section>

          <Text style={paragraph}>
            We noticed you haven't submitted your compensation claim yet for your
            delayed Eurostar journey. The deadline to claim is just {getDaysText()} away.
          </Text>

          <Section style={highlightBox}>
            <Text style={labelText}>Amount you can still claim</Text>
            <Text style={amountText}>{formatCurrency(cashAmount)}</Text>
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
                  <td style={{ ...detailLabel, padding: '8px 0' }}>Deadline</td>
                  <td style={{ ...detailValue, padding: '8px 0', textAlign: 'right', color: '#cc0000' }}>{deadline}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Button style={buttonPrimary} href={claimUrl}>
            Claim Now Before It's Too Late
          </Button>

          <Text style={{ ...paragraph, marginTop: '16px', fontSize: '14px', color: '#666' }}>
            Click the button above to complete your claim. We've pre-filled your
            journey details - it only takes a minute!
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This is a reminder email from Eurostar Tools. You're receiving this because
            you have an unclaimed compensation. If you've already submitted your claim,
            please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DeadlineWarningEmail;
