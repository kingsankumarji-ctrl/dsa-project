#include "polynomial.h"

#include <stdio.h>
#include <string.h>

static int read_expression(const char *prompt, char *buffer, size_t capacity) {
    size_t length;
    printf("%s", prompt);
    if (fgets(buffer, (int)capacity, stdin) == NULL) return 0;
    length = strlen(buffer);
    if (length > 0 && buffer[length - 1] == '\n') buffer[length - 1] = '\0';
    return 1;
}

int main(void) {
    char input_a[POLYNOMIAL_TEXT_CAPACITY];
    char input_b[POLYNOMIAL_TEXT_CAPACITY];
    char choice[32];
    char formatted[POLYNOMIAL_TEXT_CAPACITY];
    Polynomial a;
    Polynomial b;
    Polynomial result;
    PolynomialError error;
    PolynomialOperation operation;

    puts("POLYNOVA - Polynomial Calculator (C)");
    if (!read_expression("Polynomial A: ", input_a, sizeof(input_a)) ||
        !read_expression("Polynomial B: ", input_b, sizeof(input_b))) {
        fputs("Unable to read polynomial input.\n", stderr);
        return 1;
    }
    puts("Operation: 1) Add  2) Subtract  3) Multiply");
    if (!read_expression("Choose 1, 2, or 3: ", choice, sizeof(choice))) {
        fputs("Unable to read operation.\n", stderr);
        return 1;
    }

    if (strcmp(choice, "1") == 0) operation = POLYNOMIAL_ADD;
    else if (strcmp(choice, "2") == 0) operation = POLYNOMIAL_SUBTRACT;
    else if (strcmp(choice, "3") == 0) operation = POLYNOMIAL_MULTIPLY;
    else {
        fputs("Invalid operation. Choose 1, 2, or 3.\n", stderr);
        return 1;
    }

    if (!polynomial_parse(input_a, &a, &error)) {
        fprintf(stderr, "Invalid polynomial A: %s\n", error.message);
        return 1;
    }
    if (!polynomial_parse(input_b, &b, &error)) {
        fprintf(stderr, "Invalid polynomial B: %s\n", error.message);
        return 1;
    }

    polynomial_operate(&a, &b, operation, &result);
    if (!polynomial_format(&result, formatted, sizeof(formatted))) {
        fputs("Unable to format the polynomial result.\n", stderr);
        return 1;
    }
    printf("Result: %s\n", formatted);
    return 0;
}
