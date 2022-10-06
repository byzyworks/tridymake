import { isArray, isNullish } from '../common.js';
import * as mapped            from '../mapped.js';

export class Token {
    constructor(type, val, debug = { }) {
        this.type  = type;
        this.val   = val;
        this.debug = debug;
        if (!debug.type) {
            this.debug.type = this.type;
            this.debug.val  = this.val;
        }
    }

    getTokenType() {
        return this.type;
    }

    getTokenValue() {
        return this.val;
    }

    is(type = null, value = null) {
        if (!isArray(type)) {
            return (((this.type === type) || (type === null)) && ((this.val === value) || (value === null)));
        }
        for (const sub of type) {
            if ((this.type === sub) || (sub === null)) {
                return ((this.val === value) || (value === null));
            }
        }
        return false;
    }

    isUnaryOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.NOT)
        ;
    }

    isIdentifierTerminalContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.TAGLIKE)
        ;
    }

    isExpressionStarterContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.TAGLIKE) ||
            this.isUnaryOpContextToken() ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.MISCELLANEOUS, mapped.CONTEXT_MAP.LEFT_PARENTHESES) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.MISCELLANEOUS, mapped.CONTEXT_MAP.VALUE_SYMBOL)
        ;
    }

    isExpressionEnderContextToken() {
        return false ||
            this.isIdentifierTerminalContextToken() ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.MISCELLANEOUS, mapped.CONTEXT_MAP.RIGHT_PARENTHESES)
        ;
    }

    isBasicBinaryOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.AND) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.XOR) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.OR)
        ;
    }

    isLookaheadNestedOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LOOKAHEAD) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.RECURSIVE_LOOKAHEAD) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_LOOKAHEAD) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD)
        ;
    }

    isLookbehindNestedOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LOOKBEHIND) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.RECURSIVE_LOOKBEHIND) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_LOOKBEHIND) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND)
        ;
    }

    isLookaroundNestedOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LOOKAROUND) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_LOOKAROUND)
        ;
    }

    isNonTransitiveNestedOpContextToken() {
        return false ||
            this.isLookaheadNestedOpContextToken() ||
            this.isLookbehindNestedOpContextToken() ||
            this.isLookaroundNestedOpContextToken()
        ;
    }

    isForwardTransitiveNestedOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.FORWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.CHAINED_FORWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.RECURSIVE_FORWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_FORWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_CHAINED_FORWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_FORWARD_TRANSITION)
        ;
    }

    isBackwardTransitiveNestedOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.BACKWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.CHAINED_BACKWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.RECURSIVE_BACKWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_BACKWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_CHAINED_BACKWARD_TRANSITION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION)
        ;
    }

    isTransitiveNestedOpContextToken() {
        return false ||
            this.isForwardTransitiveNestedOpContextToken() ||
            this.isBackwardTransitiveNestedOpContextToken()
        ;
    }

    isNestedOpContextToken() {
        return false ||
            this.isNonTransitiveNestedOpContextToken() ||
            this.isTransitiveNestedOpContextToken()
        ;
    }

    isBinaryTagOpContextToken() {
        return false ||
            this.isBasicBinaryOpContextToken() ||
            this.isNestedOpContextToken()
        ;
    }

    isBinaryValueComparisonOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.EQUAL_TO_INTERNAL) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.NOT_EQUAL_TO_INTERNAL) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LESS_THAN_INTERNAL) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO_INTERNAL) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.GREATER_THAN_INTERNAL) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO_INTERNAL)
        ;
    }

    isBinaryValueArithmeticOpContextToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.ADD) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.SUBTRACT) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.MULTIPLY) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.DIVIDE) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.MODULUS) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.EXPONENT)
        ;
    }

    isBinaryValueOpContextToken() {
        return false ||
            this.isBinaryValueComparisonOpContextToken() ||
            this.isBinaryValueArithmeticOpContextToken()
        ;
    }

    isBinaryOpContextToken() {
        return false ||
            this.isBinaryTagOpContextToken() ||
            this.isBinaryValueOpContextToken()
        ;
    }

    isContextTerminalToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.LITERAL) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.VARIABLE) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.FUNCTION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.TAGLIKE)
        ;
    }

    isContextToken() {
        return false ||
            this.isContextTerminalToken() ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION) ||
            this.is(mapped.TOKEN_KEY_MAP.CONTEXT.MISCELLANEOUS)
        ;
    }

    isLooseKeywordToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD) ||
            this.is(mapped.TOKEN_KEY_MAP.STRING.UNQUOTED)
    }

    isNewModuleOpToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.APPEND_MODULE) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.PRECEDE_MODULE) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.SUCCEED_MODULE) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.OVERWRITE_MODULE) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.EDIT_MODULE)
        ;
    }

    isAccessorOpToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.ACCESS_VARIABLE) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.ACCESS_CONTEXT)
        ;
    }

    isSinkOpToken() {
        return false ||
            this.isNewModuleOpToken() ||
            this.isAccessorOpToken() ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.CONDITION_EXISTS) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.CONDITION_NOT_EXISTS) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.SWITCH_START) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.LOOP_START)
        ;
    }

    isControlOpToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.CONTROL_CONTINUE) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.CONTROL_BREAK)
        ;
    }

    isConsoleOpToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.CONSOLE_STATISTICS) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.CONSOLE_CLEAR_OUTPUT) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.CONSOLE_EXIT)
        ;
    }

    isLonelyOpToken() {
        return false ||
            this.isControlOpToken() ||
            this.isConsoleOpToken() ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.NOP) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.DELETE_MODULE)
        ;
    }

    isSourceOnlyOpToken() {
        return false ||
            this.isLonelyOpToken() ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.EDIT_METADATA) ||
            this.is(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, mapped.OPERATION_MAP.DELETE_METADATA)
        ;
    }

    isOpToken() {
        return false ||
            this.isSinkOpToken() ||
            this.isSourceOnlyOpToken()
        ;
    }

    isRawInputStringToken() {
        return false ||
            this.is(mapped.TOKEN_KEY_MAP.STRING.LINE) ||
            this.is(mapped.TOKEN_KEY_MAP.STRING.MAGIC) ||
            this.is(mapped.TOKEN_KEY_MAP.STRING.MULTILINE)
        ;
    }

    isStringToken() {
        return false ||
            this.isRawInputStringToken() ||
            this.is(mapped.TOKEN_KEY_MAP.STRING.UNQUOTED)
        ;
    }

    /**
     * Using this as opposed to just creating a new token with the same type and value is useful because the debug information remains the same as the token created from.
     * This is useful for creating program-internal tokens that, when there is a problem related to them, the debug output can link back to the user-created token it was generated from.
     * The alternative is confusing the user with a token they never actually put in.
     */
    to(type, val) {
        return new Token(type, val, this.debug);
    }

    toUnquotedStringToken() {
        switch (this.type) {
            case mapped.TOKEN_KEY_MAP.NUMBER.INTEGER:
            case mapped.TOKEN_KEY_MAP.NUMBER.FLOATING_POINT:
                return this.to(mapped.TOKEN_KEY_MAP.STRING.UNQUOTED, String(this.val));
        }

        return this.to(this.type, this.val);
    }

    toKeywordToken() {
        switch (this.type) {
            case mapped.TOKEN_KEY_MAP.NUMBER.INTEGER:
            case mapped.TOKEN_KEY_MAP.NUMBER.FLOATING_POINT:
                return this.to(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, String(this.val));
            case mapped.TOKEN_KEY_MAP.STRING.UNQUOTED:
                return this.to(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, this.val.toLowerCase());
        }

        return this.to(this.type, this.val);
    }

    toContextToken() {
        switch (this.type) {
            case mapped.TOKEN_KEY_MAP.NUMBER.INTEGER:
            case mapped.TOKEN_KEY_MAP.NUMBER.FLOATING_POINT:
                return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.TAGLIKE, String(this.val));
            case mapped.TOKEN_KEY_MAP.STRING.UNQUOTED:
                return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.TAGLIKE, this.val);
            case mapped.TOKEN_KEY_MAP.STRICT_KEYWORD:
            case mapped.TOKEN_KEY_MAP.SYMBOL:
                switch (this.val) {
                    case mapped.CONTEXT_MAP.LEFT_PARENTHESES:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.MISCELLANEOUS, mapped.CONTEXT_MAP.LEFT_PARENTHESES);
                    case mapped.CONTEXT_MAP.RIGHT_PARENTHESES:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.MISCELLANEOUS, mapped.CONTEXT_MAP.RIGHT_PARENTHESES);
                    case mapped.CONTEXT_MAP.WILDCARD_LONG:
                    case mapped.CONTEXT_MAP.WILDCARD:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.TAGLIKE, mapped.CONTEXT_MAP.WILDCARD);
                    case mapped.CONTEXT_MAP.NOT_LONG:
                    case mapped.CONTEXT_MAP.NOT:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.NOT);
                    case mapped.CONTEXT_MAP.AND_LONG:
                    case mapped.CONTEXT_MAP.AND:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.AND);
                    case mapped.CONTEXT_MAP.XOR_LONG:
                    case mapped.CONTEXT_MAP.XOR:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.XOR);
                    case mapped.CONTEXT_MAP.OR_LONG:
                    case mapped.CONTEXT_MAP.OR:
                    case mapped.CONTEXT_MAP.OR_EXTRA:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.OR);
                    case mapped.CONTEXT_MAP.LOOKAHEAD_LONG:
                    case mapped.CONTEXT_MAP.LOOKAHEAD:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LOOKAHEAD);
                    case mapped.CONTEXT_MAP.RECURSIVE_LOOKAHEAD_LONG:
                    case mapped.CONTEXT_MAP.RECURSIVE_LOOKAHEAD:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.RECURSIVE_LOOKAHEAD);
                    case mapped.CONTEXT_MAP.LOOKBEHIND_LONG:
                    case mapped.CONTEXT_MAP.LOOKBEHIND:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LOOKBEHIND);
                    case mapped.CONTEXT_MAP.RECURSIVE_LOOKBEHIND_LONG:
                    case mapped.CONTEXT_MAP.RECURSIVE_LOOKBEHIND:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.RECURSIVE_LOOKBEHIND);
                    case mapped.CONTEXT_MAP.LOOKAROUND_LONG:
                    case mapped.CONTEXT_MAP.LOOKAROUND:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LOOKAROUND);
                    case mapped.CONTEXT_MAP.INVERSE_LOOKAHEAD_LONG:
                    case mapped.CONTEXT_MAP.INVERSE_LOOKAHEAD:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_LOOKAHEAD);
                    case mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD_LONG:
                    case mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD);
                    case mapped.CONTEXT_MAP.INVERSE_LOOKBEHIND_LONG:
                    case mapped.CONTEXT_MAP.INVERSE_LOOKBEHIND:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_LOOKBEHIND);
                    case mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND_LONG:
                    case mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND);
                    case mapped.CONTEXT_MAP.INVERSE_LOOKAROUND_LONG:
                    case mapped.CONTEXT_MAP.INVERSE_LOOKAROUND:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INVERSE_LOOKAROUND);
                    case mapped.CONTEXT_MAP.FORWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.FORWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.FORWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.CHAINED_FORWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.CHAINED_FORWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.CHAINED_FORWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.RECURSIVE_FORWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.RECURSIVE_FORWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.RECURSIVE_FORWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.BACKWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.BACKWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.BACKWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.CHAINED_BACKWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.CHAINED_BACKWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.CHAINED_BACKWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.RECURSIVE_BACKWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.RECURSIVE_BACKWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.RECURSIVE_BACKWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.INCLUSIVE_FORWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.INCLUSIVE_FORWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_FORWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.INCLUSIVE_CHAINED_FORWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.INCLUSIVE_CHAINED_FORWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_CHAINED_FORWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_FORWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_FORWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_FORWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.INCLUSIVE_BACKWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.INCLUSIVE_BACKWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_BACKWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.INCLUSIVE_CHAINED_BACKWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.INCLUSIVE_CHAINED_BACKWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_CHAINED_BACKWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION_LONG:
                    case mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION);
                    case mapped.CONTEXT_MAP.TERNARY_1_LONG:
                    case mapped.CONTEXT_MAP.TERNARY_1:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.TERNARY_1);
                    case mapped.CONTEXT_MAP.TERNARY_2_LONG:
                    case mapped.CONTEXT_MAP.TERNARY_2:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.TERNARY_2);
                    case mapped.CONTEXT_MAP.VALUE_SYMBOL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.MISCELLANEOUS, mapped.CONTEXT_MAP.VALUE_SYMBOL);
                    case mapped.CONTEXT_MAP.EQUAL_TO_LONG:
                    case mapped.CONTEXT_MAP.EQUAL_TO_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.EQUAL_TO_INTERNAL);
                    case mapped.CONTEXT_MAP.NOT_EQUAL_TO_LONG:
                    case mapped.CONTEXT_MAP.NOT_EQUAL_TO_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.NOT_EQUAL_TO_INTERNAL);
                    case mapped.CONTEXT_MAP.LESS_THAN_LONG:
                    case mapped.CONTEXT_MAP.LESS_THAN_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LESS_THAN_INTERNAL);
                    case mapped.CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO_LONG:
                    case mapped.CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO_INTERNAL);
                    case mapped.CONTEXT_MAP.GREATER_THAN_LONG:
                    case mapped.CONTEXT_MAP.GREATER_THAN_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.GREATER_THAN_INTERNAL);
                    case mapped.CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO_LONG:
                    case mapped.CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO_INTERNAL);
                    case mapped.CONTEXT_MAP.ADD_LONG:
                    case mapped.CONTEXT_MAP.ADD_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.ADD_INTERNAL);
                    case mapped.CONTEXT_MAP.SUBTRACT_LONG:
                    case mapped.CONTEXT_MAP.SUBTRACT_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.SUBTRACT_INTERNAL);
                    case mapped.CONTEXT_MAP.MULTIPLY_LONG:
                    case mapped.CONTEXT_MAP.MULTIPLY_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.MULTIPLY_INTERNAL);
                    case mapped.CONTEXT_MAP.DIVIDE_LONG:
                    case mapped.CONTEXT_MAP.DIVIDE_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.DIVIDE_INTERNAL);
                    case mapped.CONTEXT_MAP.MODULUS_LONG:
                    case mapped.CONTEXT_MAP.MODULUS_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.MODULUS_INTERNAL);
                    case mapped.CONTEXT_MAP.EXPONENT_LONG:
                    case mapped.CONTEXT_MAP.EXPONENT_INTERNAL:
                        return this.to(mapped.TOKEN_KEY_MAP.CONTEXT.OPERATION, mapped.CONTEXT_MAP.EXPONENT_INTERNAL);
                }
        }

        return this.to(this.type, this.val);
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
