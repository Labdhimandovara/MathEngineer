/**
 * Deterministic Mathematical Expression Parser & Evaluator
 * 
 * Safely parses and evaluates mathematical expressions f(x)
 * without using eval() or Function() constructor.
 * Supports polynomials, standard operators, implicit multiplication,
 * and elementary transcendental functions.
 */

export type MathFunction = (x: number) => number;

export interface ParseResult {
  fn: MathFunction;
  rawExpression: string;
  cleanedExpression: string;
}

// Token types
export type TokenType =
  | 'NUMBER'
  | 'VARIABLE'
  | 'OPERATOR'
  | 'FUNCTION'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA';

export interface Token {
  type: TokenType;
  value: string;
}

const SUPPORTED_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'exp',
  'log',
  'ln',
  'sqrt',
  'abs',
]);

const CONSTANTS: Record<string, number> = {
  e: Math.E,
  pi: Math.PI,
  PI: Math.PI,
};

/**
 * Normalizes input: handles equations like 'x^3 - 9x + 1 = 0' -> 'x^3 - 9x + 1'
 * and implicit multiplication like '9x' -> '9*x', 'x sin(x)' -> 'x*sin(x)', etc.
 */
export function normalizeExpressionString(expr: string): string {
  let cleaned = expr.trim();

  // If expression contains '=', convert LHS = RHS to (LHS) - (RHS)
  if (cleaned.includes('=')) {
    const parts = cleaned.split('=');
    if (parts.length === 2) {
      const lhs = parts[0].trim();
      const rhs = parts[1].trim();
      if (rhs === '0') {
        cleaned = lhs;
      } else {
        cleaned = `(${lhs}) - (${rhs})`;
      }
    } else {
      throw new Error(`Invalid equation format: multiple '=' signs encountered.`);
    }
  }

  // Replace power operator variants: '**' to '^'
  cleaned = cleaned.replace(/\*\*/g, '^');

  // Replace 'e^x' or 'e^(...)' with exp(...)
  cleaned = cleaned.replace(/\be\s*\^\s*([a-zA-Z0-9]+)/g, 'exp($1)');
  cleaned = cleaned.replace(/\be\s*\^\s*\(([^)]+)\)/g, 'exp($1)');

  return cleaned;
}

/**
 * Tokenizes the expression string into a sequence of tokens with implicit multiplication handling.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number literal (including decimals)
    if (/\d/.test(ch) || (ch === '.' && i + 1 < input.length && /\d/.test(input[i + 1]))) {
      let numStr = '';
      while (i < input.length && (/[\d.]/.test(input[i]))) {
        numStr += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    // Alphabetic identifiers: variable, function, or constant
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        ident += input[i];
        i++;
      }

      const lower = ident.toLowerCase();
      if (lower === 'x') {
        tokens.push({ type: 'VARIABLE', value: 'x' });
      } else if (lower in CONSTANTS) {
        tokens.push({ type: 'NUMBER', value: String(CONSTANTS[lower]) });
      } else if (SUPPORTED_FUNCTIONS.has(lower)) {
        tokens.push({ type: 'FUNCTION', value: lower });
      } else {
        throw new Error(`Unknown variable or function: '${ident}'. Supported variable is 'x'.`);
      }
      continue;
    }

    // Operators
    if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'OPERATOR', value: ch });
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    throw new Error(`Unexpected character in expression: '${ch}'`);
  }

  // Insert implicit multiplication tokens where needed:
  // e.g. NUMBER VARIABLE (9x -> 9 * x), NUMBER LPAREN (2(x) -> 2 * (x)),
  // VARIABLE LPAREN (x(x+1) -> x * (x+1)), RPAREN LPAREN ((x)(x) -> (x) * (x)),
  // RPAREN VARIABLE ((x)x -> (x) * x), VARIABLE FUNCTION (x sin(x) -> x * sin(x))
  const withImplicit: Token[] = [];
  for (let j = 0; j < tokens.length; j++) {
    const curr = tokens[j];
    const prev = tokens[j - 1];

    if (prev) {
      const prevCanMultiply =
        prev.type === 'NUMBER' ||
        prev.type === 'VARIABLE' ||
        prev.type === 'RPAREN';

      const currCanBeMultiplied =
        curr.type === 'VARIABLE' ||
        curr.type === 'FUNCTION' ||
        curr.type === 'LPAREN' ||
        (curr.type === 'NUMBER' && prev.type === 'RPAREN');

      if (prevCanMultiply && currCanBeMultiplied) {
        withImplicit.push({ type: 'OPERATOR', value: '*' });
      }
    }

    withImplicit.push(curr);
  }

  return withImplicit;
}

// AST Nodes
export type ASTNode =
  | { type: 'NUMBER'; value: number }
  | { type: 'VARIABLE'; name: string }
  | { type: 'UNARY_OP'; op: string; argument: ASTNode }
  | { type: 'BINARY_OP'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'CALL'; fnName: string; argument: ASTNode };

/**
 * Recursive descent parser building an AST from tokens.
 * Operator precedence:
 *   1. + - (lowest)
 *   2. * /
 *   3. unary + -
 *   4. ^ (right-associative)
 *   5. function calls, parentheses (highest)
 */
