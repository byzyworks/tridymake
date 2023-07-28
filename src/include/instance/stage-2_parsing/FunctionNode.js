import { Artifact } from './Artifact.js';
import { Mapping }  from './Mapping.js';

export class FunctionNode extends Mapping {
    constructor(name, opts = { }) {
        opts.args = opts.args ?? [ ];
        opts.alt  = opts.alt  ?? null;

        super(name);

        this.args = opts.args;
        this.alt  = opts.alt;
    }

    execute() {

    }
}
