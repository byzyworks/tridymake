import { Mapping } from './Mapping.js';

export class FunctionNode extends Mapping {
    constructor(name, opts = { }) {
        opts.args = opts.args ?? [ ];

        super(name);

        this.args = opts.args;
    }
}