export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(expectedType?: TokenType, expectedValue?: string): Token {
    const token = this.peek();
    if (!token) {
      throw new Error(`Unexpected end of expression.`);
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected token type ${expectedType}, found ${token.type} ('${token.value}').`);
    }
    if (expectedValue && token.value !== expectedValue) {
      throw new Error(`Expected '${expectedValue}', found '${token.value}'.`);
    }
    this.pos++;
    return token;
  }

  public parse(): ASTNode {
    if (this.tokens.length === 0) {
      throw new Error('Expression is empty.');
    }
    const node = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected extra token '${this.tokens[this.pos].value}' at position ${this.pos}.`);
    }
    return node;
  }

  private parseExpression(): ASTNode {
    return this.parseAddition();
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();
    while (this.peek() && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume().value;
      const right = this.parseMultiplication();
      left = { type: 'BINARY_OP', op, left, right };
    }
    return left;
  }

  private parseMultiplication(): ASTNode {
    let left = this.parseUnary();
    while (this.peek() && (this.peek()!.value === '*' || this.peek()!.value === '/')) {
      const op = this.consume().value;
      const right = this.parseUnary();
      left = { type: 'BINARY_OP', op, left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.peek() && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume().value;
      const argument = this.parseUnary();
      return { type: 'UNARY_OP', op, argument };
    }
    return this.parsePower();
  }

  private parsePower(): ASTNode {
    const left = this.parsePrimary();
    if (this.peek() && this.peek()!.value === '^') {
      this.consume('OPERATOR', '^');
      // Power is right-associative: 2^3^4 = 2^(3^4)
      const right = this.parseUnary();
      return { type: 'BINARY_OP', op: '^', left, right };
    }
    return left;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();
    if (!token) {
      throw new Error(`Unexpected end of expression.`);
    }

    if (token.type === 'NUMBER') {
      this.consume();
      const num = Number(token.value);
      if (isNaN(num)) {
        throw new Error(`Invalid number literal: '${token.value}'`);
      }
      return { type: 'NUMBER', value: num };
    }

    if (token.type === 'VARIABLE') {
      this.consume();
      return { type: 'VARIABLE', name: 'x' };
    }

    if (token.type === 'FUNCTION') {
      const fnName = this.consume().value;
      this.consume('LPAREN', '(');
      const argument = this.parseExpression();
      this.consume('RPAREN', ')');
      return { type: 'CALL', fnName, argument };
    }

    if (token.type === 'LPAREN') {
      this.consume('LPAREN', '(');
      const inner = this.parseExpression();
      this.consume('RPAREN', ')');
      return inner;
    }

    throw new Error(`Unexpected token: '${token.value}'`);
  }
}

/**
 * Evaluates an ASTNode given the real value of x.
 */
export function evaluateAST(node: ASTNode, x: number): number {
  switch (node.type) {
    case 'NUMBER':
      return node.value;

    case 'VARIABLE':
      return x;

    case 'UNARY_OP': {
      const val = evaluateAST(node.argument, x);
      return node.op === '-' ? -val : val;
    }

    case 'BINARY_OP': {
      const l = evaluateAST(node.left, x);
      const r = evaluateAST(node.right, x);
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          if (r === 0) {
            throw new Error(`Division by zero evaluated at x = ${x}.`);
          }
          return l / r;
        case '^': {
          const res = Math.pow(l, r);
          if (isNaN(res)) {
            throw new Error(`Invalid power evaluation (${l}^${r}) resulting in non-real number at x = ${x}.`);
          }
          return res;
        }
        default:
          throw new Error(`Unsupported binary operator: '${node.op}'`);
      }
    }

    case 'CALL': {
      const arg = evaluateAST(node.argument, x);
      switch (node.fnName) {
        case 'sin':
          return Math.sin(arg);
        case 'cos':
          return Math.cos(arg);
        case 'tan':
          return Math.tan(arg);
        case 'exp':
          return Math.exp(arg);
        case 'log':
        case 'ln':
          if (arg <= 0) {
            throw new Error(`Logarithm undefined for non-positive value (${arg}) at x = ${x}.`);
          }
          return Math.log(arg);
        case 'sqrt':
          if (arg < 0) {
            throw new Error(`Square root undefined for negative value (${arg}) at x = ${x}.`);
          }
          return Math.sqrt(arg);
        case 'abs':
          return Math.abs(arg);
        default:
          throw new Error(`Unsupported function: '${node.fnName}'`);
      }
    }
  }
}

/**
 * Compiles a mathematical expression string into a fast, reusable deterministic function.
 */
export function compileExpression(rawExpression: string): ParseResult {
  const cleaned = normalizeExpressionString(rawExpression);
  const tokens = tokenize(cleaned);
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const fn: MathFunction = (x: number) => {
    if (isNaN(x) || !isFinite(x)) {
      throw new Error(`Invalid evaluation point: x must be a finite number, received ${x}.`);
    }
    const result = evaluateAST(ast, x);
    if (isNaN(result) || !isFinite(result)) {
      throw new Error(`Function evaluation resulted in undefined or non-finite value at x = ${x}.`);
    }
    return result;
  };

  return {
    fn,
    rawExpression,
    cleanedExpression: cleaned,
  };
}
