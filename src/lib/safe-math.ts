/**
 * Safe math expression evaluator that doesn't use eval()
 * Supports: +, -, *, /, ^, %, parentheses, and scientific functions
 */

type Token = 
  | { type: 'number'; value: number }
  | { type: 'operator'; value: string }
  | { type: 'function'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

const FUNCTIONS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log10,
  ln: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};

const CONSTANTS: Record<string, number> = {
  π: Math.PI,
  pi: Math.PI,
  e: Math.E,
};

const OPERATORS: Record<string, { precedence: number; rightAssoc: boolean }> = {
  '+': { precedence: 1, rightAssoc: false },
  '-': { precedence: 1, rightAssoc: false },
  '*': { precedence: 2, rightAssoc: false },
  '/': { precedence: 2, rightAssoc: false },
  '%': { precedence: 2, rightAssoc: false },
  '^': { precedence: 3, rightAssoc: true },
};

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  // Normalize operators
  expr = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\*\*/g, '^');
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Numbers (including decimals)
    if (/[\d.]/.test(char)) {
      let numStr = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      const value = parseFloat(numStr);
      if (isNaN(value)) {
        throw new Error(`Invalid number: ${numStr}`);
      }
      tokens.push({ type: 'number', value });
      continue;
    }
    
    // Constants and functions
    if (/[a-zπ]/i.test(char)) {
      let name = '';
      while (i < expr.length && /[a-zπ]/i.test(expr[i])) {
        name += expr[i];
        i++;
      }
      
      const lowerName = name.toLowerCase();
      if (CONSTANTS[lowerName] !== undefined) {
        tokens.push({ type: 'number', value: CONSTANTS[lowerName] });
      } else if (FUNCTIONS[lowerName]) {
        tokens.push({ type: 'function', value: lowerName });
      } else {
        throw new Error(`Unknown identifier: ${name}`);
      }
      continue;
    }
    
    // Operators
    if (OPERATORS[char]) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }
    
    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    
    if (char === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }
    
    throw new Error(`Unexpected character: ${char}`);
  }
  
  return tokens;
}

// Shunting-yard algorithm to convert to RPN
function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const opStack: Token[] = [];
  
  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token);
    } else if (token.type === 'function') {
      opStack.push(token);
    } else if (token.type === 'operator') {
      const op1 = OPERATORS[token.value];
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if (top.type === 'operator') {
          const op2 = OPERATORS[top.value];
          if (
            (!op1.rightAssoc && op1.precedence <= op2.precedence) ||
            (op1.rightAssoc && op1.precedence < op2.precedence)
          ) {
            output.push(opStack.pop()!);
          } else {
            break;
          }
        } else {
          break;
        }
      }
      opStack.push(token);
    } else if (token.type === 'lparen') {
      opStack.push(token);
    } else if (token.type === 'rparen') {
      while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'lparen') {
        output.push(opStack.pop()!);
      }
      if (opStack.length === 0) {
        throw new Error('Mismatched parentheses');
      }
      opStack.pop(); // Remove lparen
      
      // If there's a function on top, pop it
      if (opStack.length > 0 && opStack[opStack.length - 1].type === 'function') {
        output.push(opStack.pop()!);
      }
    }
  }
  
  while (opStack.length > 0) {
    const top = opStack.pop()!;
    if (top.type === 'lparen' || top.type === 'rparen') {
      throw new Error('Mismatched parentheses');
    }
    output.push(top);
  }
  
  return output;
}

// Evaluate RPN
function evaluateRPN(rpn: Token[]): number {
  const stack: number[] = [];
  
  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(token.value);
    } else if (token.type === 'operator') {
      if (stack.length < 2) {
        throw new Error('Invalid expression');
      }
      const b = stack.pop()!;
      const a = stack.pop()!;
      let result: number;
      
      switch (token.value) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          result = a / b;
          break;
        case '%': result = a % b; break;
        case '^': result = Math.pow(a, b); break;
        default: throw new Error(`Unknown operator: ${token.value}`);
      }
      stack.push(result);
    } else if (token.type === 'function') {
      if (stack.length < 1) {
        throw new Error('Invalid expression');
      }
      const arg = stack.pop()!;
      const fn = FUNCTIONS[token.value];
      if (!fn) {
        throw new Error(`Unknown function: ${token.value}`);
      }
      stack.push(fn(arg));
    }
  }
  
  if (stack.length !== 1) {
    throw new Error('Invalid expression');
  }
  
  return stack[0];
}

/**
 * Safely evaluate a mathematical expression without using eval()
 * @param expr - The mathematical expression to evaluate
 * @returns The result of the evaluation
 * @throws Error if the expression is invalid
 */
export function safeMathEval(expr: string): number {
  if (!expr || expr.trim() === '') {
    return 0;
  }
  
  const tokens = tokenize(expr);
  const rpn = toRPN(tokens);
  return evaluateRPN(rpn);
}
