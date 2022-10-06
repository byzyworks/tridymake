import { Stack } from './Stack.js';

export class List extends Stack {
    constructor(preset = null) {
        super(preset);

        this._it = 0;
    }

    next() {
        if (this._it < this._arr.length) {
            return this._arr[this._it++];
        }
        return null;
    }

    prev() {
        if (this._it >= 0) {
            return this._arr[this._it--];
        }
        return null;
    }

    peek() {
        if (this._it < this._arr.length) {
            return this._arr[this._it];
        }
        return null;
    }

    isEnd() {
        return this._it >= this._arr.length;
    }

    begin() {
        this._it = 0;
    }

    nextIf(cond) {
        if (cond === true) {
            this.next();
        }
        return cond;
    }
}