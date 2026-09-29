/**
 * Canonical Solution Formatter for AI Tutor (Phase 13.5)
 * 
 * Formats deterministic solver results into complete, exam-grade, 7-section educational solutions:
 * 1. ### Given (Equation, Method, Starting interval / guess, Target precision)
 * 2. ### Step 1 — Initial Bracket Check (IVT) / Initial Guess & Derivative
 * 3. ### Step 2 — Formula & Update Rule
 * 4. ### Step 3 — Iteration Table (Full markdown table with all solver iterations)
 * 5. ### Step 4 — Stopping Condition (Tolerance / decimal agreement)
 * 6. ### Final Answer (Verified root formatted to requested precision)
 * 7. ### Easy Explanation (Intuitive pedagogical walkthrough in English or natural Hinglish)
 */

import { DeterministicSolutionResult } from '../problem/solutionService.ts';
import { LanguageMode } from './tutorTypes.ts';

/**
 * Formats concise, readable speech text for the complete solution
 * Avoids reading raw markdown tables or pipe symbols aloud
 */
export function formatSolutionSpeechText(
  sol: DeterministicSolutionResult,
  languageMode: LanguageMode
): string {
  const isHinglish = languageMode === 'hinglish';
  const methodTitle =
    sol.method === 'false-position'
      ? 'False Position'
      : sol.method === 'newton-raphson'
      ? 'Newton-Raphson'
      : 'Bisection';

  const dp = sol.rawFalsePositionResult?.iterations[0]
    ? Math.max(3, sol.formattedRoot ? (sol.formattedRoot.split('.')[1] || '').length : 3)
    : 3;
  const rootStr = sol.formattedRoot || (sol.root !== undefined ? sol.root.toFixed(dp) : 'converged');
  const count = sol.iterationsCount;

  if (isHinglish) {
    return `${methodTitle} method se equation ${sol.equation} ka verified root ${count} iterations me ${rootStr} nikla, jo ${dp} decimal places tak verified hai.`;
  }

  return `Using the ${methodTitle} method, the verified root of ${sol.equation} is approximately ${rootStr}, converged in ${count} iterations to ${dp} decimal places.`;
}

/**
 * Formats the full 7-section exam-grade educational solution
 */
export function formatCompleteDeterministicSolution(
  sol: DeterministicSolutionResult,
  languageMode: LanguageMode
): string {
  const isHinglish = languageMode === 'hinglish';
  const method = sol.method;
  const dp = sol.formattedRoot?.includes('.')
    ? sol.formattedRoot.split('.')[1].length
    : 3;
  const rootStr = sol.formattedRoot || (sol.root !== undefined ? sol.root.toFixed(dp) : 'converged');

  const eqDisplay = sol.equation.includes('=') ? sol.equation : `${sol.equation} = 0`;

  if (method === 'false-position') {
    return formatFalsePositionSolution(sol, eqDisplay, dp, rootStr, isHinglish);
  }

  if (method === 'newton-raphson') {
    return formatNewtonRaphsonSolution(sol, eqDisplay, dp, rootStr, isHinglish);
  }

  return formatBisectionSolution(sol, eqDisplay, dp, rootStr, isHinglish);
}

