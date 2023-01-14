import assert from 'assert';

/**
 * The depth marker set class is used to account for depth markers produced by recursive transitive operators.
 * Normally, a single depth marker '{ 1 }' would suffice for a non-transitive operation.
 * That's because the answer to a transitive operation from the (relative) root is always 1 level below, so it allows us to avoid having to check at any other depth.
 * If there were possible answers at any other depth, then the set would contain the possible depths of those answers too.
 * 
 * The problem comes up with recursive transitive operators because the depth can be at any possible amount greater than the expression node's depth markers.
 * We cannot add every possible number to a normal set than is greater or lower than a particular number.
 * The depth set is to account for that by having lower and upper "bounds" (inclusive). 
 * Normally, these are infinity and negative infinity respectively. At these values, it behaves like a normal (numeric) set.
 * Any amount higher than the upper bound, and any amount lower than the lower bound is considered part of the set.
 * Amounts which are between the upper and lower bounds that exist individually are added to an internal set.
 * 
 * As an example, if the lower bound is 100, the upper bound is 200, and the internal set looks like { 101, 103, 105 },
 * then the presented set would be identical to { ..., 98, 99, 100, 101, 103, 105, 200, 201, 202, ... }
 */
export class DepthMarkerSet {
    constructor() {
        this._upper  = Infinity;
        this._points = new Set();
        this._lower  = -Infinity;
    }

    _validateNumber(number) {
        assert((typeof number === 'number') && Number.isInteger(number) && (number >= 0), 'Depth markers need to be non-negative integers.');
    }

    copy() {
        const copy = new DepthMarkerSet();

        copy.setUpper(this._upper);
        this.forEachPointValue((value) => {
            copy.add(value);
        });
        copy.setLower(this._lower);

        return copy;
    }

    merge(other) {
        if (other.getUpper() < this._upper) {
            this.setUpper(other.getUpper());
        }
        
        if (other.getLower() > this._lower) {
            this.setLower(other.getLower());
        }

        other.forEachPointValue((value) => {
            this.add(value);
        });
    }

    offset(number) {
        assert((typeof number === 'number') && Number.isInteger(number));

        this._upper += number;

        const new_points = new Set();
        this._points.forEach((current) => {
            this._points.delete(current);
            new_points.add(current + number);
        });
        this._points = new_points;

        this._lower += number;
    }

    add(number) {
        this._validateNumber(number);

        if ((this._upper - 1) === number) {
            this._upper = number;
        } else if ((this._lower + 1) === number) {
            this._lower = number;
        } else if ((number > this._lower) && (number < this._upper)) {
            this._points.add(number);
        }
    }

    delete(number) {
        this._validateNumber(number);

        if (this._upper <= number) {
            for (let i = this._upper; i < number; i++) {
                this._points.add(i);
            }
            this._upper = number + 1;
        } else if (this._lower >= number) {
            for (let i = this._upper; i > number; i--) {
                this._points.add(i);
            }
            this._lower = number - 1;
        } else {
            this._points.delete(number);
        }
    }

    forEachPointValue(callback) {
        this._points.forEach(callback);
    }

    makeEmpty() {
        this._upper  = Infinity;
        this._points = new Set();
        this._lower  = -Infinity;
    }

    makeFull() {
        this._upper  = 0;
        this._points = new Set();
        this._lower  = -Infinity;
    }

    getUpper() {
        return this._upper;
    }

    setUpper(number) {
        // Special case where infinity is allowed.
        if (number < Infinity) {
            this._validateNumber(number);
        }

        if (number <= this._lower) {
            this.makeFull();
        } else if (number === Infinity) {
            this._upper = number;
        } else {
            this._points.forEach((current) => {
                if (current >= number) {
                    this._points.delete(current);
                }
            });

            this._upper = number;
        }
    }

    getLower() {
        return this._lower;
    }

    setLower(number) {
        if (number > -Infinity) {
            this._validateNumber(number);
        }

        if (number >= this._upper) {
            this.makeFull();
        } else if (number === -Infinity) {
            this._lower = number;
        } else {
            this._points.forEach((current) => {
                if (current <= number) {
                    this._points.delete(current);
                }
            });

            this._lower = number;
        }
    }

    getMaximum() {
        if (this._upper < Infinity) {
            return Infinity;
        }

        let max = -Infinity;
        this._points.forEach((value) => {
            if (value > max) {
                max = value;
            }
        });
        if (max > -Infinity) {
            return max;
        }

        if (this._lower >= 0) {
            return this._lower;
        }

        return null;
    }

    getMinimum() {
        if (this._lower >= 0) {
            return 0;
        }

        let min = Infinity;
        this._points.forEach((value) => {
            if (value < min) {
                min = value;
            }
        });
        if (min < Infinity) {
            return min;
        }

        if (this._upper < Infinity) {
            return this._upper;
        }

        return null;
    }

    has(number) {
        if ((typeof number !== 'number') || !Number.isInteger(number) || (number < 0)) {
            return false;
        }

        if (number >= this._upper) {
            return true;
        }

        if (number <= this._lower) {
            return true;
        }

        this._points.forEach((current) => {
            if (number === current) {
                return true;
            }
        });

        return false;
    }
}