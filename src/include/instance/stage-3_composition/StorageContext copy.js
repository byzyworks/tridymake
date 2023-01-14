import * as common from '../../common.js';
import * as mapped from '../../mapped.js';

import { Tree } from '../Tree.js';

export class StorageContext {
    constructor(root) {
        this._modules = [ ];
        this.pushCurrent();
        this.tryPushModule(root);
    }

    viewCurrent() {
        return Array.from(this._modules[this._modules.length - 1]);
    }

    pushCurrent() {
        this._modules.push(new Set());
    }

    popCurrent() {
        return this._modules.pop();
    }

    tryPushModule(module) {
        this._modules[this._modules.length - 1].add(module);
    }

    _isExpressionLeaf(expression) {
        return common.isNullish(expression.op);
    }

    async _testModuleValue() {

    }

    _testModuleTag(tested, terminal) {
        let answer;

        switch (terminal) {
            case mapped.EXPRESSION.WILDCARD:
                answer = true;

                break;
            default:
                answer = false;

                let tags = tested.enterGetAndLeave(mapped.TREE_KEY.SHARED.METADATA);
                if (common.isNullish(tags)) {
                    break;
                }
                
                tags = Object.keys(tags);
                for (const tag of tags) {
                    if (terminal === tag) {
                        answer = true;
                        break;
                    }
                }

                break;
        }

        return answer;
    }

    async _testModuleTags(tested, expression) {
        if (this._isExpressionLeaf(expression)) {
            return this._testModuleTag(tested, expression.a);
        } else {
            switch (expression.op) {
                case mapped.EXPRESSION.NOT:
                    return !(await this._testModule(tested, expression.a));
                case mapped.EXPRESSION.AND:
                    return await this._testModule(tested, expression.a) && await this._testModule(tested, expression.b);
                case mapped.EXPRESSION.XOR:
                    const a = await this._testModule(tested, expression.a);
                    const b = await this._testModule(tested, expression.b);
                    return (a && !b) || (b && !a);
                case mapped.EXPRESSION.OR:
                    return await this._testModule(tested, expression.a) || await this._testModule(tested, expression.b);
            }
        }
    }

    async _testModule(tested, expression) {
        switch (expression.type) {
            case mapped.EXPRESSION_TYPE.VALUE:
                return await this._testModuleValue(tested, expression);
            case mapped.EXPRESSION_TYPE.TAG:
                return await this._testModuleTags(tested, expression);
        }
    }

    _initTraversalStats() {
        return {
            traversed:  0,
            tested:     0,
            successful: 0,
            affected:   0
        };
    }

    async _traverseModule(tested, expression, depth, opts = { }) {
        opts.limit     = opts.limit     ?? null;
        opts.offset    = opts.offset    ?? 0;
        opts.stats     = opts.stats     ?? this._initTraversalStats();
        opts.callback  = opts.callback  ?? null;
        opts.test_root = opts.test_root ?? false;

        let matched = false;

        if ((opts.test_root === true) || (opts.stats.traversed > 0)) {
            if (this._depth_markers.has(opts.depth)) {
                matched = await this._testModule(tested, expression);
                if (matched === true) {
                    opts.stats.successful++;
                }
    
                opts.stats.tested++;
            }
        } else {
            
            opts.depth--;
        }

        opts.stats.traversed++;

        opts.depth++;

        if (opts.limit === null) {
            await tested.traverseParallel(mapped.TREE_KEY.SHARED.NESTED, async (tested) => await this._traverseModule(tested, expression, opts));
        } else if (opts.stats.affected < opts.limit) {
            await tested.traverseSerial(mapped.TREE_KEY.SHARED.NESTED, async () => {
                await this._traverseModule(tested, expression, opts);
                if (opts.stats.affected >= opts.limit) {
                    return 'break';
                }
            });
        }

        if (matched && (opts.stats.successful > opts.offset)) {
            if (opts.callback !== null) {
                await opts.callback(tested.getRaw());
            }

            opts.stats.affected++;
        }

        return opts.stats;
    }

    async _traverseModuleGreedyWrapper(tested, expression, opts = { }) {
        opts.stats = opts.stats ?? this._initTraversalStats();

        const promise = this._traverseModule(tested, expression, opts);

        while (true) {
            if (opts.stats.affected > 0) {
                break;
            }

            const done = false;
            promise.then(() => {
                done = true;
            });
            if (done) {
                break;
            }
        }

        if (opts.stats.affected > 0) {
            return true;
        }

        return false;
    }

    async apply(expression) {
        const promises = [ ];
        const current  = this.viewCurrent();
        const callback = (matched) => {
            this.tryPushModule(matched);
        };

        this.pushCurrent();

        this._depth_markers = expression.depth;

        for (const tested of current) {
            /**
             * The -1 for the depth parameter is because '0' depth is different depending on the operation.
             * With 'if' and 'unless', 0 depth refers only to the root.
             * With @ (for changing context/depth), 0 depth refers to the modules directly under the root.
             * Therefore, this initial offset adjustment is needed for the latter.
             * The -1 will cause the root, in this case, to skip over being tested, which is by design.
             */
            promises.push(this._traverseModule(new Tree(tested), expression, -1, { callback: callback, test_root: false }));
        }

        await Promise.all(promises);
    }

    async test(expression) {
        const promises = [ ];
        const current  = this.viewCurrent();
        let   flag     = false;
        const callback = () => {
            flag = true;
        };
        
        this._depth_markers = expression.depth;

        for (const tested of current) {
            promises.push(this._traverseModuleGreedyWrapper(new Tree(tested), expression, 0, { callback: callback, test_root: true }));
        }

        let done = false;
        poll:
        while (!done) {
            for (const promise of promises) {
                promise.then((result) => {
                    done = result;
                });
                if (done) {
                    break poll;
                }
            }

            Promise.all(promises).then((result) => {
                done = result;    
            });
            if (done) {
                break poll;
            }
        }

        return flag;
    }
}