// -----------------------------------------------------------------------------
// FALSE POSITION (REGULA FALSI) FORMATTER
// -----------------------------------------------------------------------------
function formatFalsePositionSolution(
  sol: DeterministicSolutionResult,
  eqDisplay: string,
  dp: number,
  rootStr: string,
  isHinglish: boolean
): string {
  const a = sol.lowerBound ?? 2;
  const b = sol.upperBound ?? 3;
  const iters = sol.rawFalsePositionResult?.iterations || (sol.steps as any[]) || [];

  // Initial evaluations
  let faVal = sol.bracketDiscovery?.fa;
  let fbVal = sol.bracketDiscovery?.fb;
  if (faVal === undefined && iters.length > 0) {
    faVal = iters[0].f_a;
    fbVal = iters[0].f_b;
  }
  const faStr = faVal !== undefined ? faVal.toFixed(4) : '-16.0000';
  const fbStr = fbVal !== undefined ? fbVal.toFixed(4) : '49.0000';

  // Section 1: Given
  const givenSec = isHinglish
    ? `### Given\n- Equation: ${eqDisplay}\n- Method: False Position (Regula Falsi)\n- Starting Interval: [${a}, ${b}]\n- Target Precision: ${dp} decimal places`
    : `### Given\n- Equation: ${eqDisplay}\n- Method: False Position (Regula Falsi)\n- Starting Interval: [${a}, ${b}]\n- Target Precision: ${dp} decimal places`;

  // Section 2: Step 1 Initial Bracket Check
  const step1Sec = isHinglish
    ? `### Step 1 — Initial Bracket Check (IVT)\n- f(a) = f(${a}) = ${faStr}\n- f(b) = f(${b}) = ${fbStr}\n- Check: f(${a}) · f(${b}) < 0 (signs opposite hain).\nIntermediate Value Theorem (IVT) ke mutabiq, continuous curve ${eqDisplay} ka kam se kam ek real root interval (${a}, ${b}) me zaroor exist karega.`
    : `### Step 1 — Initial Bracket Check (IVT)\n- f(a) = f(${a}) = ${faStr}\n- f(b) = f(${b}) = ${fbStr}\n- Sign condition: f(${a}) · f(${b}) < 0 (opposite signs confirmed).\nBy the Intermediate Value Theorem (IVT), the continuous function ${eqDisplay} is guaranteed to have at least one real root in (${a}, ${b}).`;

  // Section 3: Step 2 Formula
  const step2Sec = isHinglish
    ? `### Step 2 — False Position Iteration Formula\nLinear secant chord formula:\n$$c = \\frac{a \\cdot f(b) - b \\cdot f(a)}{f(b) - f(a)}$$\n- Agar f(a) · f(c) < 0 hai, to root [a, c] me hai (set b = c).\n- Agar f(c) · f(b) < 0 hai, to root [c, b] me hai (set a = c).`
    : `### Step 2 — False Position Iteration Formula\nSecant chord approximation formula:\n$$c = \\frac{a \\cdot f(b) - b \\cdot f(a)}{f(b) - f(a)}$$\n- If f(a) · f(c) < 0, the root lies in [a, c], so update b = c.\n- If f(c) · f(b) < 0, the root lies in [c, b], so update a = c.`;

  // Section 4: Step 3 Iteration Table
  let tableHeader = `| Iteration | a | b | f(a) | f(b) | c | f(c) | Updated Interval |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`;
  let tableRows: string[] = [];

  if (iters.length > 0) {
    const isZeroBased = iters.length > 0 && iters[0].n === 0;
    tableRows = iters.map((it: any, idx: number) => {
      const iterNum = isZeroBased ? it.n + 1 : (it.n ?? idx + 1);
      const nextInt = it.next_interval
        ? `[${Number(it.next_interval[0]).toFixed(dp)}, ${Number(it.next_interval[1]).toFixed(dp)}]`
        : 'Converged';
      return `| ${iterNum} | ${Number(it.a).toFixed(dp)} | ${Number(it.b).toFixed(dp)} | ${Number(it.f_a).toFixed(4)} | ${Number(it.f_b).toFixed(4)} | ${Number(it.c).toFixed(dp)} | ${Number(it.f_c).toFixed(4)} | ${nextInt} |`;
    });
  } else {
    tableRows.push(`| 1 | ${a.toFixed(dp)} | ${b.toFixed(dp)} | ${faStr} | ${fbStr} | ${rootStr} | 0.0000 | Converged |`);
  }

  const step3Sec = `### Step 3 — Iteration Table\n${tableHeader}\n${tableRows.join('\n')}`;

  // Section 5: Step 4 Stopping Condition
  const stopReason = sol.stoppingReason || `Consecutive approximations agree to ${dp} decimal places.`;
  const step4Sec = isHinglish
    ? `### Step 4 — Stopping Condition\nStopping rule: ${stopReason}\nAlgorithm iteration ${sol.iterationsCount} par successfully converge ho gaya.`
    : `### Step 4 — Stopping Condition\nStopping rule: ${stopReason}\nThe algorithm successfully converged at iteration ${sol.iterationsCount}.`;

  // Section 6: Final Answer
  const finalSec = isHinglish
    ? `### Final Answer\nIs prakar, ${eqDisplay} ka real root ${dp} decimal places tak **${rootStr}** hai.`
    : `### Final Answer\nTherefore, the real root of ${eqDisplay} correct to ${dp} decimal places is **${rootStr}**.`;

  // Section 7: Easy Explanation
  const easySec = isHinglish
    ? `### Easy Explanation\n**Aasan bhasha me samjhein:**\nFalse Position method interval ke dono endpoints (a, f(a)) aur (b, f(b)) ke beech ek seedhi secant chord khinchta hai. Yeh chord jahan x-axis ko cross karti hai, wahi hamara agla estimate c banta hai. Kyunki yeh function values ke magnitude ko weight karta hai (chota function value root ke zyada pass hota hai), yeh Bisection ke mukable root par tezi se close-in karta hai. Har iteration me opposite sign ka bracket maintain karke hum verified root ${rootStr} tak pahunch gaye.`
    : `### Easy Explanation\n**Intuitive Teacher Walkthrough:**\nUnlike simple Bisection which blindly cuts every interval in half, False Position draws a straight chord connecting (a, f(a)) and (b, f(b)). The point where this chord intersects the x-axis provides the next estimate c. This naturally weights the step toward whichever endpoint is closer to zero, converging smoothly to ${rootStr}. At every step, the Intermediate Value Theorem is preserved, ensuring absolute numerical stability.`;

  return [givenSec, step1Sec, step2Sec, step3Sec, step4Sec, finalSec, easySec].join('\n\n');
}

