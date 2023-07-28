import * as common from '../common.js';

/**
 * A generalized class that is basically an iterable n-ary tree, used as both a skeleton for the Tridy database, and for the abstract syntax tree used to prepare it.
 * Underneath, it's just an object that the class method provides a means to traversing around via. iterator, placing values and such.
 * 
 * Primarily, nodes are accessed by entering and leaving "positions", which are tracked as an array of array indices leading up from the root.
 * The position identifies a node in the tree by its location, being the indices needed to reach it from the root.
 * A reference/pointer to the node is created (if it doesn't exist yet) once a write is requested at the currently-set position.
 * 
 * Since all non-leaf nodes are either arrays or maps themselves, every node in the tree can be accessed in such a way.
 * However, it means having to keep track of the position stack so long as the same tree is used.
 * 
 * When it no longer serves to access the tree through an iterable, getRaw() can be used to acquire the underlying object.
 */
export class Tree {
    constructor(imported = null) {
        this._pos         = [ ];
        this._changed_pos = false;
        this._tree        = imported ?? { };
        this._ptr         = this._tree;
    }

    /**
     * This does not actually change the reference to match the current position exactly. Instead, it sets the pointer to the current position minus the last index.
     * This is because then accessing the pointer via. the last index (via. ptr[this._getTopPos()]) means the pointer has a reference to that last index, rather than just the value of it.
     * This is needed so the tree can be written to at the location of the last index, and opposed to just being able to read at the index.
     * 
     * If the position of the second-to-last index does not exist yet in the tree, it will be generated first based on the type of the last index.
     * If it is a number, then that must mean what's at the second-to-last index is an array. If it's a string, that must mean it's a map.
     * If it doesn't do this first, it will try to access an element of undefined, which inevitably would throw errors.
     */
    _updatePtrs() {
        if (!this._changed_pos) {
            return;
        }

        this._ptr = this._tree;

        for (let i = 0; i < this._pos.length - 1; i++) {
            if (this._ptr[this._pos[i]] === undefined) {
                if (Number.isInteger(this._pos[i])) {
                    if (Number.isInteger(this._pos[i + 1])) {
                        this._ptr.push([ ]);
                    } else {
                        this._ptr.push({ });
                    }
                } else {
                    if (Number.isInteger(this._pos[i + 1])) {
                        this._ptr[this._pos[i]] = [ ];
                    } else {
                        this._ptr[this._pos[i]] = { };
                    }
                }
            }
            
            this._ptr = this._ptr[this._pos[i]];
        }

        this._changed_pos = false;
    }

    enterPos(pos) {
        pos = common.isArray(pos) ? pos : [ pos ];

        for (const part of pos) {
            this._pos.push(part);
        }

        this._changed_pos = true;
    }

    leavePos(times = 1) {
        let pos;
        for (let i = 0; i < times; i++) {
            pos = this._pos.pop();
        }

        this._changed_pos = true;

        return pos;
    }

    getFullPos() {
        return common.deepCopy(this._pos);
    }

    getTopPos() {
        if (this._pos.length === 0) {
            return null;
        }
        return this._pos[this._pos.length - 1];
    }

    getPosValue() {
        let ptr = this._tree;
        for (let i = 0; i < this._pos.length - 1; i++) {
            if (!common.isObject(ptr[this._pos[i]])) {
                return undefined;
            }
            ptr = ptr[this._pos[i]];
        }

        const pos = this.getTopPos();
        if (pos === null) {
            return ptr;
        }
        return ptr[pos];
    }

    getPosLength() {
        const value = this.getPosValue();
        if (!common.isArray(value)) {
            return null;
        }
        return value.length;
    }

