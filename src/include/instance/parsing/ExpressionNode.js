export class ExpressionNode {
    constructor(a, opts = { }) {
        this.a  = a;
        
        this.op = opts.op ?? undefined;
        this.b  = opts.b  ?? undefined;
        this.c  = opts.c  ?? undefined;

        this.leaf = opts.leaf ?? false;
    }
}
