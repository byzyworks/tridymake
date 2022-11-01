import { isArray, isNullish } from '../../common.js';
import * as mapped            from '../../mapped.js';

export class Token {
    constructor(type, value, debug = { }) {
        this.type  = type;
        this.value = value;
        this.debug = debug;
        if (!debug.type) {
            this.debug.type  = this.type;
            this.debug.value = this.value;
        }
    }
    
    is(type = null, value = null) {
        if (!isArray(type)) {
            return (((this.type === type) || (type === null)) && ((this.value === value) || (value === null)));
        }
        for (const sub of type) {
            if ((this.type === sub) || (sub === null)) {
                return ((this.value === value) || (value === null));
            }
        }
        return false;
    }

    isStringToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD) ||
            this.is(mapped.TOKEN_KEY.STRING)
        ;
    }

    isStringFeedStartToken() {
        return false ||
            this.isStringToken() ||
            this.is(null, mapped.GENERAL_SYNTAX.MAPPING_MARK)
        ;
    }

    isDataStartToken() {
        return false ||
            this.isStringFeedStartToken() ||
            this.is(null, mapped.GENERAL_SYNTAX.KEYVALUE_START)
        ;
    }

    isUnaryOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.NOT)
        ;
    }

    isExpressionTerminalToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD) ||
            this.is(null, mapped.EXPRESSION.WILDCARD)
        ;
    }

    isExpressionStartToken() {
        return false ||
            this.isExpressionTerminalToken() ||
            this.isUnaryOperatorExpressionToken() ||
            this.is(null, mapped.EXPRESSION.LEFT_PARENTHESES) ||
            this.is(null, mapped.EXPRESSION.VALUE_EXPRESSION_START)
        ;
    }

    isExpressionEndToken() {
        return false ||
            this.isExpressionTerminalToken() ||
            this.is(null, mapped.EXPRESSION.RIGHT_PARENTHESES) ||
            this.is(null, mapped.EXPRESSION.VALUE_EXPRESSION_START)
        ;
    }

    isBasicBinaryOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.AND) ||
            this.is(null, mapped.EXPRESSION.XOR) ||
            this.is(null, mapped.EXPRESSION.OR) ||
            this.is(null, mapped.EXPRESSION.OR_LOW_PRECEDENCE)
        ;
    }

    isLookaheadNestedOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.LOOKAHEAD) ||
            this.is(null, mapped.EXPRESSION.RECURSIVE_LOOKAHEAD) ||
            this.is(null, mapped.EXPRESSION.INVERSE_LOOKAHEAD) ||
            this.is(null, mapped.EXPRESSION.INVERSE_RECURSIVE_LOOKAHEAD)
        ;
    }

    isLookbehindNestedOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.LOOKBEHIND) ||
            this.is(null, mapped.EXPRESSION.RECURSIVE_LOOKBEHIND) ||
            this.is(null, mapped.EXPRESSION.INVERSE_LOOKBEHIND) ||
            this.is(null, mapped.EXPRESSION.INVERSE_RECURSIVE_LOOKBEHIND)
        ;
    }

    isLookaroundOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.LOOKAROUND) ||
            this.is(null, mapped.EXPRESSION.INVERSE_LOOKAROUND)
        ;
    }

    isNonTransitiveNestedOperatorExpressionToken() {
        return false ||
            this.isLookaheadNestedOperatorExpressionToken() ||
            this.isLookbehindNestedOperatorExpressionToken()
        ;
    }

    isForwardTransitiveNestedOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.FORWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.CHAINED_FORWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.RECURSIVE_FORWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.INCLUSIVE_FORWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.INCLUSIVE_CHAINED_FORWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.INCLUSIVE_RECURSIVE_FORWARD_TRANSITION)
        ;
    }

    isBackwardTransitiveNestedOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.BACKWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.CHAINED_BACKWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.RECURSIVE_BACKWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.INCLUSIVE_BACKWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.INCLUSIVE_CHAINED_BACKWARD_TRANSITION) ||
            this.is(null, mapped.EXPRESSION.INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION)
        ;
    }

    isTransitiveNestedOperatorExpressionToken() {
        return false ||
            this.isForwardTransitiveNestedOperatorExpressionToken() ||
            this.isBackwardTransitiveNestedOperatorExpressionToken()
        ;
    }

    isNestedOperatorExpressionToken() {
        return false ||
            this.isNonTransitiveNestedOperatorExpressionToken() ||
            this.isTransitiveNestedOperatorExpressionToken()
        ;
    }

    isBinaryTagOperatorExpressionToken() {
        return false ||
            this.isBasicBinaryOperatorExpressionToken() ||
            this.isNestedOperatorExpressionToken() ||
            this.isLookaroundOperatorExpressionToken()
        ;
    }

    isBinaryValueOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.EQUAL_TO) ||
            this.is(null, mapped.EXPRESSION.NOT_EQUAL_TO) ||
            this.is(null, mapped.EXPRESSION.LESS_THAN) ||
            this.is(null, mapped.EXPRESSION.LESS_THAN_OR_EQUAL_TO) ||
            this.is(null, mapped.EXPRESSION.GREATER_THAN) ||
            this.is(null, mapped.EXPRESSION.GREATER_THAN_OR_EQUAL_TO)
        ;
    }

    isBinaryOperatorExpressionToken() {
        return false ||
            this.isBinaryTagOperatorExpressionToken() ||
            this.isBinaryValueOperatorExpressionToken()
        ;
    }

    isTernaryFirstOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.TERNARY_1) ||
            this.is(null, mapped.EXPRESSION.TERNARY_LOW_PRECEDENCE_1)
        ;
    }

    isTernarySecondOperatorExpressionToken() {
        return false ||
            this.is(null, mapped.EXPRESSION.TERNARY_2) ||
            this.is(null, mapped.EXPRESSION.TERNARY_LOW_PRECEDENCE_2)
        ;
    }

    isTernaryOperatorExpressionToken() {
        return false ||
            this.isTernaryFirstOperatorExpressionToken() ||
            this.isTernarySecondOperatorExpressionToken()
        ;
    }

    isTagOperatorExpressionToken() {
        return false ||
            this.isUnaryOperatorExpressionToken() ||
            this.isBinaryTagOperatorExpressionToken() ||
            this.isTernaryFirstOperatorExpressionToken() ||
            this.isTernarySecondOperatorExpressionToken()
        ;
    }

    isOperatorExpressionToken() {
        return false ||
            this.isTagOperatorExpressionToken() ||
            this.isBinaryValueOperatorExpressionToken()
        ;
    }

    isNewModuleOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.APPEND_MODULE) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.PRECEDE_MODULE) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.SUCCEED_MODULE) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.OVERWRITE_MODULE) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.EDIT_MODULE)
        ;
    }

    isVariableOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.DECLARE_VARIABLE) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.EDIT_VARIABLE)
        ;
    }

    isConditionOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONDITION_SUCCESS) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONDITION_FAILURE)
        ;
    }

    isLoopOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.LOOP)
        ;
    }

    isBlockOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.BLOCK) ||
            this.isConditionOperationToken() ||
            this.isLoopOperationToken() ||
            this.is(mapped.TOKEN_KEY.SYMBOL, mapped.OPERATION.CHANGE_CONTEXT)
        ;
    }

    isLabelOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONTROL_SKIP_TO_LABEL) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONTROL_LABEL)
        ;
    }

    isConsoleOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONSOLE_CLEAR_OUTPUT) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONSOLE_EXIT)
        ;
    }

    isControlOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.NOP) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.DELETE_MODULE) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.EDIT_METADATA) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.DELETE_METADATA) ||
            this.isVariableOperationToken() ||
            this.isLabelOperationToken() ||
            this.isConsoleOperationToken()
        ;
    }

    isOperationToken() {
        return false ||
            this.isSourceModeOperationToken() ||
            this.isSinkModeOperationToken() ||
            this.isBlockOperationToken() ||
            this.isControlOperationToken()
        ;
    }

    isSourceModeOperationToken() {
        return false ||
            this.isNewModuleOperationToken()
        ;
    }

    isSinkModeOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.OUTPUT_MODULE)
        ;
    }

    isDataMetadataSyntaxOperationToken() {
        return false ||
            this.isNewModuleOperationToken() ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.OUTPUT_MODULE)
        ;
    }

    isKeyValueSyntaxOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.EDIT_METADATA) ||
            this.isVariableOperationToken()
        ;
    }

    isKeySyntaxOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.DELETE_METADATA)
        ;
    }

    isWordExpressionLoopSyntaxOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.LOOP)
        ;
    }

    isExpressionLoopSyntaxOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.SYMBOL, mapped.OPERATION.CHANGE_CONTEXT)
        ;
    }

    isExpressionOnlySyntaxOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONDITION_SUCCESS) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONDITION_FAILURE)
        ;
    }

    isWordOnlySyntaxOperationToken() {
        return false ||
            this.isLabelOperationToken()
        ;
    }

    isLonelySyntaxOperationToken() {
        return false ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.NOP) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.BLOCK) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONSOLE_CLEAR_OUTPUT) ||
            this.is(mapped.TOKEN_KEY.WORD, mapped.OPERATION.CONSOLE_EXIT)
        ;
    }

    isStatementEndToken() {
        return false ||
            this.is(null, mapped.GENERAL_SYNTAX.STATEMENT_END) ||
            this.is(null, mapped.GENERAL_SYNTAX.NESTED_END)
        ;
    }

    isSocketStartToken() {
        return false ||
            this.is(null, mapped.GENERAL_SYNTAX.EMPLACEMENT) ||
            this.is(null, mapped.GENERAL_SYNTAX.NESTED_START)
        ;
    }

    isSocketEndToken() {
        return false ||
            this.isStatementEndToken() ||
            this.isSocketStartToken()
        ;
    }

    /**
     * Using this as opposed to just creating a new token with the same type and value is useful because the debug information remains the same as the token created from.
     * This is useful for creating program-internal tokens that, when there is a problem related to them, the debug output can link back to the user-created token it was generated from.
     * The alternative is confusing the user with a token they never actually put in.
     */
    to(type, val, opts = { }) {
        opts.in_place = opts.in_place ?? false;

        if (opts.in_place) {
            this.type = type;
            this.value  = val;
        } else {
            return new Token(type, val, this.debug);
        }
    }

    static getPosString(pos) {
        let str = '';

        if (!isNullish(pos.filepath)) {
            str += `${pos.filepath}, `;
        }
        str += `line ${pos.line}, col ${pos.col}`;

        return str;
    }
}
