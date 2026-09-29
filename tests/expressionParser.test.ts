import { assertEquals, assert, assertAlmostEquals } from "jsr:@std/assert@1";
import { compileExpression } from "../src/math/expressionParser.ts";

Deno.test("ExpressionParser: Basic polynomial evaluation", () => {
  const { fn } = compileExpression("x^3 - 9x + 1");
  assertEquals(fn(0), 1);
  assertEquals(fn(2), 2**3 - 9*2 + 1); // 8 - 18 + 1 = -9
  assertEquals(fn(3), 3**3 - 9*3 + 1); // 27 - 27 + 1 = 1
});

Deno.test("ExpressionParser: Equation with = 0 format", () => {
  const { fn } = compileExpression("x^3 - 9x + 1 = 0");
  assertEquals(fn(2), -9);
  assertEquals(fn(3), 1);
});

Deno.test("ExpressionParser: Implicit multiplication cases", () => {
  const { fn: fn1 } = compileExpression("9x");
  assertEquals(fn1(3), 27);

  const { fn: fn2 } = compileExpression("4(x + 1)");
  assertEquals(fn2(2), 12);
});

Deno.test("ExpressionParser: Transcendental functions and constants", () => {
  const { fn: fnCos } = compileExpression("cos(x)");
  assertAlmostEquals(fnCos(0), 1.0, 1e-10);
  assertAlmostEquals(fnCos(Math.PI), -1.0, 1e-10);

  const { fn: fnExp } = compileExpression("exp(x)");
  assertAlmostEquals(fnExp(1), Math.E, 1e-10);
});

Deno.test("ExpressionParser: Slide 9 Q1 (x^3 - 4x - 9)", () => {
  const { fn } = compileExpression("x^3 - 4x - 9");
  // f(2) = 8 - 8 - 9 = -9
  assertEquals(fn(2), -9);
  // f(3) = 27 - 12 - 9 = 6
  assertEquals(fn(3), 6);
});

Deno.test("ExpressionParser: Syntax errors and invalid inputs", () => {
  let threwParen = false;
  try {
    compileExpression("(x + 2");
  } catch {
    threwParen = true;
  }
  assert(threwParen, "Should throw on unbalanced parentheses");

  let threwChar = false;
  try {
    compileExpression("x $ 2");
  } catch {
    threwChar = true;
  }
  assert(threwChar, "Should throw on illegal character");
});
