import * as common from '../../common.js';
import * as error  from '../../error.js';
import * as mapped from '../../mapped.js';

import { ExpressionNode } from '../stage-2_parsing/ExpressionNode.js';
import { StorageNode }    from './StorageNode.js';

export class StorageContextNode {
    constructor(root, opts = { }) {
        opts.expression = opts.expression ?? new ExpressionNode(mapped.EXPRESSION.WILDCARD);

        this._parent     = null;
        this._storage    = new Set();

        if (root instanceof StorageContextNode) {
            this._parent = root;

            this._expression = new ExpressionNode(root._expression, { op: mapped.EXPRESSION.RECURSIVE_FORWARD_TRANSITION , b: opts.expression });
        } else if (root instanceof StorageNode) {
            this._storage.add(root);

            if (!common.isNullish(opts.expression)) {

            }
        }
    }

    async _testStorageNodeValue() {

    }

    _testStorageNodeTag(tested, terminal) {
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

    async _testStorageNodeTags(tested, expression) {
        if (expression.isTerminal()) {
            return this._testStorageNodeTag(tested, expression.a);
        }
        
        switch (expression.op) {
            case mapped.EXPRESSION.NOT:
                return !(await this._testStorageNode(tested, expression.a));
            case mapped.EXPRESSION.AND:
                return await this._testStorageNode(tested, expression.a) && await this._testStorageNode(tested, expression.b);
            case mapped.EXPRESSION.XOR:
                const a = await this._testStorageNode(tested, expression.a);
                const b = await this._testStorageNode(tested, expression.b);
                return (a && !b) || (b && !a);
            case mapped.EXPRESSION.OR:
            case mapped.EXPRESSION.OR_LOW_PRECEDENCE:
                return await this._testStorageNode(tested, expression.a) || await this._testStorageNode(tested, expression.b);
            case mapped.EXPRESSION.TERNARY_1:
            case mapped.EXPRESSION.TERNARY_LOW_PRECEDENCE_1:
                if (await this._testStorageNode(tested, expression.a)) {
                    return await this._testStorageNode(tested, expression.b);
                }
                return await this._testStorageNode(tested, expression.c);
            default:
                const op = new Token(mapped.TOKEN_KEY.SYMBOL, expression.op);
                if (op.isInclusiveTransitiveNestedOperatorExpressionToken()) {
                    return await this._testStorageNode(tested, expression.a) && await this._testStorageNode(tested, expression.b);
                }
        }
    }

    async _testStorageNodeNested(tested, expression) {
        const op = new Token(mapped.TOKEN_KEY.SYMBOL, expression.op);

        let   test;
        let   direction;
        const recursive = op.isRecursiveNestedOperatorExpressionToken();
        const inverse   = op.isInverseNonTransitiveNestedOperatorExpressionToken();
        const inclusive = op.isInclusiveTransitiveNestedOperatorExpressionToken()

        /**
         * "Tested" is always the storage node that will be modified if the expression evaluates to true.
         * Likewise, to avoid overcomplicating the traversal process, "expressional traversal" (handled from this function) is forcibly read-only.
         * This is contrasted from "contextual traversal", which is done for all modules whenever a context change is performed.
         * This is handled from outside this function, and is how it receives a node to perform expressional traversal from.
         * 
         * The "non-transitive" lookahead/lookbehind/lookaround operators are obviously read-only in the sense they can't modify any node except the test root.
         * However, since contextual traversal is comprehensive over all nodes, the "transitive" operators can also be converted to being "read-only" outside the test root.
         * This is done by simply reframing transitive operations as non-transitive by further reframing the modified node as the test root.
         * 
         * For instance, the two expressions have the exact same effect:
         *   a / b: "From all nodes a, move the context up one level to b and modify b"
         *   b < a: "From all nodes b, modify if and only if it is parented by a"
         * Or in the case of backwards transitions:
         *   a % b: "From all nodes a, move the context down one level to b and modify b"
         *   b > a: "From all nodes b, modify if and only if it is a parent to b"
         * 
         * Only in the latter case are we not moving the context / changing the test root, hence all that can be handled before this function is ever called.
         * However, it does make comprehensive contextual traversal necessary such that all nodes need to be tested for modification.
         */
        if (op.isNonTransitiveNestedOperatorExpressionToken()) {
            test = expression.b;

            if (op.isLookaheadNestedOperatorExpressionToken()) {
                direction = mapped.DIRECTION.CHILDREN;
            } else if (op.isLookbehindNestedOperatorExpressionToken()) {
                direction = mapped.DIRECTION.PARENTS;
            } else if (op.isLookaroundNestedOperatorExpressionToken()) {
                direction = mapped.DIRECTION.SIBLINGS;
            }
        } else if (op.isTransitiveNestedOperatorExpressionToken()) {
            test = expression.a;

            if (op.isForwardTransitiveNestedOperatorExpressionToken()) {
                direction = mapped.DIRECTION.PARENTS;
            } else if (op.isBackwardTransitiveNestedOperatorExpressionToken()) {
                direction = mapped.DIRECTION.CHILDREN;
            } else if (op.isSidewardTransitiveNestedOperatorExpressionToken()) {
                direction = mapped.DIRECTION.SIBLINGS;
            }
        }

        search_function(this._testStorage(), { recursive: recursive });
        const answer = this._testStorage()

        if (inclusive) {
            return await this._testStorageNodeTags(tested, expression);
        }

        return false;
    }

    async _testStorageNode(tested, expression) {
        switch (expression.type) {
            case mapped.EXPRESSION_TYPE.VALUE:
                return await this._testStorageNodeValue(tested, expression);
            case mapped.EXPRESSION_TYPE.TAG:
                const op = new Token(mapped.TOKEN_KEY.SYMBOL, expression.op);
                if (op.isNestedOperatorExpressionToken()) {
                    return await this._testStorageNodeNested(tested, expression);
                }
                return await this._testStorageNodeTags(tested, expression);
        }
    }

    async _tryStorageNode(tested, expression, callback) {
        let matched = false;

        matched = await this._testStorageNode(tested, expression);
        if (matched) {
            await callback(tested);
        }

        return matched;
    }

    _storageNodeTraversalFunction(direction) {
        switch (direction) {
            case mapped.DIRECTION.PARENTS:
                return StorageNode.forParents;
            case mapped.DIRECTION.SIBLINGS:
                return StorageNode.forSiblings;
            case mapped.DIRECTION.CHILDREN:
                return StorageNode.forNested;
        }
    }

    async _traverseStorageNode(root, direction, expression, callback, opts = { }) {
        opts.recursive = opts.recursive ?? true;

        const traversal_function = this._storageNodeTraversalFunction(direction).bind(root);

        const composer = this;
        await traversal_function(async function() {
            await composer._tryStorageNode(this, expression, callback);
        }, { recursive: opts.recursive });
    }

    async _traverseStorageContext(direction, expression, callback, opts = { }) {
        opts.ignore_root   = opts.ignore_root   ?? true;
        opts.ignore_nested = opts.ignore_nested ?? false;
        opts.recursive     = opts.recursive     ?? true;
        opts.root          = opts.root          ?? null;

        const promises = [ ];

        const current = common.isNullish(opts.root) ? this.view() : [ opts.root ];

        for (const root of current) {
            if (!opts.ignore_root) {
                promises.push(this._tryStorageNode(root, expression, callback));
            }

            if (!opts.ignore_nested) {
                const traversal_function = this._storageNodeTraversalFunction(direction).bind(root);

                traversal_function((tested) => {
                    child_opts = {
                        ignore_root:   !opts.ignore_root,
                        ignore_nested: !opts.recursive,
                        recursive:     opts.recursive,
                        root:          tested,
                    };

                    promises.push(this._traverseStorageContext(expression, callback, child_opts));
                });
            }
        }

        await Promise.all(promises);
    }

    async _testStorage(expression, opts = { }) {
        opts.recursive = opts.recursive ?? false;
        opts.universal = opts.universal ?? false;
        opts.inverse   = opts.inverse   ?? false;
        opts.root      = opts.root      ?? null;
        opts.direction = opts.direction ?? mapped.DIRECTION.CHILDREN;

        /**
         * Note about universal quantification: "For all a, b is true" is equivalent to "There does not exist a where b is not true".
         * Regardless of attempting universal or existential quantification, both can be framed existentially (and vice versa).
         * For example:
         * 
         * Existential:         "There exists a where b is true"
         * Universal:           "There does not exist a where b is not true"
         * Inverse Universal:   "There does not exist a where b is true"
         * Inverse Existential: "There exists a where b is not true"
         * 
         * Existential is preferrable because the approach is inherently more optimized (even the language of it suggests that).
         * It can stop looking once, for one module at least, the condition (expression) becomes true, or in the inverse cases, becomes false.
         */

        if ((opts.universal && !opts.inverse) || (!opts.universal && opts.inverse)) {
            expression = new ExpressionNode(expression, { op: mapped.EXPRESSION.NOT });
        }

        let   count    = 0;
        const callback = (matched) => {
            count++;
        }

        if (common.isNullish(opts.root)) {
            await this._traverseStorageContext(opts.direction, expression, callback, { ignore_root: false, ignore_nested: !opts.recursive, recursive: opts.recursive });
        } else {
            await this._traverseStorageNode(opts.root, opts.direction, expression, callback, { recursive: opts.recursive });
        }

        let answer = count > 0;

        if (opts.universal) {
            answer = !answer;
        }

        return answer;
    }

    fork() {
        return new StorageContextNode(this);
    }

    view() {
        return Array.from(this._storage);
    }

    getParent() {
        return this._parent;
    }

    get
}
