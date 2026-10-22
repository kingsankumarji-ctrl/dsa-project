import { describe, expect, it } from 'vitest';
import { formatPolynomial, operate, parsePolynomial, type Operation } from './polynomial';

function calculate(a: string, b: string, operation: Operation): string {
  return formatPolynomial(operate(parsePolynomial(a), parsePolynomial(b), operation));
}

describe('polynomial arithmetic', () => {
  it('adds and combines matching powers', () => {
    expect(calculate('2x² + 3x + 1', 'x² - x + 4', 'add')).toBe('3x^2 + 2x + 5');
    expect(calculate('3x² + 2x + 5', 'x² - 4x + 7', 'add')).toBe('4x^2 - 2x + 12');
  });

  it('subtracts including missing powers and negative terms', () => {
    expect(calculate('5x^3 - 2x + 6', '2x^3 + 3x - 1', 'subtract')).toBe('3x^3 - 5x + 7');
  });

  it('multiplies polynomials, merging equal exponents', () => {
    expect(calculate('x + 2', 'x - 3', 'multiply')).toBe('x^2 - x - 6');
    expect(calculate('x^2 + 1', 'x^2 - 1', 'multiply')).toBe('x^4 - 1');
    expect(calculate('-2x + 3', 'x + 4', 'multiply')).toBe('-2x^2 - 5x + 12');
    expect(calculate('3x² + 2x + 5', 'x² - 4x + 7', 'multiply')).toBe('3x^4 - 10x^3 + 18x^2 - 6x + 35');
  });

  it('supports fractions, constants, and zero results', () => {
    expect(formatPolynomial(parsePolynomial('1/2x + 0.5x - 4 + 4'))).toBe('x');
    expect(calculate('x^2 + 2x + 1', 'x^2 + 2x + 1', 'subtract')).toBe('0');
  });

  it('rejects invalid expressions and unsafe exponents', () => {
    expect(() => parsePolynomial('x +')).toThrow();
    expect(() => parsePolynomial('x^-1')).toThrow();
    expect(() => parsePolynomial('x^101')).toThrow();
    expect(() => parsePolynomial('1/0x')).toThrow();
  });
});
