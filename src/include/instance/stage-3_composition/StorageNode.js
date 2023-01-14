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

    forMetadata(callback) {
        for (const key of Object.keys(this[mapped.TREE_KEY.SHARED.NESTED])) {
            const value = this[mapped.TREE_KEY.SHARED.NESTED][key];

            callback(key, value);
        }
    }

    forNested(callback, opts = { }) {
        opts.predicate = opts.predicate ?? null;
        opts.recursive = opts.recursive ?? false;

        let response = null;
        for (const nested of this[mapped.TREE_KEY.SHARED.NESTED]) {
            response = callback(nested);

            if (opts.recursive === true) {
                if (common.isNullish(opts.predicate) || opts.predicate(response)) {
                    nested.forNested(callback, opts);
                }
            } else {
                if (!common.isNullish(opts.predicate) && opts.predicate(response)) {
                    nested.forNested(callback, opts);
                }
            }
        }
    }

    getParent() {
        return this._parent;
    }

    forParents(callback) {
        opts.predicate = opts.predicate ?? null;
        opts.recursive = opts.recursive ?? false;

        const parents = [ ];

        let parent = this._parent;
        while (!common.isNullish(parent)) {
            parents.push(parent);

            if (opts.recursive !== true) {
                break;
            }

            const parent = parent.parent;
        }

        let response = null;
        for (const parent of parents) {
            response = callback(parent);

            if (opts.recursive === true) {
                if (!common.isNullish(opts.predicate) && !opts.predicate(response)) {
                    break;
                }
            } else {
                if (common.isNullish(opts.predicate) || !opts.predicate(response)) {
                    break;
                }
            }
        }
    }
}