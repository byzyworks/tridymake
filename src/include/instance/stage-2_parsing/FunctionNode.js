import { Artifact } from './Artifact.js';
import { Mapping }  from './Mapping.js';

export class FunctionNode extends Mapping {
    constructor(name, opts = { }) {
        opts.args = opts.args ?? [ ];

        super(name);

        this.args = opts.args;
    }

    toArtifact() {
        let signature = [ ];

        signature.push(this.key);
        for (const arg of this.args) {
            signature.push(arg);
        }

        signature = new Artifact(signature);

        return signature;
    }

    execute() {

    }
}
