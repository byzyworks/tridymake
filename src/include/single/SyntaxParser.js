import * as common from '../common.js';
import * as error  from '../error.js';
import * as mapped from '../mapped.js';

import { List } from '../instance/List.js';
import { Tree } from '../instance/Tree.js';

import { ExpressionNode } from '../instance/stage-2_parsing/ExpressionNode.js';
import { FunctionNode }   from '../instance/stage-2_parsing/FunctionNode.js';
import { OperationNode }  from '../instance/stage-2_parsing/OperationNode.js';
import { Tag }            from '../instance/stage-2_parsing/Tag.js';
import { Token }          from '../instance/stage-1_lexing/Token.js';
import { Variable }       from '../instance/stage-2_parsing/Variable.js';

import { ExpressionParser } from './ExpressionParser.js';

export class SyntaxParser {
    _EMPTY_RETURN  = Symbol();
    _DEBUG_MESSAGE = Object.freeze({
        WORD:     `unquoted string or number [-A-Za-z0-9_+.]`,
        STRING:   [ `unquoted string or number [-A-Za-z0-9_+.]`, `quoted string`, `variable call (stored/unstored)`, `function call` ],
        MAPPING:  [ `variable call (stored/unstored)`, `function call` ],
        KEYVALUE: {
            END: [ mapped.GENERAL_SYNTAX.ASSIGNMENT, mapped.GENERAL_SYNTAX.DELIMITER, mapped.GENERAL_SYNTAX.KEYVALUE_END ]
        },
        EXPRESSION: {
            START: `expression operand`,
            END:   [ `expression operand`, `expression operator`, mapped.EXPRESSION.RIGHT_PARENTHESES ]
        }
    });
    
    constructor() { }

    _handleUnexpected(opts = { }) {
        opts.description = opts.description ?? null;
        opts.expected    = opts.expected    ?? [ ];

        const token = this._tokens.peek();
        const debug = Token.getPosString(token.debug);
        let   desc  = '';

        if (opts.description === null) {
            desc += `Unexpected token "${token.debug.value}".`;
            if (!common.isEmpty(opts.expected)) {
                desc += ` Expected: `;
                if (common.isArray(opts.expected)) {
                    for (let i = 0; i < opts.expected.length; i++) {
                        desc += `"${opts.expected[i]}"`;
                        if (i !== (opts.expected.length - 1)) {
                            desc += ", ";
                        }
                    }
                } else {
                    desc += `"${opts.expected}"`;
                }
            }
        } else {
            desc = opts.description;
        }

        throw new error.SyntaxError(`${debug}: ${desc}`);
    }

    _readWhileValueExpression(collect) {
        if (!this._tokens.peek().is(null, mapped.EXPRESSION.VALUE_EXPRESSION_START)) {
            this._handleUnexpected({ expected: mapped.EXPRESSION.VALUE_EXPRESSION_START });
        }

        this._tokens.next();

        let lhs;
        let op;
        let rhs;

        lhs = this._readWhileStringFeed();
        if (lhs === this._EMPTY_RETURN) {
            this._handleUnexpected({ expected: this._DEBUG_MESSAGE.STRING });
        }

        const current = this._tokens.peek();
        if (current.isBinaryValueOperatorExpressionToken()) {
            op = current.value;
            this._tokens.next();

            rhs = this._readWhileStringFeed();
            if (rhs === this._EMPTY_RETURN) {
                this._handleUnexpected({ expected: this._DEBUG_MESSAGE.STRING });
            }
        }

        if (!this._tokens.peek().is(null, mapped.EXPRESSION.VALUE_EXPRESSION_END)) {
            this._handleUnexpected({ expected: mapped.EXPRESSION.VALUE_EXPRESSION_END });
        }

        this._tokens.next();

        collect.push(new ExpressionNode(lhs, { op: op, b: rhs, type: mapped.EXPRESSION_TYPE.VALUE }));
    }

