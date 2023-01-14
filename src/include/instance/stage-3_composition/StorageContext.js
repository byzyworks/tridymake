import * as common from '../../common.js';
import * as mapped from '../../mapped.js';
import { Token } from '../stage-1_lexing/Token.js';

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

    async _testModuleNested(tested, expression, params) {
        if (!this._isExpressionLeaf(expression.a)) {
            return this._testModuleNested(tested, expression.a, params);
        }

        const matched = this._testModuleTag(tested, expression.a);
        if (!matched) {
            return false;
        }
        
        const traversal_function = op.isForwardLookingNestedOperatorExpressionToken() ? tested.forNested : tested.forParents;
        const recursive          = op.isRecursiveNestedOperatorExpressionToken();
        let   predicate_function = null;
        if (op.isChainedNestedOperatorExpressionToken()) {
            predicate_function = (response) => {
                return (response.affected > 0);
            }
        }

        const op = new Token(mapped.TOKEN_KEY.SYMBOL, expression.op);

        if (op.isTransitiveNestedOperatorExpressionToken()) {
            traversal_function()
             && await this._testModule(tested, expression.b, params);
        } else {

        }
    }

    async _testModuleTags(tested, expression, params) {
        if (this._isExpressionLeaf(expression)) {
            return this._testModuleTag(tested, expression.a);
        }
        
        switch (expression.op) {
            case mapped.EXPRESSION.NOT:
                return !(await this._testModule(tested, expression.a, params));
            case mapped.EXPRESSION.AND:
                return await this._testModule(tested, expression.a) && await this._testModule(tested, expression.b, params);
            case mapped.EXPRESSION.XOR:
                const a = await this._testModule(tested, expression.a, params);
                const b = await this._testModule(tested, expression.b, params);
                return (a && !b) || (b && !a);
            case mapped.EXPRESSION.OR:
            case mapped.EXPRESSION.OR_LOW_PRECEDENCE:
                return await this._testModule(tested, expression.a, params) || await this._testModule(tested, expression.b, params);
            case mapped.EXPRESSION.TERNARY_1:
            case mapped.EXPRESSION.TERNARY_LOW_PRECEDENCE_1:
                if (await this._testModule(tested, expression.a, params)) {
                    return await this._testModule(tested, expression.b, params);
                }
                return await this._testModule(tested, expression.c, params);
            default:
                const op = new Token(mapped.TOKEN_KEY.SYMBOL, expression.op);
                if (op.isNestedOperatorExpressionToken()) {
                    return await this._testModuleNested(tested, expression, params);
                }
        }
    }

    async _testModule(tested, expression, params) {
        switch (expression.type) {
            case mapped.EXPRESSION_TYPE.VALUE:
                return await this._testModuleValue(tested, expression, params);
            case mapped.EXPRESSION_TYPE.TAG:
                return await this._testModuleTags(tested, expression, params);
        }
    }

    _initTraversalStats() {
        return {
            tested:     0,
            successful: 0,
            affected:   0
        };
    }

    async _tryModule(tested, expression, params) {
        let matched = false;

        if (!common.isNullish(params.limit) && (params.stats.affected >= params.limit)) {
            return params.stats;
        }

        matched = await this._testModule(tested, expression, params);

        params.stats.tested++;

        if (!matched) {
            return params.stats;
        }

        params.stats.successful++;

        if (params.stats.successful <= params.offset) {
            return params.stats;
        }

        params.stats.affected++;

        if (params.callback === null) {
            return params.stats;
        }

        await params.callback(tested);

        return params.stats;
    }

    async apply(expression, opts = { }) {
        opts.limit  = opts.limit  ?? null;
        opts.offset = opts.offset ?? 0;

        const promises = [ ];
        const current  = this.viewCurrent();
        const traversal_opts = {
            stats:    this._initTraversalStats(),
            limit:    opts.limit,
            offset:   opts.offset,
            callback: (matched) => {
                this.tryPushModule(matched);
            }
        };

        this.pushCurrent();

        for (const root of current) {
            root.forNested((tested) => {
                promises.push(this._tryModule(tested, expression, traversal_opts));
            });
        }

        await Promise.all(promises);

        return traversal_opts.stats;
    }

    async test(expression, opts = { }) {
        opts.ignore_root = opts.ignore_root ?? false;

        const promises = [ ];
        const current  = this.viewCurrent();
        let   flag     = false;
        const traversal_opts = {
            stats:    this._initTraversalStats(),
            limit:    1,
            offset:   0,
            callback: () => {
                flag = true;
            }
        };

        for (const tested of current) {
            if (opts.ignore_root === true) {
                root.forNested((tested) => {
                    promises.push(this._tryModule(tested, expression, traversal_opts));
                });
            } else {
                promises.push(this._tryModule(tested, expression, traversal_opts));
            }
        }

        await Promise.all(promises);

        return flag;
    }
}
