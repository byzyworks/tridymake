//import { ContextParser } from './ContextParser.js';

import * as common from '../common.js';
import * as error  from '../error.js';
import * as mapped from '../mapped.js';

import { List }      from '../instance/List.js';
import { StateTree } from '../instance/StateTree.js';
import { Token }     from '../instance/Token.js';

export class SyntaxParser {
    constructor() { }

    _handleUnexpected(description = null) {
        const token = this._tokens.peek();
        if (description === null) {
            throw new error.SyntaxError(Token.getPosString(token.debug) + `: Unexpected token "${token.debug.val}".`);
        } else {
            throw new error.SyntaxError(Token.getPosString(token.debug) + `: ${description}`);
        }
    }

    async _handleOperation() {
        // DEBUG
        this._astree.enterSetAndLeave('operation', this._tokens.peek().val);
        let current = this._tokens.peek();
        while (!current.isSocketEndToken()) {
            this._tokens.next();
            current = this._tokens.peek();
        }
    }

    async _handleSocket() {
        const current = this._tokens.peek();

        if (current.isOpToken()) {
            await this._handleOperation();

            return;
        }

        if (current.is(mapped.GENERAL_SYNTAX_MAP.SYMBOL, mapped.GENERAL_SYNTAX_MAP.NESTED_START)) {
            this._tokens.next();

            while (!this._tokens.peek().is(mapped.GENERAL_SYNTAX_MAP.SYMBOL, mapped.GENERAL_SYNTAX_MAP.NESTED_END)) {
                await this._handleStatement();

                this._astree.nextItem(mapped.MODULE_KEY_MAP.NESTED);
            }

            return;
        }

        this._handleUnexpected();
    }

    async _handleStatement() {
        let nesting = 0;

        while (true) {
            await this._handleSocket();
            
            if (!this._tokens.peek().is(mapped.TOKEN_KEY_MAP.SYMBOL, mapped.GENERAL_SYNTAX_MAP.EMPLACEMENT)) {
                break;
            }

            this._tokens.next();

            this._astree.enterNested(mapped.MODULE_KEY_MAP.NESTED);
            nesting++;
        }

        for (let i = 0; i < nesting; i++) {
            this._astree.leaveNested();
        }

        if (!this._tokens.peek().isStatementEndToken()) {
            this._handleUnexpected();
        }

        this._tokens.next();
    }

    async parse(tokens, opts = { }) {
        this._tokens = new List(tokens);

        this._astree = new StateTree();

        this._astree.enterNested(mapped.MODULE_KEY_MAP.NESTED);
        while (true) {
            await this._handleStatement();

            if (this._tokens.isEnd() || (mapped.global.flags.exit !== true)) {
                break;
            }

            this._astree.nextItem(mapped.MODULE_KEY_MAP.NESTED);
        }
        this._astree.leaveNested(mapped.MODULE_KEY_MAP.NESTED);

        return this._astree.getRaw();
    }
}
