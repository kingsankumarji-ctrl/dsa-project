#ifndef POLYNOVA_POLYNOMIAL_H
#define POLYNOVA_POLYNOMIAL_H

#define POLYNOMIAL_MAX_DEGREE 200
#define POLYNOMIAL_INPUT_MAX_DEGREE 100
#define POLYNOMIAL_TEXT_CAPACITY 8192

typedef struct {
    double coefficients[POLYNOMIAL_MAX_DEGREE + 1];
} Polynomial;

typedef enum {
    POLYNOMIAL_ADD,
    POLYNOMIAL_SUBTRACT,
    POLYNOMIAL_MULTIPLY
} PolynomialOperation;

typedef struct {
    char message[160];
} PolynomialError;

int polynomial_parse(const char *expression, Polynomial *result, PolynomialError *error);
void polynomial_operate(const Polynomial *a, const Polynomial *b,
                        PolynomialOperation operation, Polynomial *result);
int polynomial_format(const Polynomial *polynomial, char *output, unsigned long capacity);

#endif
