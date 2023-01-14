import * as mapped from '../mapped.js';

import { Stack } from '../instance/Stack.js';
import { Queue } from '../instance/Queue.js';

import { DepthMarkerSet } from '../instance/stage-2_parsing/DepthMarkerSet.js';
import { ExpressionNode } from '../instance/stage-2_parsing/ExpressionNode.js';
import { Token }          from '../instance/stage-1_lexing/Token.js'

export class ExpressionParser {
    constructor() { }

    /**
     * This method is designed according to the Shunting-Yard algorithm for converting infix expressions to postfix. Refer to it better understand the algorithm below.
     * Postfix is much easier to parse algorithmically since operands can be grabbed at will from a stack when an operator is encountered, and don't need to be parsed out-of-order.
     * (In other words, no need for parentheses).
     */
    static _toPostfix(input) {
        const out = new Queue();
        const ops = new Stack();

        for (const item of input) {
            if ((item instanceof ExpressionNode) || item.isExpressionTerminalToken()) {
                out.enqueue(item);
            } else if (item.is(null, mapped.EXPRESSION.LEFT_PARENTHESES)) {
                ops.push(item);
            } else if (item.is(null, mapped.EXPRESSION.RIGHT_PARENTHESES)) {
                while (!ops.isEmpty() && !ops.peek().is(null, mapped.EXPRESSION.LEFT_PARENTHESES)) {
                    out.enqueue(ops.pop());
                }
                ops.pop();
            } else if (item.isTagOperatorExpressionToken()) {
                while (!ops.isEmpty() && !ops.peek().is(null, mapped.EXPRESSION.LEFT_PARENTHESES) && (mapped.PRECEDENCE[ops.peek().value] < mapped.PRECEDENCE[item.value])) {
                    out.enqueue(ops.pop());
                }
                ops.push(item);
            }
        }

        while (!ops.isEmpty()) {
            out.enqueue(ops.pop());
        }

        return out;
    }
    
    /**
     * The now-postfix expression is converted to a tree afterwards.
     * This is done for the composer's sake, which tests the expressions contained in the tree recursively.
     * Having the composer use the postfix array directly was the original intention.
     * This idea was scrapped because the operator type in Tridy can change how a sub-expression is to be evaluated.
     * The transitive operators notably force the second operand to be evaluated at a nesting level above or below the current one.
     * The postfix array makes this difficult because the operator isn't reached until both operands are already evaluated and reduced to booleans.
     * Having a tree gives much greater flexibility over when and how to evaluate operands (and is easier to read, generally).
     */
    static _toTree(postfix) {
        const out = new Stack();

        while (!postfix.isEmpty()) {
            let current = postfix.dequeue();
            if (current instanceof ExpressionNode) {
                out.push(current);
            } else if (current.isExpressionTerminalToken()) {
                out.push(new ExpressionNode(current.value));
            } else if (current.isUnaryOperatorExpressionToken()) {
                const a = out.pop();

                out.push(new ExpressionNode(a, { op: current.value }));
            } else if (current.isBinaryOperatorExpressionToken()) {
                const b = out.pop();
                const a = out.pop();

                out.push(new ExpressionNode(a, { op: current.value, b: b }));
            } else if (current.isTernarySecondOperatorExpressionToken()) {
                const op = postfix.dequeue().value; // Removes the question mark (already syntax-checked)

                const c = out.pop();
                const b = out.pop();
                const a = out.pop();

                out.push(new ExpressionNode(a, { op: op, b: b, c: c }));
            }
        }

        return out.pop();
    }

    /**
     * Adding "position helpers" to the expression's terminals is to determine which sub-expressions are "intermediate" (like a in "a/b") of "final" (like b in "a/b").
     * We want to verify, in addition to if an expression matches, that the expression also reaches the last element of the current module's context.
     * If whether it reaches the last element or not isn't verified, then the expression becomes true not only for the module, but also all of its sub-modules.
     * We want "a/b" to change "a/b", but not "a/b/c" as well, even though "a/b" is all true for the first part of "a/b/c"'s context.
     * That's also because it may be that we're testing the expression against a module with the context "a/b/c", and not "a/b".
     * Fortunately, it's easy from the expression to determine if a terminal is final or not, based on it containing sub-expressions with transitive operators.
     * It can be made a requirement specifically that "final" terminals are evathis._tokens.next();luated at a last level of the context being evaluated, and not before or after.
     */
    static _createPositionHelpers(expression) {
        if (expression.isTerminal()) {
            expression.depth = new DepthMarkerSet();
            expression.depth.add(0);
        } else {
            const token = new Token(null, expression.op);

            let a;
            if (expression.a instanceof ExpressionNode) {
                a = this._createPositionHelpers(expression.a);

                if (token.isUnaryOperatorExpressionToken()) {
                    expression.depth = a;

                    return expression.depth;
                }
            }

            let b;
            if (expression.b instanceof ExpressionNode) {
                expression.depth = new DepthMarkerSet();

                b = this._createPositionHelpers(expression.b);

                if (token.isForwardTransitiveNestedOperatorExpressionToken()) {
                    if (token.isRecursiveForwardTransitiveNestedOperatorExpressionToken()) {
                        expression.depth.setUpper(b.getMinimum() + 1);
                    } else {
                        b = b.copy();
                        b.offset(1);
                        expression.depth.merge(b);
                    }
                } else if (token.isBackwardTransitiveNestedOperatorExpressionToken()) {
                    if (token.isRecursiveBackwardTransitiveNestedOperatorExpressionToken()) {
                        expression.depth.setLower(b.getMinimum() - 1);
                    } else {
                        b = b.copy();
                        b.offset(-1);
                        expression.depth.merge(b);
                    }
                } else {
                    a.forEach((result) => {
                        expression.depth.add(result);
                    });
                    b.forEach((result) => {
                        expression.depth.add(result);
                    });
                }

                if (token.isBinaryOperatorExpressionToken()) {
                    return expression.depth;
                }
            }

            let c;
            if (expression.c instanceof ExpressionNode) {
                c = this._createPositionHelpers(expression.c);

                for (const result of c) {
                    expression.depth.push(result);
                }

                if (token.isBinaryOperatorExpressionToken()) {
                    return expression.depth;
                }
            }
        }

        return expression.depth;
    }

    static parse(input) {
        input = this._toPostfix(input);
        input = this._toTree(input);
        
        //this._createPositionHelpers(input, null);

        return input;
    }
}
