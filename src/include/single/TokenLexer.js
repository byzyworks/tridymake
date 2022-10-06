import { CharLexer } from './CharLexer.js';

import { not }         from '../common.js';
import { SyntaxError } from '../error.js';
import * as mapped     from '../mapped.js';

import { Stack } from '../instance/Stack.js';
import { Token } from '../instance/Token.js';

export class TokenLexer {
    constructor() {
        this._lexer   = new CharLexer();
        this._mode    = new Stack();
        this._current = null;
    }

    load(input, opts = { }) {
        opts.filepath = opts.filepath ?? null;

        if (opts.filepath !== this._lexer.getFilepath()) {
            this._lexer.clear();
            this._lexer = new CharLexer({ filepath: opts.filepath });
        }
        this._lexer.load(input);
    }

    clear() {
        this._lexer.clear();

        this._mode    = new Stack();
        this._current = null;
    }

    next() {
        const token   = this._current;
        this._current = null;

        return token || this._readNext();
    }

    peek() {
        this._current = this._current ?? this._readNext();

        return this._current;
    }

    _isWhitespace(ch) {
        return /\s/g.test(ch);
    }

    _readWhilePred(pred) {
        let str = '';
        while (!this._lexer.isEOF() && pred(this._lexer.peek())) {
            str += this._lexer.next();
        }

        return str;
    }

    _readWhileEscaped() {
        let is_escaped = false
        let str        = '';
        let ch;

        while (!this._lexer.isEOF()) {
            ch = this._lexer.peek();

            if (is_escaped) {
                const map = { };
                switch (this._mode.peek()) {
                    case mapped.TOKEN_KEY_MAP.STRING.LINE:
                    case mapped.TOKEN_KEY_MAP.STRING.MULTILINE:
                        map['t'] = "\t";
                        
                        break;
                    case mapped.TOKEN_KEY_MAP.STRING.MAGIC:
                        map['t'] = "\t";
                        map['r'] = "\r";
                        map['n'] = "\n";
                        map['v'] = "\v";

                        break;
                }
                ch = map[ch] ?? ch;
                str += ch;
                
                is_escaped = false;
                this._lexer.next();
            } else if (ch === mapped.GENERAL_SYNTAX_MAP.ESCAPE) {
                is_escaped = true;
                this._lexer.next();
            } else if (ch === mapped.GENERAL_SYNTAX_MAP.COMMENT_START) {
                this._mode.push('normal');
                break;
            } else if (this._mode.peek() === mapped.TOKEN_KEY_MAP.STRING.LINE) {
                switch (ch) {
                    case "\r":
                    case "\n":
                    case "\v":
                        break;
                    case mapped.GENERAL_SYNTAX_MAP.STRING_DELIMITER.LINE:
                        this._mode.pop();
                        break;
                    default:
                        str += ch;
                        break;
                }
                this._lexer.next();
                break;
            } else if ((ch === mapped.GENERAL_SYNTAX_MAP.STRING_DELIMITER.MAGIC) && (this._mode.peek() === mapped.TOKEN_KEY_MAP.STRING.MAGIC)) {
                this._mode.pop();
                this._lexer.next();
                break;
            } else if ((ch === mapped.GENERAL_SYNTAX_MAP.STRING_DELIMITER.MULTILINE) && (this._mode.peek() === mapped.TOKEN_KEY_MAP.STRING.MULTILINE)) {
                this._mode.pop();
                this._lexer.next();
                break;
            } else {
                str += ch;
                this._lexer.next();
            }
        }

        return str;
    }

    _readStrictKeyword() {
        const pos = this._lexer.getPos();
        this._lexer.next();

        const valid_word = new RegExp(mapped.REGEX_MAP.UNQUOTED);
        const keyword    = this._readWhilePred(valid_word.test.bind(valid_word)).toLowerCase();

        return new Token(mapped.TOKEN_KEY_MAP.STRICT_KEYWORD, keyword, pos);
    }

    _readWord() {
        const pos = this._lexer.getPos();

        const valid_word = new RegExp(mapped.REGEX_MAP.UNQUOTED);
        let word         = this._readWhilePred(valid_word.test.bind(valid_word));

        if (!isNaN(word)) {
            word = Number(word);

            if (Number.isInteger(word)) {
                return new Token(mapped.TOKEN_KEY_MAP.NUMBER.INTEGER, word, pos);
            }
            return new Token(mapped.TOKEN_KEY_MAP.NUMBER.FLOATING_POINT, word, pos);
        }
        return new Token(mapped.TOKEN_KEY_MAP.STRING.UNQUOTED, word, pos);
    }

