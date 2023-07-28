import * as common from '../../common.js';
import * as mapped from '../../mapped.js';

export class StorageContextNode {
    constructor(root) {
        this._parent   = null;
        this._passlist = new Set();
        this._faillist = new Set();

        if (root instanceof StorageContextNode) {
            this._parent = root;
        }
    }

    fork() {
        return new StorageContextNode(this);
    }

    pass(module) {
        this._passlist.add(module);
        this._faillist.remove(module);
    }

    fail(module) {
        this._faillist.add(module);
        this._passlist.remove(module);
    }

    invert() {
        const tmp = this._passlist;
        this._passlist = this._faillist;
        this._faillist = tmp;
    }

    _halfIntersect(this_list, other_list) {
        outer:
        for (const this_module of this_list) {
            for (const other_module of other_list) {
                if (this_module === other_module) {
                    continue outer;
                }
            }

            this_list.remove(this_module);
        }
    }

    _halfUnion(this_list, other_list) {
        for (const other_module of other_list) {
            this_list.add(other_module);
        }
    }

    intersect(other) {
        other_passlist = other.view;
        other.invert();
        other_faillist = other.view;
        other.invert();

        this._halfIntersect(this._passlist, other_faillist);
        
    }

    union(other) {
        other = other.view;


    }

    view() {
        return Array.from(this._passlist);
    }

    getParent() {
        return this._parent;
    }
}