    _readWhileExpressionUnit(collect) {
        let current;

        while (true) {
            current = this._tokens.peek();
            if (current.isUnaryOperatorExpressionToken()) {
                collect.push(current);
                this._tokens.next();
            } else {
                break;
            }
        }

        current = this._tokens.peek();
        if (current.is(null, mapped.EXPRESSION.LEFT_PARENTHESES)) {
            collect.push(current);
            this._tokens.next();
            
            this._readWhileExpressionLoop(collect);

            current = this._tokens.peek();
            if (!current.is(null, mapped.EXPRESSION.RIGHT_PARENTHESES)) {
                this._handleUnexpected({ expected: this._DEBUG_MESSAGE.EXPRESSION.END });
            }

            collect.push(current);
            this._tokens.next();
        } else {
            current = this._tokens.peek();
            if (current.isExpressionTerminalToken()) {
                collect.push(current);
                this._tokens.next();
            } else if (current.is(null, mapped.EXPRESSION.VALUE_EXPRESSION_START)) {
                this._readWhileValueExpression(collect);
            } else {
                this._handleUnexpected({ expected: this._DEBUG_MESSAGE.EXPRESSION.START });
            }
        }
    }

    _readWhileExpressionLoop(collect) {
        this._readWhileExpressionUnit(collect);
        
        while (true) {
            let current = this._tokens.peek();
            if (current.isBinaryTagOperatorExpressionToken()) {
                collect.push(current);
                this._tokens.next();

                this._readWhileExpressionLoop(collect);
            } else if (current.isTernaryFirstOperatorExpressionToken()) {
                collect.push(current);
                this._tokens.next();

                this._readWhileExpressionLoop(collect);

                current = this._tokens.peek();
                if (!current.isTernarySecondOperatorExpressionToken()) {
                    let expected;
                    if (current.is(null, mapped.EXPRESSION.TERNARY_1)) {
                        expected = mapped.EXPRESSION.TERNARY_2;
                    } else if (current.is(null, mapped.EXPRESSION.TERNARY_LOW_PRECEDENCE_1)) {
                        expected = mapped.EXPRESSION.TERNARY_LOW_PRECEDENCE_2;
                    }

                    this._handleUnexpected({ expected: expected });
                }

                collect.push(current);
                this._tokens.next();

                this._readWhileExpressionLoop(collect);
            } else if (current.isExpressionStartToken()) {
                collect.push(new Token(mapped.TOKEN_KEY.SYMBOL, mapped.EXPRESSION.IMPLICIT_OPERATOR));

                this._readWhileExpressionLoop(collect);
            } else {
                break;
            }
        }
    }

    _readWhileExpression() {
        let collect = [ ];

        if (!this._tokens.peek().isExpressionStartToken()) {
            return this._EMPTY_RETURN;
        }

        this._readWhileExpressionLoop(collect);

        const expression = ExpressionParser.parse(collect);

        return expression;
    }

    _resolvePrimitive(word) {
        const case_insensitive_word = word.toLowerCase();
        
        for (const keyword in mapped.TRIDY_TO_JAVASCRIPT_VALUE) {
            if (case_insensitive_word === keyword) {
                return mapped.TRIDY_TO_JAVASCRIPT_VALUE[case_insensitive_word];
            }
        }

        if (!isNaN(word)) {
            return Number(word);
        }

        return word;
    }

    _readWord(opts = { }) {
        opts.force_string = opts.force_string ?? false;

        const current = this._tokens.peek();

        if (!current.is(mapped.TOKEN_KEY.WORD)) {
            return this._EMPTY_RETURN;
        }

        let word = current.value;
        this._tokens.next();
        
        if (opts.force_string) {
            return word;
        }

        return this._resolvePrimitive(word);
    }

    _readWhileString() {
        let current = this._tokens.peek();

        if (!current.is(mapped.TOKEN_KEY.STRING)) {
            return this._EMPTY_RETURN;
        }

        let str = '';

        do {
            str += current.value;
            this._tokens.next();

            current = this._tokens.peek();
        } while (current.is(mapped.TOKEN_KEY.STRING))

        return str;
    }

    _readVariable() {
        const current = this._tokens.peek();

        if (!current.is(mapped.TOKEN_KEY.WORD)) {
            return this._EMPTY_RETURN;
        }

        const key = current.value;
        this._tokens.next();

        return new Variable(key);
    }

