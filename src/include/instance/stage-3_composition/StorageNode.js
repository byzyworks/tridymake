import * as common from '../../common.js';
import * as mapped from '../../mapped.js';

export class StorageNode {
    constructor(opts = { }) {
        opts.parent = opts.parent ?? null;

        this._parent = opts.parent;

        // Do not declare:
        // this[mapped.TREE_KEY.SHARED.DATA];
        // this[mapped.TREE_KEY.SHARED.METADATA];
    }

    _resolveNulls(value) {
        if (value === mapped.SPECIAL_VALUE.NULL) {
            return null;
        }

        if (value === mapped.SPECIAL_VALUE.EMPTY) {
            return undefined;
        }

        // note that mapped.SPECIAL_VALUE.UNDEFINED has special behavior associated to it, so the logic for that is not handled here.

        return value;
    }

    setData(value) {
        value = this._resolveNulls(value);

        this[mapped.TREE_KEY.SHARED.DATA] = value;
    }

    getData() {
        return this[mapped.TREE_KEY.SHARED.DATA];
    }

    setMetadata(key, value) {
        value = this._resolveNulls(value);

        if (common.isNullish(this[mapped.TREE_KEY.SHARED.METADATA])) {
            this[mapped.TREE_KEY.SHARED.METADATA] = { };
        }

        if (value === mapped.SPECIAL_VALUE.UNDEFINED) {
            delete this[mapped.TREE_KEY.SHARED.METADATA][key];
        } else {
            this[mapped.TREE_KEY.SHARED.METADATA][key] = value;
        }

        if (common.isNullish(this[mapped.TREE_KEY.SHARED.METADATA])) {
            delete this[mapped.TREE_KEY.SHARED.METADATA];
        }
    }

    getMetadata(key) {
        if (common.isNullish(this[mapped.TREE_KEY.SHARED.METADATA])) {
            return undefined;
        }

        return this[mapped.TREE_KEY.SHARED.METADATA][key];
    }

    getParent() {
        return this._parent;
    }

    getParents() {
        const parents = [ ];

        let parent = this._parent;
        while (!common.isNullish(parent)) {
            parents.push(parent);

            parent = parent.parent;
        }

        return parents;
    }

    getSiblings() {
        const siblings = [ ];

        if (!common.isNullish(this._parent)) {
            this._parent.forNested((child) => {
                if (child !== this) {
                    siblings.push(child);
                }
            })
        }

        return siblings;
    }

    getChildren() {
        return this[mapped.TREE_KEY.SHARED.NESTED];
    }

    async _forEach(direction, callback, opts = { }) {
        opts.recursive = opts.recursive ?? false;
        opts.ordered   = opts.ordered   ?? true;

        let nodes;
        switch (direction) {
            case mapped.DIRECTION.PARENTS:
                nodes = opts.recursive ? this.getParents(opts) : [ this._parent ];
                break;
            case mapped.DIRECTION.SIBLINGS:
                nodes = this.getSiblings();
                break;
            case mapped.DIRECTION.CHILDREN:
                nodes = this[mapped.TREE_KEY.SHARED.NESTED];
                break;
        }

        let responses = [ ];

        for (const node of nodes) {
            let response;

            if (opts.ordered) {
                response = await callback(node);

                if (response === mapped.INTERNAL_OPERATION.BREAK) {
                    break;
                } else if ((direction === mapped.DIRECTION.CHILDREN) && (response === mapped.INTERNAL_OPERATION.STRIDE)) {
                    continue;
                }
            } else {
                response = callback(node);
            }

            responses.push(response);

            if ((direction === mapped.DIRECTION.CHILDREN) && opts.recursive) {
                responses.push(await node._forEach(callback, opts));
            }
        }

        if (!opts.ordered) {
            responses = await Promise.all(responses);
        }

        return responses;
    }

    async forParents(callback, opts = { }) {
        opts.ordered   = opts.ordered   ?? true;
        opts.recursive = opts.recursive ?? false;

        return this._forEach(mapped.DIRECTION.PARENTS, callback, { recursive: opts.recursive, ordered: opts.ordered });
    }

    async forSiblings(callback, opts = { }) {
        opts.ordered = opts.ordered ?? true;

        return this._forEach(mapped.DIRECTION.SIBLINGS, callback, { ordered: opts.ordered });
    }

    async forNested(callback, opts = { }) {
        opts.recursive = opts.recursive ?? false;
        opts.ordered   = opts.ordered   ?? true;

        return this._forEach(mapped.DIRECTION.CHILDREN, callback, { recursive: opts.recursive, ordered: opts.ordered });
    }
}