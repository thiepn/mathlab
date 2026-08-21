export interface Rational { n: bigint; d: bigint }

function bgcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) { const t = x % y; x = y; y = t; }
  return x || 1n;
}

export function rat(n: bigint | number, d: bigint | number = 1n): Rational {
  let nn = BigInt(n); let dd = BigInt(d);
  if (dd === 0n) throw new Error('Division by zero.');
  if (dd < 0n) { nn = -nn; dd = -dd; }
  const g = bgcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

export function parseRational(value: string): Rational {
  const text = value.trim();
  if (!text.includes('.')) return rat(BigInt(text));
  const sign = text.startsWith('-') ? -1n : 1n;
  const unsigned = text.replace(/^[+-]/, '');
  const [whole = '0', frac = ''] = unsigned.split('.');
  const denominator = 10n ** BigInt(frac.length);
  return rat(sign * (BigInt(whole || '0') * denominator + BigInt(frac || '0')), denominator);
}

export const ZERO = rat(0n);
export const ONE = rat(1n);
export function add(a: Rational, b: Rational) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
export function sub(a: Rational, b: Rational) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
export function mul(a: Rational, b: Rational) { return rat(a.n * b.n, a.d * b.d); }
export function div(a: Rational, b: Rational) { if (b.n === 0n) throw new Error('Division by zero.'); return rat(a.n * b.d, a.d * b.n); }
export function neg(a: Rational) { return { n: -a.n, d: a.d }; }
export function abs(a: Rational) { return { n: a.n < 0n ? -a.n : a.n, d: a.d }; }
export function eq(a: Rational, b: Rational) { return a.n === b.n && a.d === b.d; }
export function isZero(a: Rational) { return a.n === 0n; }
export function isOne(a: Rational) { return a.n === a.d; }
export function sign(a: Rational) { return a.n === 0n ? 0 : a.n > 0n ? 1 : -1; }
export function pow(a: Rational, exponent: number): Rational {
  if (!Number.isInteger(exponent)) throw new Error('Exact rational powers require an integer exponent.');
  if (exponent < 0) return div(ONE, pow(a, -exponent));
  return rat(a.n ** BigInt(exponent), a.d ** BigInt(exponent));
}
export function rationalToString(a: Rational) { return a.d === 1n ? a.n.toString() : `${a.n}/${a.d}`; }
export function rationalToNumber(a: Rational) { return Number(a.n) / Number(a.d); }
export function isPerfectSquareBigInt(value: bigint): bigint | null {
  if (value < 0n) return null;
  if (value < 2n) return value;
  let x = BigInt(Math.floor(Math.sqrt(Number(value))));
  if (!Number.isFinite(Number(value))) {
    x = 1n << (BigInt(value.toString(2).length) / 2n + 1n);
  }
  while (x * x > value) x = (x + value / x) / 2n;
  while ((x + 1n) * (x + 1n) <= value) x += 1n;
  return x * x === value ? x : null;
}
export function sqrtRational(a: Rational): Rational | null {
  if (a.n < 0n) return null;
  const sn = isPerfectSquareBigInt(a.n); const sd = isPerfectSquareBigInt(a.d);
  return sn !== null && sd !== null ? rat(sn, sd) : null;
}

export function isTerminatingDecimal(a: Rational): boolean {
  let d = a.d;
  while (d % 2n === 0n) d /= 2n;
  while (d % 5n === 0n) d /= 5n;
  return d === 1n;
}

export function rationalToDecimalString(a: Rational, digits = 10): string {
  const negative = a.n < 0n;
  const numerator = negative ? -a.n : a.n;
  const integer = numerator / a.d;
  let remainder = numerator % a.d;
  if (remainder === 0n) return `${negative ? '-' : ''}${integer}`;
  let fraction = '';
  let count = 0;
  while (remainder !== 0n && count < Math.max(1, digits)) {
    remainder *= 10n;
    fraction += (remainder / a.d).toString();
    remainder %= a.d;
    count += 1;
  }
  return `${negative ? '-' : ''}${integer}.${fraction}`;
}
