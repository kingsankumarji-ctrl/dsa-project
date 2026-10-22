# POLYNOVA

An interactive polynomial learning lab built with React, TypeScript, Vite, Three.js, and Vitest. POLYNOVA parses polynomial expressions without `eval`, performs addition, subtraction, and multiplication, explains each operation, and plots the source and result functions.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `Ctrl+C` to stop the development server.

## Verify

```sh
npm test
npm run build
```

## Expression input

Use `x^2` or superscripts such as `x²`; implicit multiplication (`3x`), parentheses (`(x + 2)(x - 1)`), decimal and fractional coefficients (`0.5x`, `1/2x`) are supported. Exponents are nonnegative whole numbers up to 100. Division is supported only by a nonzero constant. The graph range is adjustable and shows the actual polynomial functions; products are expanded algebraically rather than represented as sums of graph heights.
