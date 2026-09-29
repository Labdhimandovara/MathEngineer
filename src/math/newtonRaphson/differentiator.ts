/**
 * Deterministic Symbolic Differentiator
 * 
 * Implements clean, scoped symbolic differentiation over AST nodes from
 * expressionParser.ts without external libraries or APIs.
 * Supports polynomials, elementary powers, trigonometric, and exponential expressions.
 */

import {
  ASTNode,
  Parser,
  tokenize,
  normalizeExpressionString,
  compileExpression,
  evaluateAST,
  MathFunction,
} from '../expressionParser.ts';

export interface DerivativeResult {
  fn: MathFunction;
  expressionString: string;
}

/**
 * Performs symbolic differentiation of an ASTNode with respect to 'x'.
 */
export function differentiateAST(node: ASTNode): ASTNode {
  switch (node.type) {
    case 'NUMBER':
      return { type: 'NUMBER', value: 0 };

    case 'VARIABLE':
      return { type: 'NUMBER', value: 1 };

    case 'UNARY_OP': {
      const dArg = differentiateAST(node.argument);
      if (node.op === '-') {
        return { type: 'UNARY_OP', op: '-', argument: dArg };
      }
      return dArg;
    }

    case 'BINARY_OP': {
      const u = node.left;
      const v = node.right;
      const du = differentiateAST(u);
      const dv = differentiateAST(v);

      switch (node.op) {
        case '+':
          return { type: 'BINARY_OP', op: '+', left: du, right: dv };

        case '-':
          return { type: 'BINARY_OP', op: '-', left: du, right: dv };

        case '*':
          // Product rule: (u * v)' = u' * v + u * v'
          return {
            type: 'BINARY_OP',
            op: '+',
            left: { type: 'BINARY_OP', op: '*', left: du, right: v },
            right: { type: 'BINARY_OP', op: '*', left: u, right: dv },
          };

        case '/':
          // Quotient rule: (u / v)' = (u' * v - u * v') / (v ^ 2)
          return {
            type: 'BINARY_OP',
            op: '/',
            left: {
              type: 'BINARY_OP',
              op: '-',
              left: { type: 'BINARY_OP', op: '*', left: du, right: v },
              right: { type: 'BINARY_OP', op: '*', left: u, right: dv },
            },
            right: {
              type: 'BINARY_OP',
              op: '^',
              left: v,
              right: { type: 'NUMBER', value: 2 },
            },
          };

        case '^': {
          // Power rule: d/dx [u^n] where n is a constant number
          if (v.type === 'NUMBER') {
            const n = v.value;
            if (n === 0) {
              return { type: 'NUMBER', value: 0 };
            }
            if (n === 1) {
              return du;
            }
            // n * u^(n - 1) * du
            const uPow =
              n - 1 === 1
                ? u
                : {
                    type: 'BINARY_OP' as const,
                    op: '^',
                    left: u,
                    right: { type: 'NUMBER' as const, value: n - 1 },
                  };
            return {
              type: 'BINARY_OP',
              op: '*',
              left: {
                type: 'BINARY_OP',
                op: '*',
                left: { type: 'NUMBER', value: n },
                right: uPow,
              },
              right: du,
            };
          }
          throw new Error(
            `Symbolic differentiation of non-constant exponent (u^v) is not supported.`
          );
        }

        default:
          throw new Error(`Unsupported binary operator in differentiation: '${node.op}'`);
      }
    }

    case 'CALL': {
      const u = node.argument;
      const du = differentiateAST(u);

      switch (node.fnName) {
        case 'sin':
          // d/dx [sin(u)] = cos(u) * du
          return {
            type: 'BINARY_OP',
            op: '*',
            left: { type: 'CALL', fnName: 'cos', argument: u },
            right: du,
          };

        case 'cos':
          // d/dx [cos(u)] = -sin(u) * du
          return {
            type: 'BINARY_OP',
            op: '*',
            left: {
              type: 'UNARY_OP',
              op: '-',
              argument: { type: 'CALL', fnName: 'sin', argument: u },
            },
            right: du,
          };

        case 'tan':
          // d/dx [tan(u)] = (1 + tan(u)^2) * du
          return {
            type: 'BINARY_OP',
            op: '*',
            left: {
              type: 'BINARY_OP',
              op: '+',
              left: { type: 'NUMBER', value: 1 },
              right: {
                type: 'BINARY_OP',
                op: '^',
                left: { type: 'CALL', fnName: 'tan', argument: u },
                right: { type: 'NUMBER', value: 2 },
              },
            },
            right: du,
          };

        case 'exp':
          // d/dx [exp(u)] = exp(u) * du
          return {
            type: 'BINARY_OP',
            op: '*',
            left: { type: 'CALL', fnName: 'exp', argument: u },
            right: du,
          };

        case 'ln':
        case 'log':
          // d/dx [ln(u)] = (1 / u) * du
          return {
            type: 'BINARY_OP',
            op: '/',
            left: du,
            right: u,
          };

        case 'sqrt':
          // d/dx [sqrt(u)] = du / (2 * sqrt(u))
          return {
            type: 'BINARY_OP',
            op: '/',
            left: du,
            right: {
              type: 'BINARY_OP',
              op: '*',
              left: { type: 'NUMBER', value: 2 },
              right: { type: 'CALL', fnName: 'sqrt', argument: u },
            },
          };

        default:
          throw new Error(
            `Symbolic differentiation not supported for function: '${node.fnName}'`
          );
      }
    }
  }
}

/**
 * Algebraic simplification of AST nodes (eliminates 0s, 1s, and constant expressions).
 */