    _readTag() {
        if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.STORAGE_MARK)) {
            return this._EMPTY_RETURN;
        }

        this._tokens.next();

        const current = this._tokens.peek();

        let key;
        if (current.is(mapped.TOKEN_KEY.WORD)) {
            key = current.value;
            this._tokens.next();
        } else {
            // A null tag call (just "$@") means the module's own value instead of its metadata/tags.
            key = null;
        }

        return new Tag(key);
    }

    _readWhileFunction() {
        if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.FUNCTION_START)) {
            return this._EMPTY_RETURN;
        }

        this._tokens.next();

        const name = this._readWhileStringFeed();
        if (name === this._EMPTY_RETURN) {
            this._handleUnexpected({ expected: this._DEBUG_MESSAGE.STRING });
        }

        const args = [ ];

        while (true) {
            if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.DELIMITER)) {
                break;
            }

            this._tokens.next();

            const arg = this._readWhileStringFeed();
            if (arg === this._EMPTY_RETURN) {
                this._handleUnexpected({ expected: this._DEBUG_MESSAGE.STRING });
            }

            args.push(arg);
        }

        if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.FUNCTION_END)) {
            this._handleUnexpected({ expected: [ mapped.GENERAL_SYNTAX.DELIMITER, mapped.GENERAL_SYNTAX.FUNCTION_END ] });
        }

        this._tokens.next();

        const alt = null;

        if (this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.FUNCTION_ALT)) {
            this._tokens.next();

            alt = this._readWhileStringFeed();
            if (alt === this._EMPTY_RETURN) {
                this._handleUnexpected({ expected: this._DEBUG_MESSAGE.STRING });
            }
        }

        return new FunctionNode(name, { args: args, alt: alt });
    }

    _readWhileMapping() {
        if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.MAPPING_MARK)) {
            return this._EMPTY_RETURN;
        }

        this._tokens.next();

        let   value;
        const current = this._tokens.peek();
        if (current.is(mapped.TOKEN_KEY.WORD)) {
            value = this._readVariable();
        } else if (current.is(null, mapped.GENERAL_SYNTAX.STORAGE_MARK)) {
            value = this._readTag();
        } else if (current.is(null, mapped.GENERAL_SYNTAX.FUNCTION_START)) {
            value = this._readWhileFunction();
        }

        if (value === this._EMPTY_RETURN) {
            this._handleUnexpected({ expected: this._DEBUG_MESSAGE.MAPPING });
        }

        return value;
    }

    _readWhileStringFeed() {
        let current = this._tokens.peek();

        if (current.is(mapped.TOKEN_KEY.WORD)) {
            return this._readWord();
        }

        if (current.is(mapped.TOKEN_KEY.STRING)) {
            return this._readWhileString();
        }

        if (current.is(null, mapped.GENERAL_SYNTAX.MAPPING_MARK)) {
            return this._readWhileMapping();
        }

        this._handleUnexpected();
    }

    _handleStringOperation() {
        const str = this._readWhileStringFeed();
        if (str === this._EMPTY_RETURN) {
            this._handleUnexpected({ expected: this._DEBUG_MESSAGE.STRING });
        }

        this._astree.enterSetAndLeave(mapped.TREE_KEY.SHARED.DATA, str);
    }

    _handleWordOperation() {
        const word = this._readWord({ force_string: true });
        if (word === this._EMPTY_RETURN) {
            this._handleUnexpected({ expected: this._DEBUG_MESSAGE.WORD });
        }

        this._astree.enterSetAndLeave(mapped.TREE_KEY.SHARED.DATA, word);
    }

    _handleExpressionOperation() {
        const exp = this._readWhileExpression();
        if (exp === this._EMPTY_RETURN) {
            this._handleUnexpected({ expected: this._DEBUG_MESSAGE.EXPRESSION.START });
        }

        this._astree.enterSetAndLeave(mapped.TREE_KEY.ASTREE.EXPRESSION, exp);
    }

    _handleExpressionLoopOperation() {
        if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.EXPRESSION_MARK)) {
            this._handleUnexpected({ expected: mapped.GENERAL_SYNTAX.EXPRESSION_MARK });
        }

        this._tokens.next();

        this._handleExpressionOperation();
    }

    _handleKeyOperation() {
        const keys = [ ];

        while (true) {
            const key = this._readWord({ force_string: true });
            if (key === this._EMPTY_RETURN) {
                this._handleUnexpected({ expected: this._DEBUG_MESSAGE.WORD });
            }

            keys.push(key);

            if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.DELIMITER)) {
                break;
            }

            this._tokens.next();
        }

        const map = { };
        for (const key of keys) {
            if (map.hasOwnProperty(key)) {
                this._handleUnexpected({ description: `Key "${key}" was specified more than once.` });
            }

            map[key] = mapped.TRIDY_TO_JAVASCRIPT_VALUE.empty;
        }

        this._astree.enterSetAndLeave(mapped.TREE_KEY.SHARED.METADATA, keys);
    }

    _handleKeyValueOperation() {
        const map = { };

        while (true) {
            const keys  = [ ];
            let   value = mapped.TRIDY_TO_JAVASCRIPT_VALUE.empty;

            while (true) {
                /**
                 * A word has to be in the form of a string to indicate a key.
                 * Only when it's used as a value should it be coercable as a primitive.
                 */
                const key = this._readWord({ force_string: true });
                if (key === this._EMPTY_RETURN) {
                    /** 
                     * Intentionally applies only the first time because a word-string is only necessary at first for an LHS.
                     * This is since there can be multiple 'keys' (identified by words) separated by equal signs, but at least one needs to be set equal to.
                     * Meanwhile, multiple LHSs are optional (for assigning the same value to multiple keys), 
                     * and the RHS (of which only one can exist) can be any string and not just a word-string.
                     */
                    this._handleUnexpected({ expected: this._DEBUG_MESSAGE.WORD });
                }
    
                if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.ASSIGNMENT)) {
                    if (common.isEmpty(keys)) {
                        keys.push(key);
                    } else {
                        /**
                         * To account for why the RHS, even if it's a word, is treated as a string value instead of a key,
                         * That is because stored tag and variable keys are not required to not resemble letters or various keywords.
                         * Therefore, it would cause ambiguity with something like "var a = 1" if there happened to be a variable already with the key "1".
                         * Mappings solve this, allowing "var a = 1" to mean assigning the value 1, and "var a = $1" to mean assigning the value stored in the variable "1". 
                         */
                        value = this._resolvePrimitive(key);
                    }

                    break;
                }

                keys.push(key);

                this._tokens.next();

                if (!this._tokens.peek().is(mapped.TOKEN_KEY.WORD)) {
                    value = this._readWhileStringFeed();
                    if (value === this._EMPTY_RETURN) {
                        this._handleUnexpected({ expected: this._DEBUG_MESSAGE.STRING });
                    }

                    break;
                }
            }

            for (const key of keys) {
                /**
                 * Use of hasOwnProperty() is required since undefined is used to indicate the key exists alone without a value.
                 * This is distinctly unlike the key not existing at all.
                 */
                if (map.hasOwnProperty(key)) {
                    this._handleUnexpected({ description: `Key "${key}" was specified more than once.` });
                }

                map[key] = value;
            }

            if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.DELIMITER)) {
                break;
            }

            this._tokens.next();
        }

        this._astree.enterSetAndLeave(mapped.TREE_KEY.SHARED.METADATA, map);
    }

    _handleDataMetadataOperation() {
        let data;
        let default_tag = false;

        data = this._readWord({ force_string: false });
        if (data === this._EMPTY_RETURN) {
            data = this._readWhileStringFeed();
            if (data !== this._EMPTY_RETURN) {
                this._astree.enterSetAndLeave(mapped.TREE_KEY.SHARED.DATA, data);
            }
        } else {
            this._astree.enterSetAndLeave(mapped.TREE_KEY.SHARED.DATA, data);

            /**
             * "Default tag" means a module created by "new a;" can be addressed with "@a".
             * Tags/metadata keys can only be words, not just any random string, so it only works if the value of the module is given as a word.
             * "new "foo bar";" will not create a new tag, so @"foo bar" doesn't work, but would still be addressable via "@[$@ == "foo bar"]".
             * A default tag is only applied after the metadata is applied, since the user may explicitly have that same tag as metadata and give it a different value.
             * e.g. "new a [a = 5];".
             * Hence, the default tag doesn't override anything the user provides.
             */
            default_tag = true;
        }

        if (this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.KEYVALUE_START)) {
            this._tokens.next();

            this._handleKeyValueOperation();

            if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.KEYVALUE_END)) {
                this._handleUnexpected({ expected: this._DEBUG_MESSAGE.KEYVALUE.END });
            }

            this._tokens.next();
        }

        if (default_tag === true) {
            let metadata = this._astree.enterGetAndLeave(mapped.TREE_KEY.SHARED.METADATA);
            if (common.isNullish(metadata)) {
                metadata       = { };
                metadata[data] = mapped.SPECIAL_VALUE.EMPTY;
                this._astree.enterSetAndLeave(mapped.TREE_KEY.SHARED.METADATA, metadata);
            } else if (!metadata.hasOwnProperty(data)) {
                metadata[data] = mapped.SPECIAL_VALUE.EMPTY;
            }
        }
    }

    _handleOptionalLabel() {
        if (this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.LABEL_START)) {
            this._tokens.next();

            const label = this._readWord({ force_string: true });
            if (label === this._EMPTY_RETURN) {
                this._handleUnexpected({ expected: this._DEBUG_MESSAGE.WORD });
            }

            this._astree.enterSetAndLeave(mapped.TREE_KEY.ASTREE.LABEL, label);

            if (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.LABEL_END)) {
                this._handleUnexpected({ expected: mapped.GENERAL_SYNTAX.LABEL_END });
            }

            this._tokens.next();
        }
    }

    _handleOperation() {
        const current  = this._tokens.peek();
        const op_token = current.to(current.type, current.value.toLowerCase());

        if (!op_token.isOperationToken()) {
            this._handleUnexpected({ description: `Unknown operation "${current.value}".` });
        }

        this._astree.setPosValue(new OperationNode({ operation: op_token.value }));

        this._tokens.next();

        if (op_token.isConsoleOperationToken() && (this._interactive === false)) {
            this._handleUnexpected({ description: `The operation ${op_token.value} is not useable outside of an interactive context.` });
        }

        if (!op_token.isBlockOperationToken()) {
            this._handleOptionalLabel();
        }

        if (op_token.isDataMetadataSyntaxOperationToken()) {
            this._handleDataMetadataOperation();
        } else if (op_token.isKeyValueSyntaxOperationToken()) {
            this._handleKeyValueOperation();
        } else if (op_token.isKeySyntaxOperationToken()) {
            this._handleKeyOperation();
        } else if (op_token.isExpressionLoopSyntaxOperationToken()) {
            this._handleExpressionLoopOperation();
        } else if (op_token.isExpressionOnlySyntaxOperationToken()) {
            this._handleExpressionOperation();
        } else if (op_token.isWordOnlySyntaxOperationToken()) {
            this._handleWordOperation();
        } else if (op_token.isStringSyntaxOperationToken()) {
            this._handleStringOperation();
        }

        if (!this._tokens.peek().isSocketEndToken()) {
            this._handleUnexpected();
        }
    }

    _handleOperationMode(mode_token) {
        if (mode_token.isControlOperationToken()) {
            this._handleUnexpected({ description: `A control operation like "${mode_token.value}" cannot have statements nested within it.` });
        }

        const current = this._tokens.peek();

        let op_token;

        if (current.isOperationToken()) {
            op_token = current;
        } else if (current.isDataStartToken()) {
            if (mode_token.isBlockOperationToken()) {
                let str = `An appropriate operation is required preceding "${current.value}" to indicate whether it is part of input data or an output function.`;
                if (current.is(mapped.TOKEN_KEY.WORD)) {
                    str += ` If "${current.value}" is supposed to be that operation, it doesn't appear to be a valid one.`;
                }
                this._handleUnexpected({ description: str });
            }

            if (mode_token.isSourceModeOperationToken()) {
                op_token = current.to(mapped.TOKEN_KEY.WORD, mapped.OPERATION.APPEND_MODULE);
            } else if (mode_token.isSinkModeOperationToken()) {
                op_token = current.to(mapped.TOKEN_KEY.WORD, mapped.OPERATION.OUTPUT_MODULE);
            }

            // This is done for separation of concerns; avoid handling operation-specific behavior here.
            this._tokens.insert(op_token);
        } else {
            this._handleUnexpected({ description: `Unknown operation "${current.value}".` });
        }

        if (op_token.isControlOperationToken()) {
            mode_token = op_token;
        } else if (op_token.isSourceModeOperationToken()) {
            if (mode_token.isSinkModeOperationToken()) {
                this._handleUnexpected({ description: `An input operation like "${op_token.value}" cannot be nested within an output operation like "${mode_token.value}".` });
            }

            mode_token = op_token;
        } else if (op_token.isSinkModeOperationToken()) {
            if (mode_token.isSourceModeOperationToken()) {
                this._handleUnexpected({ description: `An output operation like "${op_token.value}" cannot be nested within an input operation like "${mode_token.value}".` });
            }

            mode_token = op_token;
        }

        return mode_token;
    }

    _handleSocket(mode_token, is_first) {
        const current = this._tokens.peek();

        if (!is_first && current.is(null, mapped.GENERAL_SYNTAX.NESTED_START)) {
            this._tokens.next();

            while (!this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.NESTED_END)) {
                this._handleStatement({ mode_token: mode_token });

                if (!this._astree.isPosEmpty()) {
                    this._astree.nextItem(mapped.TREE_KEY.SHARED.NESTED);
                }
            }
        } else {
            if (!is_first && this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.EMPLACEMENT)) {
                this._tokens.next();
            }

            mode_token = this._handleOperationMode(mode_token);

            this._handleOperation();
        }

        return mode_token;
    }

    _handleStatement(opts = { }) {
        /**
         * The top-level operation is always just a simple lexical block.
         * It's convenient to have this as a default instead of null or undefined due to Token's methods.
         */
        opts.mode_token = opts.mode_token ?? new Token(mapped.TOKEN_KEY.WORD, mapped.OPERATION.BLOCK);

        // Handles "empty" statements.
        if (this._tokens.peek().is(null, mapped.GENERAL_SYNTAX.STATEMENT_END)) {
            return;
        }

        let mode_token = opts.mode_token;
        let nesting    = 0;

        try {
            let is_first = true;
            while (true) {
                mode_token = this._handleSocket(mode_token, is_first);
                
                if (!this._tokens.peek().isSocketStartToken()) {
                    break;
                }
    
                is_first = false;
    
                this._astree.enterNested(mapped.TREE_KEY.SHARED.NESTED);
                nesting++;
            }
        } finally {
            for (let i = 0; i < nesting; i++) {
                this._astree.leaveNested();
            }
        }

        if (!this._tokens.peek().isStatementEndToken()) {
            this._handleUnexpected({ description: `An incomplete statement was received, which is not allowed.` });
        }

        this._tokens.next();
    }

    parse(tokens, opts = { }) {
        opts._interactive = opts.interactive ?? false;

        this._tokens      = new List(tokens);
        this._astree      = new Tree(new OperationNode());
        this._interactive = opts.interactive;

        if (!this._tokens.isEmpty()) {
            this._astree.enterNested(mapped.TREE_KEY.SHARED.NESTED);
            while (true) {
                this._handleStatement();

                if (this._tokens.isEnd() || (mapped.global.flags.exit !== true)) {
                    break;
                }

                if (!this._astree.isPosEmpty()) {
                    this._astree.nextItem(mapped.TREE_KEY.SHARED.NESTED);
                }
            }
            this._astree.leaveNested(mapped.TREE_KEY.SHARED.NESTED);
        }

        return this._astree.getRaw();
    }
}
