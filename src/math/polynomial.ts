export type Polynomial = Map<number, number>;
export type Operation = 'add' | 'subtract' | 'multiply';

const EPSILON = 1e-10;

function clean(value: number): number {
  return Math.abs(value) < EPSILON ? 0 : Number(value.toPrecision(12));
}

function combine(a: Polynomial, b: Polynomial, sign = 1): Polynomial {
  const result = new Map(a);
  for (const [power, coefficient] of b) {
    const value = clean((result.get(power) ?? 0) + sign * coefficient);
    if (value === 0) result.delete(power);
    else result.set(power, value);
  }
  return result;
}

function multiply(a: Polynomial, b: Polynomial): Polynomial {
  const result: Polynomial = new Map();
  for (const [powerA, coefficientA] of a) {
    for (const [powerB, coefficientB] of b) {
      const power = powerA + powerB;
      const value = clean((result.get(power) ?? 0) + coefficientA * coefficientB);
      if (value === 0) result.delete(power);
      else result.set(power, value);
    }
  }
  return result;
}

type Punctuation = 'x' | '+' | '-' | '*' | '/' | '^' | '(' | ')';
type Token = { kind: 'number'; value: number } | { kind: Punctuation };

function tokenize(source: string): Token[] {
  const normalized = source
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/¹/g, '^1')
    .replace(/⁰/g, '^0')
    .replace(/\s+/g, '');
  const tokens: Token[] = [];
  let index = 0;
  while (index < normalized.length) {
    const rest = normalized.slice(index);
    const fraction = rest.match(/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?/);
    if (fraction) {
      const [numerator, denominator] = fraction[0].split('/').map(Number);
      if (denominator === 0) throw new Error('A fraction cannot have a zero denominator.');
      tokens.push({ kind: 'number', value: numerator / denominator });
      index += fraction[0].length;
      continue;
    }
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      tokens.push({ kind: 'number', value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const character = normalized[index].toLowerCase();
    if (character === 'x') tokens.push({ kind: 'x' });
    else if ('+-*/^()'.includes(character)) tokens.push({ kind: character as Punctuation });
    else throw new Error(`Unexpected character "${normalized[index]}". Use numbers, x, and polynomial operators.`);
    index += 1;
  }
  return tokens;
}

class Parser {
  private index = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Polynomial {
    const result = this.expression();
    if (this.index !== this.tokens.length) throw new Error('Check the expression near the end; it may contain an extra operator.');
    return result;
  }

  private expression(): Polynomial {
    let result = this.product();
    while (this.peek('+') || this.peek('-')) {
      const operator = this.tokens[this.index++].kind;
      const next = this.product();
      result = combine(result, next, operator === '+' ? 1 : -1);
    }
    return result;
  }

  private product(): Polynomial {
    let result = this.unary();
    while (this.peek('*') || this.peek('/')) {
      const operator = this.tokens[this.index++].kind;
      const next = this.unary();
      if (operator === '/') {
        if (next.size !== 1 || !next.has(0)) throw new Error('Division is supported only by a nonzero constant.');
        const divisor = next.get(0)!;
        if (divisor === 0) throw new Error('Division by zero is not defined.');
        result = new Map([...result].map(([power, coefficient]) => [power, coefficient / divisor]));
      } else result = multiply(result, next);
    }
    while (this.startsFactor()) result = multiply(result, this.unary());
    return result;
  }

  private unary(): Polynomial {
    if (this.peek('+')) {
      this.index += 1;
      return this.unary();
    }
    if (this.peek('-')) {
      this.index += 1;
      return new Map([...this.unary()].map(([power, coefficient]) => [power, -coefficient]));
    }
    let result: Polynomial;
    const token = this.tokens[this.index];
    if (!token) throw new Error('Add a number or term to complete the expression.');
    if (token.kind === '(') {
      this.index += 1;
      result = this.expression();
      if (!this.peek(')')) throw new Error('Add a closing parenthesis to complete the expression.');
      this.index += 1;
    } else if (token.kind === 'x') {
      this.index += 1;
      let power = 1;
      if (this.peek('^')) {
        this.index += 1;
        const exponent = this.tokens[this.index++];
        if (!exponent || exponent.kind !== 'number' || !Number.isInteger(exponent.value) || exponent.value < 0 || exponent.value > 100) {
          throw new Error('Powers must be whole numbers from 0 to 100.');
        }
        power = exponent.value;
      }
      result = new Map([[power, 1]]);
    } else if (token.kind === 'number') {
      this.index += 1;
      result = new Map([[0, token.value]]);
    } else {
      throw new Error('Expected a number, x, or an opening parenthesis.');
    }
    return result;
  }

  private startsFactor(): boolean {
    const token = this.tokens[this.index];
    return !!token && (token.kind === 'number' || token.kind === 'x' || token.kind === '(');
  }

  private peek(kind: Token['kind']): boolean {
    return this.tokens[this.index]?.kind === kind;
  }
}

export function parsePolynomial(source: string): Polynomial {
  if (!source.trim()) throw new Error('Enter a polynomial to continue.');
  const result = new Parser(tokenize(source)).parse();
  return new Map([...result].filter(([, coefficient]) => clean(coefficient) !== 0).map(([power, coefficient]) => [power, clean(coefficient)]));
}

export function operate(a: Polynomial, b: Polynomial, operation: Operation): Polynomial {
  if (operation === 'add') return combine(a, b);
  if (operation === 'subtract') return combine(a, b, -1);
  return multiply(a, b);
}

function formatNumber(value: number): string {
  const rounded = clean(value);
  if (Number.isInteger(rounded)) return String(rounded);
  const fraction = approximateFraction(rounded);
  return fraction ?? String(rounded);
}

function approximateFraction(value: number): string | null {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  for (let denominator = 2; denominator <= 100; denominator += 1) {
    const numerator = Math.round(absolute * denominator);
    if (Math.abs(absolute - numerator / denominator) < EPSILON) return `${sign}${numerator}/${denominator}`;
  }
  return null;
}

export function formatPolynomial(polynomial: Polynomial): string {
  const terms = [...polynomial].filter(([, coefficient]) => clean(coefficient) !== 0).sort(([a], [b]) => b - a);
  if (!terms.length) return '0';
  return terms.map(([power, coefficient], index) => {
    const negative = coefficient < 0;
    const magnitude = Math.abs(coefficient);
    const coefficientText = power > 0 && magnitude === 1 ? '' : formatNumber(magnitude);
    const variable = power === 0 ? '' : `x${power === 1 ? '' : `^${power}`}`;
    const term = `${coefficientText}${variable}` || '1';
    if (index === 0) return `${negative ? '-' : ''}${term}`;
    return `${negative ? ' - ' : ' + '}${term}`;
  }).join('');
}

export function evaluatePolynomial(polynomial: Polynomial, x: number): number {
  return [...polynomial].reduce((sum, [power, coefficient]) => sum + coefficient * x ** power, 0);
}

export function polynomialDegree(polynomial: Polynomial): number {
  return Math.max(0, ...polynomial.keys());
}

export function getOperationSteps(a: Polynomial, b: Polynomial, operation: Operation): string[] {
  const aText = formatPolynomial(a);
  const bText = formatPolynomial(b);
  const result = operate(a, b, operation);
  if (operation === 'multiply') {
    const pairings = [...a].flatMap(([powerA, coefficientA]) =>
      [...b].map(([powerB, coefficientB]) => {
        const left = formatPolynomial(new Map([[powerA, coefficientA]]));
        const right = formatPolynomial(new Map([[powerB, coefficientB]]));
        return `(${left})(${right}) = ${formatPolynomial(new Map([[powerA + powerB, coefficientA * coefficientB]]))}`;
      }),
    );
    const grouped = new Map<number, number>();
    for (const [powerA, coefficientA] of a) {
      for (const [powerB, coefficientB] of b) {
        grouped.set(powerA + powerB, (grouped.get(powerA + powerB) ?? 0) + coefficientA * coefficientB);
      }
    }
    const groupedText = [...grouped].sort(([p], [q]) => q - p)
      .map(([power, coefficient]) => formatPolynomial(new Map([[power, coefficient]]))).join(' + ')
      .replace(/\+ -/g, '- ');
    return [`Start with A(x) = ${aText} and B(x) = ${bText}.`, 'Apply the distributive property to every term pair:', pairings.join('  ·  '), `Combine matching powers: ${groupedText || '0'}.`, `Simplify: ${formatPolynomial(result)}.`];
  }
  if (operation === 'subtract') {
    const negated = formatPolynomial(new Map([...b].map(([power, coefficient]) => [power, -coefficient])));
    return [`Start with A(x) = ${aText} and B(x) = ${bText}.`, `Distribute the negative sign: A(x) + (−B(x)) = ${aText} + (${negated}).`, `Group terms with matching powers.`, `Combine their coefficients.`, `Simplify: ${formatPolynomial(result)}.`];
  }
  return [`Start with A(x) = ${aText} and B(x) = ${bText}.`, `Group like powers: ${aText} + ${bText}.`, 'Add the coefficients for each matching power.', `Simplify: ${formatPolynomial(result)}.`];
}