export function simplifyAST(node: ASTNode): ASTNode {
  switch (node.type) {
    case 'NUMBER':
    case 'VARIABLE':
      return node;

    case 'UNARY_OP': {
      const arg = simplifyAST(node.argument);
      if (arg.type === 'NUMBER') {
        return { type: 'NUMBER', value: node.op === '-' ? -arg.value : arg.value };
      }
      if (node.op === '+' ) return arg;
      if (node.op === '-' && arg.type === 'UNARY_OP' && arg.op === '-') {
        return arg.argument;
      }
      return { type: 'UNARY_OP', op: node.op, argument: arg };
    }

    case 'BINARY_OP': {
      const l = simplifyAST(node.left);
      const r = simplifyAST(node.right);

      // Constant folding
      if (l.type === 'NUMBER' && r.type === 'NUMBER') {
        switch (node.op) {
          case '+':
            return { type: 'NUMBER', value: l.value + r.value };
          case '-':
            return { type: 'NUMBER', value: l.value - r.value };
          case '*':
            return { type: 'NUMBER', value: l.value * r.value };
          case '/':
            if (r.value !== 0) return { type: 'NUMBER', value: l.value / r.value };
            break;
          case '^':
            return { type: 'NUMBER', value: Math.pow(l.value, r.value) };
        }
      }

      // Additive identities
      if (node.op === '+') {
        if (l.type === 'NUMBER' && l.value === 0) return r;
        if (r.type === 'NUMBER' && r.value === 0) return l;
      }

      if (node.op === '-') {
        if (r.type === 'NUMBER' && r.value === 0) return l;
        if (l.type === 'NUMBER' && l.value === 0) {
          return simplifyAST({ type: 'UNARY_OP', op: '-', argument: r });
        }
      }

      // Multiplicative identities
      if (node.op === '*') {
        if ((l.type === 'NUMBER' && l.value === 0) || (r.type === 'NUMBER' && r.value === 0)) {
          return { type: 'NUMBER', value: 0 };
        }
        if (l.type === 'NUMBER' && l.value === 1) return r;
        if (r.type === 'NUMBER' && r.value === 1) return l;
        if (l.type === 'NUMBER' && l.value === -1) {
          return simplifyAST({ type: 'UNARY_OP', op: '-', argument: r });
        }
        if (r.type === 'NUMBER' && r.value === -1) {
          return simplifyAST({ type: 'UNARY_OP', op: '-', argument: l });
        }
      }

      if (node.op === '/') {
        if (l.type === 'NUMBER' && l.value === 0) return { type: 'NUMBER', value: 0 };
        if (r.type === 'NUMBER' && r.value === 1) return l;
      }

      if (node.op === '^') {
        if (r.type === 'NUMBER' && r.value === 0) return { type: 'NUMBER', value: 1 };
        if (r.type === 'NUMBER' && r.value === 1) return l;
        if (l.type === 'NUMBER' && (l.value === 0 || l.value === 1)) return l;
      }

      return { type: 'BINARY_OP', op: node.op, left: l, right: r };
    }

    case 'CALL':
      return {
        type: 'CALL',
        fnName: node.fnName,
        argument: simplifyAST(node.argument),
      };
  }
}

/**
 * Converts an ASTNode back to a readable mathematical expression string.
 */
export function astToString(node: ASTNode, parentPrecedence = 0): string {
  switch (node.type) {
    case 'NUMBER':
      return String(node.value);

    case 'VARIABLE':
      return node.name;

    case 'UNARY_OP': {
      const inner = astToString(node.argument, 3);
      return `${node.op}${inner}`;
    }

    case 'BINARY_OP': {
      let prec = 1;
      if (node.op === '*' || node.op === '/') prec = 2;
      if (node.op === '^') prec = 4;

      const leftStr = astToString(node.left, prec);
      const rightStr = astToString(node.right, prec + (node.op === '^' ? 0 : 1));
      const str = `${leftStr} ${node.op} ${rightStr}`;

      if (prec < parentPrecedence) {
        return `(${str})`;
      }
      return str;
    }

    case 'CALL':
      return `${node.fnName}(${astToString(node.argument, 0)})`;
  }
}

/**
 * Resolves or computes the derivative for a given expression.
 */
export function resolveDerivative(
  expression: string | MathFunction,
  explicitDerivative?: string | MathFunction
): DerivativeResult {
  // Case 1: Explicit derivative provided as function
  if (typeof explicitDerivative === 'function') {
    return {
      fn: explicitDerivative,
      expressionString: 'f\'(x) [custom function]',
    };
  }

  // Case 2: Explicit derivative provided as mathematical string
  if (typeof explicitDerivative === 'string') {
    const compiled = compileExpression(explicitDerivative);
    return {
      fn: compiled.fn,
      expressionString: compiled.cleanedExpression,
    };
  }

  // Case 3: Symbolic differentiation of expression string
  if (typeof expression === 'string') {
    const cleaned = normalizeExpressionString(expression);
    const tokens = tokenize(cleaned);
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const rawDerivativeAst = differentiateAST(ast);
    const simplifiedAst = simplifyAST(rawDerivativeAst);
    const derivStr = astToString(simplifiedAst);

    const fn: MathFunction = (x: number) => {
      const val = evaluateAST(simplifiedAst, x);
      if (isNaN(val) || !isFinite(val)) {
        throw new Error(`Derivative evaluation produced non-finite value at x = ${x}.`);
      }
      return val;
    };

    return {
      fn,
      expressionString: derivStr,
    };
  }

  // Case 4: JavaScript function passed without explicit derivative
  throw new Error(
    `Cannot symbolically differentiate a raw JavaScript function. Please provide explicit derivative option.`
  );
}
