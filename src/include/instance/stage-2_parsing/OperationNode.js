import * as mapped from '../../mapped.js';

export class OperationNode {
    constructor(opts = { }) {
        opts.operation = opts.operation ?? mapped.OPERATION.BLOCK;

        this.operation = opts.operation;
    }
}