    _readSymbols() {
        const pos = this._lexer.getPos();
        
        const multi_symbol = new RegExp(`^${mapped.REGEX_MAP.SYMBOL}{2,}$`);
        const sources = [
            mapped.GENERAL_SYNTAX_MAP,
            mapped.CONTEXT_MAP
        ];
        const symbols = [ ];

        // Speeds up selection since some of the sources may contain non-symbols.
        for (const source of sources) {
            for (const symbol of Object.values(source)) {
                if (multi_symbol.test(symbol)) {
                    symbols.push(symbol);
                }
            }
        }

        /**
         * Ensures the longest symbols are tested first.
         * Required for the selection algorithm below to work.
         */
        symbols.sort((a, b) => {
            return b.length - a.length;
        });
        
        let candidate = '';

        for (const symbol of symbols) {
            candidate = '';

            for (let i = 0; i < symbol.length; i++) {
                const tested = this._lexer.peek();

                if (symbol[i] !== tested) {
                    for (let j = i; j > 0; j--) {
                        this._lexer.prev();
                    }

                    break;
                }

                candidate += this._lexer.next();
            }

            if (candidate === symbol) {
                break;
            }
        }

        /**
         * Accounts for symbols not explicitly in the sources.
         * (In that case, not valid syntax, but still "symbols").
         */
        if (candidate === '') {
            candidate = this._lexer.next();
        }

        return new Token(mapped.TOKEN_KEY_MAP.SYMBOL, candidate, pos);
    }

    _readRaw() {
        const pos = this._lexer.getPos();

        let type = this._mode.peek();

        return new Token(type, this._readWhileEscaped(), pos);
    }

    _readComment() {
        this._readWhilePred((ch) => {
            return ch !== "\n";
        });
        if (this._lexer.peek() === "\n") {
            // The condition is because console mode in particular strips out line feeds prematurely.
            this._lexer.next();
        }
    }
    
    _readNext() {
        if (this._lexer.isEOF()) {
            return null;
        }

        switch (this._mode.peek()) {
            case mapped.TOKEN_KEY_MAP.STRING.LINE:
            case mapped.TOKEN_KEY_MAP.STRING.MAGIC:
            case mapped.TOKEN_KEY_MAP.STRING.MULTILINE:
                return this._readRaw();
        }

        // Keep this line before a character is grabbed; don't move it, or 'ch' could grab a whitespace.
        this._readWhilePred(this._isWhitespace.bind(this));
        
        const ch = this._lexer.peek();

        if (this._mode.peek() === 'normal') {
            this._mode.pop();
        }

        if (ch === mapped.GENERAL_SYNTAX_MAP.STRICT_KEYWORD_START) {
            return this._readStrictKeyword();
        }

        if ((new RegExp(mapped.REGEX_MAP.UNQUOTED)).test(ch)) {
            return this._readWord();
        }

        if ((new RegExp(mapped.REGEX_MAP.SYMBOL)).test(ch)) {
            return this._readSymbols();
        }

        if (ch === mapped.GENERAL_SYNTAX_MAP.STRING_DELIMITER.LINE) {
            this._lexer.next();
            this._mode.push(mapped.TOKEN_KEY_MAP.STRING.LINE);
            return this._readRaw();
        }

        if (ch === mapped.GENERAL_SYNTAX_MAP.STRING_DELIMITER.MAGIC) {
            this._lexer.next();
            this._mode.push(mapped.TOKEN_KEY_MAP.STRING.MAGIC);
            return this._readRaw();
        }

        if (ch === mapped.GENERAL_SYNTAX_MAP.STRING_DELIMITER.MULTILINE) {
            this._lexer.next();
            this._mode.push(mapped.TOKEN_KEY_MAP.STRING.MULTILINE);
            return this._readRaw();
        }

        /**
         * This function needs to return something always, at least until it reaches the end of the input.
         * The statement parser will stop checking for new tokens once this function returns null or undefined.
         */
        if (ch === mapped.GENERAL_SYNTAX_MAP.COMMENT_START) {
            this._lexer.next();
            this._readComment();
            return this._readNext();
        }

        this._readWhilePred(this._isWhitespace.bind(this));

        if (this._lexer.isEOF()) {
            return null;
        }

        const pos     = this._lexer.getPos();
        const anomaly = this._readWhilePred(not(this._isWhitespace.bind(this)));
        throw new SyntaxError(Token.getPosString(pos) + `: Unexpected token "${anomaly}".`);
    }
}