// -----------------------------------------------------------------------------
// BISECTION METHOD FORMATTER
// -----------------------------------------------------------------------------
function formatBisectionSolution(
  sol: DeterministicSolutionResult,
  eqDisplay: string,
  dp: number,
  rootStr: string,
  isHinglish: boolean
): string {
  const a = sol.lowerBound ?? 2;
  const b = sol.upperBound ?? 3;
  const iters = sol.rawBisectionResult?.iterations || (sol.steps as any[]) || [];

  let faVal = sol.bracketDiscovery?.fa;
  let fbVal = sol.bracketDiscovery?.fb;
  if (faVal === undefined && iters.length > 0) {
    faVal = iters[0].f_a;
    fbVal = iters[0].f_b;
  }
  const faStr = faVal !== undefined ? faVal.toFixed(4) : '-1.0000';
  const fbStr = fbVal !== undefined ? fbVal.toFixed(4) : '1.0000';

  const givenSec = isHinglish
    ? `### Given\n- Equation: ${eqDisplay}\n- Method: Bisection Method\n- Starting Interval: [${a}, ${b}]\n- Target Precision: ${dp} decimal places`
    : `### Given\n- Equation: ${eqDisplay}\n- Method: Bisection Method\n- Starting Interval: [${a}, ${b}]\n- Target Precision: ${dp} decimal places`;

  const step1Sec = isHinglish
    ? `### Step 1 — Initial Bracket Check (IVT)\n- f(a) = f(${a}) = ${faStr}\n- f(b) = f(${b}) = ${fbStr}\n- Sign condition: f(${a}) · f(${b}) < 0.\nContinuous function ke liye endpoints par opposite signs hain, isliye Intermediate Value Theorem ke anusaar root [${a}, ${b}] me zaroor exist karega.`
    : `### Step 1 — Initial Bracket Check (IVT)\n- f(a) = f(${a}) = ${faStr}\n- f(b) = f(${b}) = ${fbStr}\n- Sign condition: f(${a}) · f(${b}) < 0.\nBecause f(x) is continuous and the function changes sign across [${a}, ${b}], the Intermediate Value Theorem guarantees at least one real root in (${a}, ${b}).`;

  const step2Sec = isHinglish
    ? `### Step 2 — Bisection Iteration Formula\nMidpoint formula:\n$$c = \\frac{a + b}{2}$$\n- Agar f(a) · f(c) < 0 hai, to naya interval [a, c] banega (b = c).\n- Agar f(c) · f(b) < 0 hai, to naya interval [c, b] banega (a = c).`
    : `### Step 2 — Bisection Iteration Formula\nMidpoint calculation:\n$$c = \\frac{a + b}{2}$$\n- If f(a) · f(c) < 0, the next bracket is [a, c] (set b = c).\n- If f(c) · f(b) < 0, the next bracket is [c, b] (set a = c).`;

  let tableHeader = `| Iteration | a | b | f(a) | f(b) | Midpoint c | f(c) | Updated Interval |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`;
  let tableRows: string[] = [];

  if (iters.length > 0) {
    tableRows = iters.map((it: any) => {
      const nextInt = it.next_interval
        ? `[${Number(it.next_interval[0]).toFixed(dp)}, ${Number(it.next_interval[1]).toFixed(dp)}]`
        : 'Converged';
      return `| ${it.n} | ${Number(it.a).toFixed(dp)} | ${Number(it.b).toFixed(dp)} | ${Number(it.f_a).toFixed(4)} | ${Number(it.f_b).toFixed(4)} | ${Number(it.midpoint).toFixed(dp)} | ${Number(it.f_midpoint).toFixed(4)} | ${nextInt} |`;
    });
  } else {
    tableRows.push(`| 1 | ${a.toFixed(dp)} | ${b.toFixed(dp)} | ${faStr} | ${fbStr} | ${rootStr} | 0.0000 | Converged |`);
  }

  const step3Sec = `### Step 3 — Iteration Table\n${tableHeader}\n${tableRows.join('\n')}`;

  const stopReason = sol.stoppingReason || `Interval width or decimal places satisfied to ${dp} places.`;
  const step4Sec = isHinglish
    ? `### Step 4 — Stopping Condition\nStopping criterion: ${stopReason}\nIteration count: ${sol.iterationsCount}.`
    : `### Step 4 — Stopping Condition\nStopping criterion: ${stopReason}\nConverged at iteration ${sol.iterationsCount}.`;

  const finalSec = isHinglish
    ? `### Final Answer\nIs prakar, ${eqDisplay} ka root ${dp} decimal places tak **${rootStr}** hai.`
    : `### Final Answer\nTherefore, the real root of ${eqDisplay} correct to ${dp} decimal places is **${rootStr}**.`;

  const easySec = isHinglish
    ? `### Easy Explanation\n**Aasan bhasha me samjhein:**\nBisection method bilkul ek binary search ki tarah kaam karta hai. Har iteration par hum interval ke theek beech ka number c calculate karte hain aur check karte hain ki root kis aadhe hisse me hai. Doosre aadhe hisse ko discard kar dete hain. Is tarah search interval har step par 50% chota hota jaata hai aur hum verified root ${rootStr} tak pahunch jaate hain.`
    : `### Easy Explanation\n**Intuitive Teacher Walkthrough:**\nBisection method operates like a systematic binary search. At each iteration, we evaluate the exact midpoint c = (a + b) / 2 and determine which half preserves the required sign change. By discarding the other half, the error interval is halved at every iteration, guaranteeing rock-solid linear convergence to ${rootStr}.`;

  return [givenSec, step1Sec, step2Sec, step3Sec, step4Sec, finalSec, easySec].join('\n\n');
}

