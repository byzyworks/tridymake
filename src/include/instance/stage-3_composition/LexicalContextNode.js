import { SyntaxError } from '../../error.js';

export class LexicalContextNode {
    constructor(opts = { }) {
        opts.parent = opts.parent ?? null;

        this.parent     = opts.parent;
        this._namespace = { };
    }

    declareName(key, value = undefined) {
        if (this._namespace.hasOwnProperty(key)) {
            throw new SyntaxError(`The variable "${key}" has already been declared in this block.`);
        }

        this._namespace[key] = value;
    }

    setName(key, value = undefined) {
        if (this._namespace.hasOwnProperty(key)) {
            this._namespace[key] = value;
        } else if (this._parent === null) {
            throw new SyntaxError(`The variable "${key}" needs to be declared first in this block or a parent block.`);
        } else {
            this._parent.setVariable(key, value);
        }
    }

    getValue(key) {
        if (this._namespace.hasOwnProperty(key)) {
            return this._namespace[key];
        } else if (this._parent === null) {
            throw new SyntaxError(`The variable "${key}" needs to be declared first in this block or a parent block.`);
        } else {
            this._parent.getVariable(key);
        }
    }
}
