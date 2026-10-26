#include "polynomial.h"

#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define EPSILON 1e-10

typedef enum {
    TOKEN_END,
    TOKEN_NUMBER,
    TOKEN_X,
    TOKEN_PLUS,
    TOKEN_MINUS,
    TOKEN_MULTIPLY,
    TOKEN_DIVIDE,
    TOKEN_POWER,
    TOKEN_LEFT_PAREN,
    TOKEN_RIGHT_PAREN,
    TOKEN_INVALID
} TokenType;

typedef struct {
    const char *source;
    TokenType type;
    double number;
    PolynomialError *error;
} Parser;

static void set_error(Parser *parser, const char *message) {
    if (parser->error != NULL && parser->error->message[0] == '\0') {
        snprintf(parser->error->message, sizeof(parser->error->message), "%s", message);
    }
}

static void clean_polynomial(Polynomial *polynomial) {
    int power;
    for (power = 0; power <= POLYNOMIAL_MAX_DEGREE; ++power) {
        if (fabs(polynomial->coefficients[power]) < EPSILON) {
            polynomial->coefficients[power] = 0.0;
        }
    }
}

static void next_token(Parser *parser) {
    char *end;
    while (isspace((unsigned char)*parser->source)) {
        ++parser->source;
    }

    if (*parser->source == '\0') {
        parser->type = TOKEN_END;
        return;
    }

    if (isdigit((unsigned char)*parser->source) || *parser->source == '.') {
        parser->number = strtod(parser->source, &end);
        if (end == parser->source) {
            parser->type = TOKEN_INVALID;
            return;
        }
        parser->source = end;
        parser->type = TOKEN_NUMBER;
        return;
    }

    switch (tolower((unsigned char)*parser->source++)) {
        case 'x': parser->type = TOKEN_X; break;
        case '+': parser->type = TOKEN_PLUS; break;
        case '-': parser->type = TOKEN_MINUS; break;
        case '*': parser->type = TOKEN_MULTIPLY; break;
        case '/': parser->type = TOKEN_DIVIDE; break;
        case '^': parser->type = TOKEN_POWER; break;
        case '(': parser->type = TOKEN_LEFT_PAREN; break;
        case ')': parser->type = TOKEN_RIGHT_PAREN; break;
        default: parser->type = TOKEN_INVALID; break;
    }

    if (parser->type == TOKEN_INVALID) {
        set_error(parser, "Unexpected character in polynomial expression.");
    }
}

static int parse_expression(Parser *parser, Polynomial *result);

static int parse_unary(Parser *parser, Polynomial *result) {
    double sign = 1.0;
    int power;

    while (parser->type == TOKEN_PLUS || parser->type == TOKEN_MINUS) {
        if (parser->type == TOKEN_MINUS) {
            sign = -sign;
        }
        next_token(parser);
    }

    memset(result, 0, sizeof(*result));
    if (parser->type == TOKEN_LEFT_PAREN) {
        next_token(parser);
        if (!parse_expression(parser, result)) {
            return 0;
        }
        if (parser->type != TOKEN_RIGHT_PAREN) {
            set_error(parser, "Add a closing parenthesis to complete the expression.");
            return 0;
        }
        next_token(parser);
    } else if (parser->type == TOKEN_X) {
        next_token(parser);
        power = 1;
        if (parser->type == TOKEN_POWER) {
            double exponent;
            next_token(parser);
            if (parser->type != TOKEN_NUMBER || floor(parser->number) != parser->number ||
                parser->number < 0 || parser->number > POLYNOMIAL_INPUT_MAX_DEGREE) {
                set_error(parser, "Powers must be whole numbers from 0 to 100.");
                return 0;
            }
            exponent = parser->number;
            power = (int)exponent;
            next_token(parser);
        }
        result->coefficients[power] = 1.0;
    } else if (parser->type == TOKEN_NUMBER) {
        result->coefficients[0] = parser->number;
        next_token(parser);
    } else {
        set_error(parser, "Expected a number, x, or an opening parenthesis.");
        return 0;
    }

    if (sign < 0) {
        for (power = 0; power <= POLYNOMIAL_MAX_DEGREE; ++power) {
            result->coefficients[power] = -result->coefficients[power];
        }
    }
    return 1;
}

static int starts_factor(TokenType type) {
    return type == TOKEN_NUMBER || type == TOKEN_X || type == TOKEN_LEFT_PAREN;
}

static int multiply_checked(const Polynomial *a, const Polynomial *b,
                            Polynomial *result, Parser *parser) {
    int power_a;
    int power_b;
    memset(result, 0, sizeof(*result));

    for (power_a = 0; power_a <= POLYNOMIAL_MAX_DEGREE; ++power_a) {
        if (a->coefficients[power_a] == 0.0) continue;
        for (power_b = 0; power_b <= POLYNOMIAL_MAX_DEGREE; ++power_b) {
            int power;
            if (b->coefficients[power_b] == 0.0) continue;
            power = power_a + power_b;
            if (power > POLYNOMIAL_MAX_DEGREE) {
                set_error(parser, "The result exceeds the supported maximum degree of 200.");
                return 0;
            }
            result->coefficients[power] += a->coefficients[power_a] * b->coefficients[power_b];
        }
    }
    clean_polynomial(result);
    return 1;
}