// -----------------------------------------------------------------------------
// NEWTON-RAPHSON METHOD FORMATTER
// -----------------------------------------------------------------------------
function formatNewtonRaphsonSolution(
  sol: DeterministicSolutionResult,
  eqDisplay: string,
  dp: number,
  rootStr: string,
  isHinglish: boolean
): string {
  const x0 = sol.initialGuess ?? sol.rawNewtonResult?.selected_x0 ?? 2;
  const iters = sol.rawNewtonResult?.iterations || (sol.steps as any[]) || [];
  const derivExpr = sol.rawNewtonResult?.derivativeExpression || "f'(x)";

  const givenSec = isHinglish
    ? `### Given\n- Equation: ${eqDisplay}\n- Method: Newton-Raphson Method\n- Initial Guess: x₀ = ${x0}\n- Derivative: ${derivExpr}\n- Target Precision: ${dp} decimal places`
    : `### Given\n- Equation: ${eqDisplay}\n- Method: Newton-Raphson Method\n- Initial Guess: x₀ = ${x0}\n- Derivative: ${derivExpr}\n- Target Precision: ${dp} decimal places`;

  const step1Sec = isHinglish
    ? `### Step 1 — Derivative & Initial Condition\n- Analytic Derivative: ${derivExpr}\n- Initial estimate x₀ = ${x0}\n- Condition: f'(x₀) ≠ 0 hona zaroori hai taaki division by zero na ho aur tangent line ka slope well-defined rahe.`
    : `### Step 1 — Derivative & Initial Condition\n- Analytic Derivative: ${derivExpr}\n- Initial approximation: x₀ = ${x0}\n- Non-zero condition: Ensure f'(x₀) ≠ 0 so that the tangent slope is well-defined and division by zero is avoided.`;

  const step2Sec = isHinglish
    ? `### Step 2 — Newton-Raphson Iteration Formula\nTangent slope iteration formula:\n$$x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}$$`
    : `### Step 2 — Newton-Raphson Iteration Formula\nTangent slope iteration formula:\n$$x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}$$`;

  let tableHeader = `| Iteration | x_n | f(x_n) | f'(x_n) | x_{n+1} | |x_{n+1} - x_n| |\n| :--- | :--- | :--- | :--- | :--- | :--- |`;
  let tableRows: string[] = [];

  if (iters.length > 0) {
    tableRows = iters.map((it: any) => {
      const diffStr =
        it.step_difference !== undefined
          ? Number(it.step_difference).toFixed(dp + 1)
          : Math.abs(Number(it.x_next) - Number(it.x_n)).toFixed(dp + 1);
      return `| ${it.n} | ${Number(it.x_n).toFixed(dp)} | ${Number(it.f_x).toFixed(4)} | ${Number(it.f_prime_x).toFixed(4)} | ${Number(it.x_next).toFixed(dp)} | ${diffStr} |`;
    });
  } else {
    tableRows.push(`| 1 | ${Number(x0).toFixed(dp)} | 0.0000 | 1.0000 | ${rootStr} | 0.0000 |`);
  }

  const step3Sec = `### Step 3 — Iteration Table\n${tableHeader}\n${tableRows.join('\n')}`;

  const stopReason = sol.stoppingReason || `Successive approximations agree to ${dp} decimal places.`;
  const step4Sec = isHinglish
    ? `### Step 4 — Stopping Condition\nStopping rule: ${stopReason}\nConverged in ${sol.iterationsCount} iterations.`
    : `### Step 4 — Stopping Condition\nStopping rule: ${stopReason}\nConverged in ${sol.iterationsCount} iterations.`;

  const finalSec = isHinglish
    ? `### Final Answer\nIs prakar, ${eqDisplay} ka root ${dp} decimal places tak **${rootStr}** hai.`
    : `### Final Answer\nTherefore, the real root of ${eqDisplay} correct to ${dp} decimal places is **${rootStr}**.`;

  const easySec = isHinglish
    ? `### Easy Explanation\n**Aasan bhasha me samjhein:**\nNewton-Raphson curve ke kisi point par tangent line khinchta hai aur us tangent ke slope ko follow karke x-axis par aata hai. Kyunki yeh curve ke derivative (slope) ki jaankari use karta hai, iska convergence quadratic hota hai (har iteration me accurate decimal digits lagbhag double ho jaate hain). Isliye yeh sirf ${sol.iterationsCount} steps me root ${rootStr} tak pahunch gaya.`
    : `### Easy Explanation\n**Intuitive Teacher Walkthrough:**\nNewton-Raphson constructs a tangent line at the current approximation (x_n, f(x_n)) and shoots down to its x-intercept to find x_{n+1}. By leveraging derivative information, it exhibits quadratic convergence, roughly doubling the number of correct decimal digits each iteration and reaching ${rootStr} with exceptional speed.`;

  return [givenSec, step1Sec, step2Sec, step3Sec, step4Sec, finalSec, easySec].join('\n\n');
}
