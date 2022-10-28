export class FunctionNode {
    constructor(name, opts = { }) {
        opts.args = opts.args ?? [ ];

        this.name = name;
        this.args = opts.args;
    }

    resolve() { }
}