static int parse_product(Parser *parser, Polynomial *result) {
    if (!parse_unary(parser, result)) {
        return 0;
    }

    while (parser->type == TOKEN_MULTIPLY || parser->type == TOKEN_DIVIDE) {
        TokenType operation = parser->type;
        Polynomial next;
        Polynomial combined;
        int power;

        next_token(parser);
        if (!parse_unary(parser, &next)) {
            return 0;
        }

        if (operation == TOKEN_DIVIDE) {
            if (next.coefficients[0] == 0.0) {
                set_error(parser, "Division by zero is not defined.");
                return 0;
            }
            for (power = 1; power <= POLYNOMIAL_MAX_DEGREE; ++power) {
                if (next.coefficients[power] != 0.0) {
                    set_error(parser, "Division is supported only by a nonzero constant.");
                    return 0;
                }
            }
            for (power = 0; power <= POLYNOMIAL_MAX_DEGREE; ++power) {
                result->coefficients[power] /= next.coefficients[0];
            }
            clean_polynomial(result);
        } else {
            if (!multiply_checked(result, &next, &combined, parser)) {
                return 0;
            }
            *result = combined;
        }
    }

    while (starts_factor(parser->type)) {
        Polynomial next;
        Polynomial combined;
        if (!parse_unary(parser, &next) ||
            !multiply_checked(result, &next, &combined, parser)) {
            return 0;
        }
        *result = combined;
    }
    return 1;
}

static int parse_expression(Parser *parser, Polynomial *result) {
    Polynomial next;
    int sign;
    int power;

    if (!parse_product(parser, result)) {
        return 0;
    }
    while (parser->type == TOKEN_PLUS || parser->type == TOKEN_MINUS) {
        sign = parser->type == TOKEN_PLUS ? 1 : -1;
        next_token(parser);
        if (!parse_product(parser, &next)) {
            return 0;
        }
        for (power = 0; power <= POLYNOMIAL_MAX_DEGREE; ++power) {
            result->coefficients[power] += sign * next.coefficients[power];
        }
        clean_polynomial(result);
    }
    return 1;
}

int polynomial_parse(const char *expression, Polynomial *result, PolynomialError *error) {
    Parser parser;
    if (expression == NULL || result == NULL) {
        if (error != NULL) snprintf(error->message, sizeof(error->message), "Expression and result are required.");
        return 0;
    }
    if (error != NULL) error->message[0] = '\0';
    parser.source = expression;
    parser.type = TOKEN_END;
    parser.number = 0.0;
    parser.error = error;
    memset(result, 0, sizeof(*result));
    next_token(&parser);
    if (parser.type == TOKEN_END) {
        set_error(&parser, "Enter a polynomial to continue.");
        return 0;
    }
    if (!parse_expression(&parser, result)) {
        return 0;
    }
    if (parser.type != TOKEN_END) {
        set_error(&parser, "Check the expression for an unexpected token.");
        return 0;
    }
    clean_polynomial(result);
    return 1;
}

void polynomial_operate(const Polynomial *a, const Polynomial *b,
                        PolynomialOperation operation, Polynomial *result) {
    int power;
    memset(result, 0, sizeof(*result));
    if (operation == POLYNOMIAL_MULTIPLY) {
        int power_a;
        int power_b;
        for (power_a = 0; power_a <= POLYNOMIAL_MAX_DEGREE; ++power_a) {
            if (a->coefficients[power_a] == 0.0) continue;
            for (power_b = 0; power_b <= POLYNOMIAL_MAX_DEGREE; ++power_b) {
                int output_power = power_a + power_b;
                if (b->coefficients[power_b] == 0.0 || output_power > POLYNOMIAL_MAX_DEGREE) continue;
                result->coefficients[output_power] += a->coefficients[power_a] * b->coefficients[power_b];
            }
        }
    } else {
        double sign = operation == POLYNOMIAL_ADD ? 1.0 : -1.0;
        for (power = 0; power <= POLYNOMIAL_MAX_DEGREE; ++power) {
            result->coefficients[power] = a->coefficients[power] + sign * b->coefficients[power];
        }
    }
    clean_polynomial(result);
}

static int append_text(char *output, unsigned long capacity, unsigned long *used,
                       const char *text) {
    unsigned long length = (unsigned long)strlen(text);
    if (*used + length + 1 > capacity) return 0;
    memcpy(output + *used, text, length + 1);
    *used += length;
    return 1;
}

static void format_coefficient(double coefficient, char *output, unsigned long capacity) {
    double rounded = round(coefficient);
    if (fabs(coefficient - rounded) < EPSILON) {
        snprintf(output, capacity, "%.0f", rounded);
    } else {
        snprintf(output, capacity, "%.10g", coefficient);
    }
}

int polynomial_format(const Polynomial *polynomial, char *output, unsigned long capacity) {
    int power;
    int first = 1;
    unsigned long used = 0;
    if (polynomial == NULL || output == NULL || capacity == 0) return 0;
    output[0] = '\0';
    for (power = POLYNOMIAL_MAX_DEGREE; power >= 0; --power) {
        double coefficient = polynomial->coefficients[power];
        double magnitude;
        char number[64];
        char term[128];
        if (fabs(coefficient) < EPSILON) continue;
        magnitude = fabs(coefficient);
        format_coefficient(magnitude, number, sizeof(number));

        if (power == 0) {
            snprintf(term, sizeof(term), "%s", number);
        } else if (magnitude == 1.0) {
            snprintf(term, sizeof(term), power == 1 ? "x" : "x^%d", power);
        } else {
            snprintf(term, sizeof(term), power == 1 ? "%sx" : "%sx^%d", number, power);
        }

        if (first) {
            if (coefficient < 0 && !append_text(output, capacity, &used, "-")) return 0;
            first = 0;
        } else if (!append_text(output, capacity, &used, coefficient < 0 ? " - " : " + ")) {
            return 0;
        }
        if (!append_text(output, capacity, &used, term)) return 0;
    }
    return first ? append_text(output, capacity, &used, "0") : 1;
}
