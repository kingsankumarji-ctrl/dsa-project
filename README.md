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

## C polynomial engine

The standalone C implementation in `c/` supports the same polynomial addition, subtraction, multiplication, expression parsing, and simplified output. It accepts expressions with `x^n`, implicit multiplication, parentheses, decimals, and fractions. Input exponents are limited to 100; result degrees are limited to 200.

With GCC:

```sh
gcc -std=c11 -Wall -Wextra -pedantic c/polynomial.c c/main.c -lm -o polynova
./polynova

gcc -std=c11 -Wall -Wextra -pedantic c/polynomial.c c/test_polynomial.c -lm -o polynomial-tests
./polynomial-tests
```

## Expression input

Use `x^2` or superscripts such as `x²`; implicit multiplication (`3x`), parentheses (`(x + 2)(x - 1)`), decimal and fractional coefficients (`0.5x`, `1/2x`) are supported. Exponents are nonnegative whole numbers up to 100. Division is supported only by a nonzero constant. The graph range is adjustable and shows the actual polynomial functions; products are expanded algebraically rather than represented as sums of graph heights.

## C polynomial math

`csrc\polynomial.c` is a standalone C console version of the core polynomial math: addition, subtraction, multiplication, and evaluation. Enter coefficients from the constant term upward (for example, for `2x^2 + 3x + 1`, enter `1`, `3`, `2`). It is separate from the browser app, whose math engine is TypeScript.

On Windows with GCC:

```sh
gcc csrc\polynomial.c -o polynomial.exe -std=c99 -Wall -Wextra -pedantic
.\polynomial.exe
```
