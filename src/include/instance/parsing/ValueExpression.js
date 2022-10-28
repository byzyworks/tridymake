import { ExpressionNode } from "./ExpressionNode.js";

export class ValueExpression extends ExpressionNode {
    constructor(a, opts = { }) {
        super(a, opts);
    }
}
