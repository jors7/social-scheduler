/**
 * Currency formatting utilities for handling Stripe amounts
 *
 * Stripe stores amounts as integers:
 * - Cents-based currencies (USD, EUR, etc.): amount in cents (e.g., $10.00 = 1000)
 * - Zero-decimal currencies (JPY, KRW, etc.): amount in currency unit (e.g., ¥1000 = 1000)
 */

/**
 * Zero-decimal currencies (no fractional units)
 * https://stripe.com/docs/currencies#zero-decimal
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw',
  'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf',
  'xof', 'xpf'
]);

/**
 * Check if a currency is zero-decimal
 */
export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());
}

/**
 * Format Stripe amount to human-readable currency string
 *
 * @param amount - Amount in Stripe's format (cents for most currencies)
 * @param currency - ISO 4217 currency code (e.g., 'usd', 'jpy')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string (e.g., '$10.00', '¥1,000')
 *
 * @example
 * formatCurrency(1000, 'usd') // '$10.00'
 * formatCurrency(1000, 'jpy') // '¥1,000'
 * formatCurrency(1999, 'eur') // '€19.99'
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = 'en-US'
): string {
  // Convert from Stripe's integer format to decimal
  const decimalAmount = isZeroDecimalCurrency(currency)
    ? amount
    : amount / 100;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
    maximumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
  }).format(decimalAmount);
}

/**
 * Format Stripe amount to decimal number (no currency symbol)
 *
 * @param amount - Amount in Stripe's format
 * @param currency - ISO 4217 currency code
 * @returns Decimal number as string (e.g., '10.00', '1000')
 *
 * @example
 * formatAmount(1000, 'usd') // '10.00'
 * formatAmount(1000, 'jpy') // '1000'
 */
export function formatAmount(amount: number, currency: string): string {
  const decimalAmount = isZeroDecimalCurrency(currency)
    ? amount
    : amount / 100;

  return isZeroDecimalCurrency(currency)
    ? decimalAmount.toString()
    : decimalAmount.toFixed(2);
}

/**
 * Get currency symbol for a given currency code
 *
 * @param currency - ISO 4217 currency code
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Currency symbol (e.g., '$', '¥', '€')
 *
 * @example
 * getCurrencySymbol('usd') // '$'
 * getCurrencySymbol('jpy') // '¥'
 * getCurrencySymbol('eur') // '€'
 */
export function getCurrencySymbol(
  currency: string,
  locale: string = 'en-US'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

  // Extract symbol from formatted zero amount
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find(part => part.type === 'currency');
  return symbolPart?.value || currency.toUpperCase();
}

/**
 * Format currency for email display (with explicit symbol positioning)
 * Useful for HTML emails where you want consistent formatting
 *
 * @param amount - Amount in Stripe's format
 * @param currency - ISO 4217 currency code
 * @returns Object with formatted parts
 *
 * @example
 * formatCurrencyForEmail(1000, 'usd')
 * // { symbol: '$', amount: '10.00', formatted: '$10.00', currencyCode: 'USD' }
 *
 * formatCurrencyForEmail(1000, 'jpy')
 * // { symbol: '¥', amount: '1,000', formatted: '¥1,000', currencyCode: 'JPY' }
 */
export function formatCurrencyForEmail(amount: number, currency: string) {
  const symbol = getCurrencySymbol(currency);
  const decimalAmount = isZeroDecimalCurrency(currency)
    ? amount
    : amount / 100;

  const amountStr = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
    maximumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
  }).format(decimalAmount);

  return {
    symbol,
    amount: amountStr,
    formatted: `${symbol}${amountStr}`,
    currencyCode: currency.toUpperCase(),
  };
}

/**
 * Convert Stripe amount to decimal for calculations
 *
 * @param amount - Amount in Stripe's format
 * @param currency - ISO 4217 currency code
 * @returns Decimal number for calculations
 *
 * @example
 * stripeAmountToDecimal(1000, 'usd') // 10.00
 * stripeAmountToDecimal(1000, 'jpy') // 1000
 */
export function stripeAmountToDecimal(amount: number, currency: string): number {
  return isZeroDecimalCurrency(currency) ? amount : amount / 100;
}

/**
 * Convert decimal amount to Stripe format
 *
 * @param amount - Decimal amount (e.g., 10.00)
 * @param currency - ISO 4217 currency code
 * @returns Amount in Stripe's integer format
 *
 * @example
 * decimalToStripeAmount(10.00, 'usd') // 1000
 * decimalToStripeAmount(1000, 'jpy') // 1000
 */
export function decimalToStripeAmount(amount: number, currency: string): number {
  return isZeroDecimalCurrency(currency) ? Math.round(amount) : Math.round(amount * 100);
}