    setPosValue(value) {
        this._updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            this._tree = value;
        } else {
            this._ptr[pos] = value;
        }
    }

    putPosValue(value) {
        this._updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            if (this._tree === undefined) {
                this._tree = [ ];
            } else if (!Array.isArray(this._tree)) {
                const temp = this._tree;
                this._tree = [ ];
                this._tree.push(temp);
            }
            return this._tree.push(value);
        } else {
            if (this._ptr[pos] === undefined) {
                this._ptr[pos] = [ ];
            } else if (!Array.isArray(this._ptr[pos])) {
                const temp = this._ptr[pos];
                this._ptr[pos] = [ ];
                this._ptr[pos].push(temp);
            }
            return this._ptr[pos].push(value);
        }
    }

    deletePosValue() {
        this._updatePtrs();

        const pos = this.getTopPos();
        if (pos === null) {
            return;
        }
        
        delete this._ptr[pos];
    }

    enterGetAndLeave(pos) {
        pos = common.isArray(pos) ? pos : [ pos ];

        for (const part of pos) {
            this.enterPos(part);
        }
        const result = this.getPosValue();
        for (let i = 0; i < pos.length; i++) {
            this.leavePos();
        }

        return result;
    }

    enterSetAndLeave(pos, value, opts = { }) {
        opts.ignore_undefined = opts.ignore_undefined ?? false;

        if (opts.ignore_undefined && (value === undefined)) {
            return;
        }

        pos = common.isArray(pos) ? pos : [ pos ];
    
        for (const part of pos) {
            this.enterPos(part);
        }
        this.setPosValue(value);
        for (let i = 0; i < pos.length; i++) {
            this.leavePos();
        }
    }

    enterPutAndLeave(pos, value, opts = { }) {
        opts.ignore_undefined = opts.ignore_undefined ?? false;

        if (opts.ignore_undefined && (value === undefined)) {
            return;
        }

        pos = common.isArray(pos) ? pos : [ pos ];

        for (const part of pos) {
            this.enterPos(part);
        }
        this.putPosValue(value);
        for (let i = 0; i < pos.length; i++) {
            this.leavePos();
        }
    }

    enterDeleteAndLeave(pos) {
        pos = common.isArray(pos) ? pos : [ pos ];

        for (const part of pos) {
            this.enterPos(part);
        }
        this.deletePosValue();
        for (let i = 0; i < pos.length; i++) {
            this.leavePos();
        }
    }

    isPosEmpty() {
        let ptr = this._tree;
        for (let i = 0; i < this._pos.length - 1; i++) {
            if (!common.isObject(ptr[this._pos[i]])) {
                return true;
            }
            ptr = ptr[this._pos[i]];
        }

        const pos = this.getTopPos();
        if (pos === null) {
            return common.isEmpty(ptr);
        }
        return common.isEmpty(ptr[pos]);
    }

    isPosUndefined() {
        return this.getPosValue() === undefined;
    }

    enterNested(nest_key, opts = { }) {
        opts.append_mode = opts.append_mode ?? true;

        if (this.getTopPos() !== nest_key) {
            this.enterPos(nest_key);
        }

        if (opts.append_mode) {
            const done = this.getPosValue() ?? [ ];
            this.enterPos(done.length);
        } else {
            this.enterPos(0);
        }
    }

    forNested(nest_key, callback) {
        for (const nested of this[nest_key]) {
            callback(nested);
        }
    }

    leaveNested(nest_key) {
        while ((this.leavePos() !== nest_key) && !this.isPosGlobalRoot());
    }

    isPosGlobalRoot() {
        return this._pos.length === 0;
    }

    toGlobalRoot() {
        while (!this.isPosGlobalRoot()) {
            this.leavePos();
        }
    }

    isPosLocalRoot(nest_key) {
        return this.isPosGlobalRoot() || ((this._pos.length >= 2) && (typeof this._pos[this._pos.length - 1] === 'number') && (this._pos[this._pos.length - 2] === nest_key));
    }

    toLocalRoot(nest_key) {
        while (!this.isPosLocalRoot(nest_key)) {
            this.leavePos();
        }
    }

    nextItem(nest_key = null) {
        if (this._pos.length === 1) {
            const idx = this.leavePos();
            this.enterPos(idx + 1);
        } else if (this._pos.length > 1) {
            if (nest_key === null) {
                while (!Number.isInteger(this._pos[this._pos.length - 1])) {
                    this.leavePos();
                }
            } else {
                while (this._pos[this._pos.length - 2] !== nest_key) {
                    this.leavePos();
                }
            }
    
            if (this.getTopPos() < 0) {
                this.leavePos();
                this.enterPos(0);
            } else {
                const idx = this.leavePos();
                this.enterPos(idx + 1);
            }
        }
    }

    traverseSync(nest_key, callback) {
        this.enterPos(nest_key);
        if (!this.isPosEmpty()) {
            this.enterPos(0);
            while (!this.isPosUndefined()) {
                const tested = new Tree(this.getPosValue());
                const action = callback(tested);

                if (action === mapped.INTERNAL_OPERATION.BREAK) {
                    break;
                } else if (action === mapped.INTERNAL_OPERATION.STRIDE) {
                    continue;
                }

                this.nextItem();
            }
            this.leavePos();
        }
        this.leavePos();
    }

    async traverse(nest_key, callback, opts = { }) {
        opts.ordered = opts.ordered ?? true;

        const responses = [ ];

        this.enterPos(nest_key);
        if (!this.isPosEmpty()) {
            this.enterPos(0);
            while (!this.isPosUndefined()) {
                const tested = new Tree(this.getPosValue());
                let   response;

                if (opts.ordered) {
                    response = await callback(tested);

                    if (response === mapped.INTERNAL_OPERATION.BREAK) {
                        break;
                    } else if (response === mapped.INTERNAL_OPERATION.STRIDE) {
                        continue;
                    }
                } else {
                    response = callback(tested);
                }

                responses.push(response);

                this.nextItem();
            }
            this.leavePos();
        }
        this.leavePos();

        if (!opts.ordered) {
            await Promise.all(responses);
        }

        return responses;
    }

    getRaw() {
        return this._tree;
    }
}
