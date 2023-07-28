import { isNullish, setUnlessNullish } from '../../common.js';
import { EXPRESSION_TYPE }             from '../../mapped.js';

import { Token } from '../stage-1_lexing/Token.js';

export class ExpressionNode {
    constructor(a, opts = { }) {
        opts.op   = opts.op   ?? null;
        opts.b    = opts.b    ?? null;
        opts.c    = opts.c    ?? null;
        opts.type = opts.type ?? EXPRESSION_TYPE.TAG;

        this.a    = a;
        this.type = opts.type;
        
        setUnlessNullish(this, 'op', opts.op);
        setUnlessNullish(this, 'b',  opts.b);
        setUnlessNullish(this, 'c',  opts.c);
    }

    isTerminal() {
        return isNullish(this.op);
    }

    isUnaryExpression() {
        return (!isNullish(this.op) && isNullish(this.b));
    }

    isBinaryExpression() {
        return (!isNullish(this.op) && !isNullish(this.b) && isNullish(this.c));
    }

    isTernaryExpression() {
        return (!isNullish(this.op) && !isNullish(this.b) && !isNullish(this.c));
    }

    isTagExpression() {
        return (this._type === EXPRESSION_TYPE.TAG);
    }

    isValueExpression() {
        return (this._type === EXPRESSION_TYPE.VALUE);
    }
}
