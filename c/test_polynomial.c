#include "polynomial.h"

#include <stdio.h>
#include <string.h>

static int assertions = 0;
static int failures = 0;

static void expect_result(const char *input_a, const char *input_b,
                          PolynomialOperation operation, const char *expected) {
    Polynomial a;
    Polynomial b;
    Polynomial result;
    PolynomialError error;
    char formatted[POLYNOMIAL_TEXT_CAPACITY];
    ++assertions;

    if (!polynomial_parse(input_a, &a, &error) ||
        !polynomial_parse(input_b, &b, &error)) {
        fprintf(stderr, "FAIL parse: %s\n", error.message);
        ++failures;
        return;
    }
    polynomial_operate(&a, &b, operation, &result);
    if (!polynomial_format(&result, formatted, sizeof(formatted)) ||
        strcmp(formatted, expected) != 0) {
        fprintf(stderr, "FAIL (%s) expected [%s], got [%s]\n",
                input_a, expected, formatted);
        ++failures;
    }
}

static void expect_invalid(const char *expression) {
    Polynomial polynomial;
    PolynomialError error;
    ++assertions;
    if (polynomial_parse(expression, &polynomial, &error)) {
        fprintf(stderr, "FAIL expected invalid expression: %s\n", expression);
        ++failures;
    }
}

int main(void) {
    expect_result("2x^2 + 3x + 1", "x^2 - x + 4", POLYNOMIAL_ADD, "3x^2 + 2x + 5");
    expect_result("5x^3 - 2x + 6", "2x^3 + 3x - 1", POLYNOMIAL_SUBTRACT, "3x^3 - 5x + 7");
    expect_result("x + 2", "x - 3", POLYNOMIAL_MULTIPLY, "x^2 - x - 6");
    expect_result("x^2 + 1", "x^2 - 1", POLYNOMIAL_MULTIPLY, "x^4 - 1");
    expect_result("-2x + 3", "x + 4", POLYNOMIAL_MULTIPLY, "-2x^2 - 5x + 12");
    expect_result("3x^2 + 2x + 5", "x^2 - 4x + 7", POLYNOMIAL_MULTIPLY,
                  "3x^4 - 10x^3 + 18x^2 - 6x + 35");
    expect_result("(x + 2)(x - 3)", "0", POLYNOMIAL_ADD, "x^2 - x - 6");
    expect_result("1/2x + 0.5x", "0", POLYNOMIAL_ADD, "x");
    expect_result("x^2 + 2x + 1", "x^2 + 2x + 1", POLYNOMIAL_SUBTRACT, "0");
    expect_invalid("x +");
    expect_invalid("x^-1");
    expect_invalid("x^101");
    expect_invalid("1/0");

    if (failures != 0) {
        fprintf(stderr, "%d of %d tests failed.\n", failures, assertions);
        return 1;
    }
    printf("All %d polynomial tests passed.\n", assertions);
    return 0;
}
