import { isNullish, setUnlessNullish } from '../../common.js';

import { EXPRESSION_TYPE } from '../../mapped.js';

export class ExpressionNode {
    constructor(a, opts = { }) {
        this.a = a;
        
        setUnlessNullish(this, 'op', opts.op);
        setUnlessNullish(this, 'b',  opts.b);
        setUnlessNullish(this, 'c',  opts.c);

        this.type = opts.type ?? EXPRESSION_TYPE.TAG;
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
