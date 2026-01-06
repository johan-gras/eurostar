import {
  Currency,
  MINIMUM_PAYOUT,
  DEFAULT_EUR_TO_GBP_RATE,
  type CompensationResult,
} from './types.js';
import { getTierForDelay } from './tiers.js';

/**
 * Options for compensation calculation.
 */
export interface CalculateCompensationOptions {
  /** Custom EUR to GBP exchange rate (default: 0.85) */
  exchangeRate?: number;
}

/**
 * Calculates compensation amounts for a delayed journey.
 *
 * This is a pure function with no side effects. Given the same inputs,
 * it will always produce the same output.
 *
 * @param delayMinutes - The delay in minutes
 * @param ticketPrice - The ticket price (in the specified currency)
 * @param currency - The currency (EUR or GBP, default: EUR)
 * @param options - Optional calculation options
 * @returns CompensationResult or null if not eligible
 *
 * @example
 * // 90-minute delay on €100 ticket
 * calculateCompensation(90, 100, 'EUR')
 * // => { eligible: true, cashAmount: 25, voucherAmount: 60, ... }
 *
 * // 45-minute delay (below threshold)
 * calculateCompensation(45, 100, 'EUR')
 * // => null
 *
 * // €10 ticket with 60-min delay (€2.50 cash, below €4 minimum)
 * calculateCompensation(60, 10, 'EUR')
 * // => null (below minimum payout)
 */
export function calculateCompensation(
  delayMinutes: number,
  ticketPrice: number,
  currency: Currency = Currency.EUR,
  _options: CalculateCompensationOptions = {}
): CompensationResult | null {
  // Get applicable tier
  const tier = getTierForDelay(delayMinutes);

  // Not eligible if no tier applies (delay < 60 minutes)
  if (!tier) {
    return null;
  }

  // Calculate raw amounts
  const rawCashAmount = ticketPrice * tier.cashPercentage;
  const rawVoucherAmount = ticketPrice * tier.voucherPercentage;

  // Round to 2 decimal places
  const cashAmount = roundToTwoDecimals(rawCashAmount);
  const voucherAmount = roundToTwoDecimals(rawVoucherAmount);

  // Check minimum payout threshold
  const minimumPayout = MINIMUM_PAYOUT[currency];
  if (cashAmount < minimumPayout && voucherAmount < minimumPayout) {
    // Both amounts are below minimum, not eligible
    return null;
  }

  return {
    eligible: true,
    cashAmount,
    voucherAmount,
    tier,
    currency,
    ticketPrice,
    delayMinutes,
  };
}

/**
 * Calculates compensation with detailed result including ineligible cases.
 *
 * Unlike calculateCompensation, this always returns a result object
 * even when not eligible, which is useful for displaying why a claim
 * is not eligible.
 *
 * @param delayMinutes - The delay in minutes
 * @param ticketPrice - The ticket price
 * @param currency - The currency (default: EUR)
 * @returns CompensationResult (eligible may be false)
 */
export function calculateCompensationDetailed(
  delayMinutes: number,
  ticketPrice: number,
  currency: Currency = Currency.EUR
): CompensationResult {
  const tier = getTierForDelay(delayMinutes);

  // Base result for ineligible cases
  const baseResult: CompensationResult = {
    eligible: false,
    cashAmount: 0,
    voucherAmount: 0,
    tier: null,
    currency,
    ticketPrice,
    delayMinutes,
  };

  // Not eligible if delay is below threshold
  if (!tier) {
    return baseResult;
  }

  // Calculate amounts
  const rawCashAmount = ticketPrice * tier.cashPercentage;
  const rawVoucherAmount = ticketPrice * tier.voucherPercentage;
  const cashAmount = roundToTwoDecimals(rawCashAmount);
  const voucherAmount = roundToTwoDecimals(rawVoucherAmount);

  // Check minimum payout
  const minimumPayout = MINIMUM_PAYOUT[currency];
  const meetsMinimum = cashAmount >= minimumPayout || voucherAmount >= minimumPayout;

  return {
    eligible: meetsMinimum,
    cashAmount,
    voucherAmount,
    tier,
    currency,
    ticketPrice,
    delayMinutes,
  };
}

/**
 * Converts an amount from EUR to GBP.
 *
 * @param eurAmount - Amount in EUR
 * @param exchangeRate - EUR to GBP rate (default: 0.85)
 * @returns Amount in GBP, rounded to 2 decimal places
 */
export function convertEurToGbp(
  eurAmount: number,
  exchangeRate: number = DEFAULT_EUR_TO_GBP_RATE
): number {
  return roundToTwoDecimals(eurAmount * exchangeRate);
}

/**
 * Converts an amount from GBP to EUR.
 *
 * @param gbpAmount - Amount in GBP
 * @param exchangeRate - EUR to GBP rate (default: 0.85)
 * @returns Amount in EUR, rounded to 2 decimal places
 */
export function convertGbpToEur(
  gbpAmount: number,
  exchangeRate: number = DEFAULT_EUR_TO_GBP_RATE
): number {
  return roundToTwoDecimals(gbpAmount / exchangeRate);
}

/**
 * Checks if a compensation amount meets the minimum payout threshold.
 *
 * @param amount - The compensation amount
 * @param currency - The currency
 * @returns true if amount meets or exceeds minimum
 */
export function meetsMinimumPayout(amount: number, currency: Currency): boolean {
  return amount >= MINIMUM_PAYOUT[currency];
}

/**
 * Gets the minimum payout threshold for a currency.
 *
 * @param currency - The currency
 * @returns Minimum payout amount
 */
export function getMinimumPayout(currency: Currency): number {
  return MINIMUM_PAYOUT[currency];
}

/**
 * Rounds a number to 2 decimal places.
 * Uses Math.round to handle floating point precision issues.
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a compensation amount for display.
 *
 * @param amount - The amount
 * @param currency - The currency
 * @returns Formatted string (e.g., "€25.00" or "£21.25")
 */
export function formatCompensationAmount(
  amount: number,
  currency: Currency
): string {
  const symbol = currency === Currency.EUR ? '€' : '£';
  return `${symbol}${amount.toFixed(2)}`;
}
