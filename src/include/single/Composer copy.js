import path              from 'path';
import { fileURLToPath } from 'url';

import seedrandom from 'seedrandom';
import shuffle    from 'knuth-shuffle-seeded';
import uuid       from 'uuid-random';

import { ContextParser } from './ContextParser.js';

import * as common from '../common.js';
import * as error  from '../error.js';
import * as mapped from '../mapped.js';

import { Pairable }  from '../instance/Pairable.js';
import { StateTree } from '../instance/StateTree.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export class Composer {
    constructor() {
        this._target = new StateTree();
        this.setRandomSeeds();
    }

    getRandomSeeds() {
        return this._random.seeds;
    }

    setRandomSeeds(seeds = undefined) {
        /**
         * About random seeds, the program by default should use at least two.
         * The first one is the one that Tridy uses for its random number generation.
         * The second (and any more if there are) is specifically for functions to use.
         * Why? The first seed can be used to control the structure of the output using the built in variables like @random and @shuffle.
         * The second seed can be used to control string values returned by functions, which Tridy by default has functions that do.
         * The reasoning is for Tridy's intended purpose, which is to generate (gamified) cybersecurity configuration data.
         * While the first seed can force the same infrastructure and sequence of Tridy statements,
         * the separation of concerns allows different random values (like passwords) to be generated and managed separately (with ultimately the same setup).
         */

        // Do not unflatten this; "prng" references "seeds".
        this._random       = { }; 
        this._random.seeds = seeds ?? [ ];
        while (this._random.seeds.length < 1) {
            this._random.seeds.push(seedrandom().quick());
        }
        this._random.prngs = this._random.seeds.map((seed) => new seedrandom(seed, { entropy: false }));
    }

    _getModuleShuffledIndex(lvl, index, main_query_random) {
        const last_index  = index.real[lvl];
        const last_extent = index.extent[lvl];

        // Using the query random plus the parent's index ensures all children of the same parent use the same seed.
        let suffix = index.real.slice(0, lvl).join(':');
        if (!common.isEmpty(suffix)) {
            suffix = ':' + suffix;
        }
        const seed = main_query_random + suffix;

        const shuffled = shuffle([...Array(last_extent).keys()], seed);

        return shuffled[last_index];
    }

    async _matchingTagValue(test, b, lvl, index, query_randoms) {
        if (!common.isNullish(test.function)) {
            const func   = test.function[0];
            const params = {
                index:  common.deepCopy(index),
                random: [ ],
                args:   test.function
            };
            for (let i = 0; i < this._random.seeds.length; i++) {
                operate.params.random.push({
                    global: this._random.seeds[i],
                    query:  query_randoms[i],
                    call:   this._random.prngs[i]()
                })
            }

            const result = await this._functionCall(func, params, { primitive_only: true });

            return result;
        }

        // Note the variables below all have a minimum value of 0 (inclusive).
        // This does not include tags, which can store negative values.
        switch (test.val) {
            case mapped.CONTEXT_MAP.VARIABLE.DEPTH:
                return lvl;
            case mapped.CONTEXT_MAP.VARIABLE.CHILDREN:
                return index.extent[lvl + 1];
            case mapped.CONTEXT_MAP.VARIABLE.INDEX:
                if (!isNaN(b.val) && (Number(b.val) < 0)) {
                    return (index.extent[lvl] - index.real[lvl]) * -1;
                }
                return index.real[lvl];
            case mapped.CONTEXT_MAP.VARIABLE.SIBLINGS:
                return index.extent[lvl] - 1;
            case mapped.CONTEXT_MAP.VARIABLE.QUERY_RANDOM:
                return query_randoms[0];
            case mapped.CONTEXT_MAP.VARIABLE.SHUFFLED_INDEX:
                if (!isNaN(b.val) && (Number(b.val) < 0)) {
                    return (index.extent[lvl] - this._getModuleShuffledIndex(lvl, index, query_randoms[0])) * -1;
                }
                return this._getModuleShuffledIndex(lvl, index, query_randoms[0]);
            case mapped.CONTEXT_MAP.VARIABLE.NEW_RANDOM:
                return this._random.prngs[0]();
            default:
                for (const tag of index.context[lvl]) {
                    if (test.val === Pairable.getIdentifier(tag)) {
                        return Pairable.getValue(tag);
                    }
                }

                /**
                 * Literal null can be a tag value, and undefined is returned if the tag is present, but doesn't have a value.
                 * Returning undefined on a tag not present causes problems where $(special_tag == @none) will match tags that aren't special_tag.
                 * @none (undefined) should only match if special_tag is present in the module *and* doesn't have a value.
                 * A tag value, though, can't be anything other than a primitive.
                 * Hence, an empty object can signal that the required tag identifier for comparison is lacking.
                 */
                return { };
        }
    }

    _verifyMatching(answer, test, lvl, index, opts = { }) {
        opts.tracked = opts.tracked ?? null;

        /**
         * The output of this depends on whether the context is "intermediate" (like a in "a/b") or "final" (like b in "a/b").
         * The expression tree contains generated position helpers ("test.end") determining which one the terminal is.
         * It's required that the terminal is evaluated at the last level of the context if the terminal is final.
         * If whether it reaches the last element or not isn't verified, then the expression becomes true not only for the module, but also all of its sub-modules.
         * We want "a/b" to change "a/b", but not "a/b/c" as well, even though "a/b" is all true for the first part of "a/b/c"'s context.
         * That's also because it may be that we're testing the expression against a module with the context "a/b/c", and not "a/b".
         * Otherwise, if it's intermediate, it should not matter.
         * 
         * You might think "why not just answer &&= lvl <= info.index.context.length - 1?", and why the position helpers?
         * That's because info.index.context.length is dynamic depending on the module being addressed.
         * If the module is a child module of a correct one, then info.index.context.length is already larger than what the level is, so the comparison would always be true for child modules.
         * That makes the comparison, in effect, pointless.
         * The best way to determine finality appears to be from the expression tree's end, not the module's.
         */
        answer &&= !test.end || (lvl === (index.context.length - 1));

        /**
         * The need for this is because of the confusing reality of some expressions.
         * Consider "(a|(b/c))/d", which is expandable as "a/d" and "b/c/d". Question is, in the original expression, if "(a|(b/c))" is true, at what level should "d" be evaluated at?
         * Normally, the "next level down" is sufficient, but the entirety of "(a|(b/c))" starts at level 0, and "d" at level 1 only includes "a/d" and thus ignores "b/c/d" at level 2.
         * As a result, the level stopped at is important for the calling operation to know.
         */
        if ((answer === true) && (opts.tracked instanceof Set)) {
            opts.tracked.add(lvl);
        }

        return answer;
    }

    _matchingTag(test, lvl, index, query_randoms, opts = { }) {
        let answer;

        switch (test.val) {
            case mapped.CONTEXT_MAP.WILDCARD:
                answer = true;
                break;
            default:
                answer = false;
                for (const tag of index.context[lvl]) {
                    if (test.val === Pairable.getIdentifier(tag)) {
                        answer = true;
                        break;
                    }
                }
                break;
        }

        return this._verifyMatching(answer, test, lvl, index, opts);
    }

    async _matchingValueExpression(a, b, op, lvl, index, query_randoms, opts = { }) {
        let answer = await this._matchingTagValue(a, b, lvl, index, query_randoms);

        if (common.isDictionary(answer)) {
            answer = false;
        } else {
            switch (op) {
                case mapped.CONTEXT_MAP.EQUAL_TO_INTERNAL:
                    answer = answer === b.val;
                    break;
                case mapped.CONTEXT_MAP.NOT_EQUAL_TO_INTERNAL:
                    answer = answer !== b.val;
                    break;
                case mapped.CONTEXT_MAP.LESS_THAN_INTERNAL:
                    answer = answer < b.val;
                    break;
                case mapped.CONTEXT_MAP.LESS_THAN_OR_EQUAL_TO_INTERNAL:
                    answer = answer <= b.val;
                    break;
                case mapped.CONTEXT_MAP.GREATER_THAN_INTERNAL:
                    answer = answer > b.val;
                    break;
                case mapped.CONTEXT_MAP.GREATER_THAN_OR_EQUAL_TO_INTERNAL:
                    answer = answer >= b.val;
                    break;
            }
        }

        return this._verifyMatching(answer, a, lvl, index, opts);
    }

    async _testLookaheadRecursive(b, lvl, index, query_randoms, recursive, opts = { }) {
        const child_subcontext = [ ];
        
        // Needed if @parent/@ascend is used with @to/@toward and is in the LHS of the @to/@toward expression.
        // The target's context needs to be aligned with that of the parent that's supposed to be evaluated.
        const parent_diff = index.context.length - lvl;
        for (let i = 0; i < parent_diff; i++) {
            child_subcontext.push(this._target.leavePos());
            child_subcontext.push(this._target.leavePos());
        }

        let b_index;

        let answer = false;

        this._target.enterPos(mapped.MODULE_KEY_MAP.NESTED);
        if (!this._target.isPosEmpty()) {
            this._target.enterPos(0);
            while (!this._target.isPosUndefined()) {
                b_index = this._getModuleIndex();

                answer = await this._matchingExpression(b, lvl, b_index, query_randoms, opts);

                if (recursive && (answer === false)) {
                    lvl++;

                    answer = await this._testLookaheadRecursive(b, lvl, b_index, query_randoms, recursive, opts);
                }
                if (answer === true) {
                    break;
                }

                this._target.nextItem(mapped.MODULE_KEY_MAP.NESTED);
            }
            this._target.leavePos();
        }
        this._target.leavePos();

        while (child_subcontext.length > 0) {
            this._target.enterPos(child_subcontext.pop());
        }

        return answer;
    }

    async _testLookahead(a, b, lvl, index, query_randoms, recursive, inverted, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = await this._matchingExpression(a, lvl, index, query_randoms, a_opts);

        const b_opts        = { tracked: new Set() };
        let   b_answer_part = false;
        let   b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl + 1;

                b_answer_part = await this._testLookaheadRecursive(b, lvl, index, query_randoms, recursive, b_opts);

                if ((b_answer_part === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(cand_lvl);
                }

                b_answer ||= b_answer_part;
            }
        }

        return a_answer && (inverted ? !b_answer : b_answer);
    }

    async _testLookbehind(a, b, lvl, index, query_randoms, recursive, inverted, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = await this._matchingExpression(a, lvl, index, query_randoms, a_opts);

        const b_opts        = { tracked: new Set() };
        let   b_answer_part = false;
        let   b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl - 1;

                if (recursive) {
                    while ((b_answer_part === false) && (lvl >= 0)) {
                        b_answer_part = await this._matchingExpression(b, lvl, index, query_randoms, b_opts);
    
                        lvl--;
                    }
                } else {
                    b_answer_part = await this._matchingExpression(b, lvl, index, query_randoms, b_opts);
                }
                
                if ((b_answer_part === true) && (opts.tracked instanceof Set)) {
                    opts.tracked.add(cand_lvl);
                }

                b_answer ||= b_answer_part;
            }
        }

        return a_answer && (inverted ? !b_answer : b_answer);
    }

    async _testTransitive(a, b, lvl, index, query_randoms, recursive, inclusive, opts = { }) {
        const a_opts   = { tracked: new Set() };
        const a_answer = await this._matchingExpression(a, lvl, index, query_randoms, a_opts);

        let b_answer_part = false;
        let b_answer      = false;
        if (a_answer === true) {
            for (let cand_lvl of a_opts.tracked) {
                lvl = cand_lvl;
                if (!inclusive) {
                    lvl++;
                }

                if (recursive) {
                    while ((b_answer_part === false) && (lvl < index.context.length)) {
                        b_answer_part = await this._matchingExpression(b, lvl, index, query_randoms, opts);

                        lvl++;
                    }
                    b_answer ||= b_answer_part;
                } else {
                    b_answer ||= await this._matchingExpression(b, lvl, index, query_randoms, opts);
                }
            }
        }

        return a_answer && b_answer;
    }

    _isExpressionTreeLeaf(obj) {
        return common.isDictionary(obj) && (obj.val !== undefined);
    }

    async _matchingExpression(test, lvl, index, query_randoms, opts = { }) {
        if (common.isEmpty(test)) {
            return index.context.length === lvl;
        } else if (common.isEmpty(index.context) || (lvl < 0) || (lvl >= index.context.length)) {
            return false;
        } else if (this._isExpressionTreeLeaf(test)) {
            return this._matchingTag(test, lvl, index, query_randoms, opts);
        } else if (test.op[0] === mapped.CONTEXT_MAP.VALUE_SYMBOL) {
            return await this._matchingValueExpression(test.a, test.b, test.op, lvl, index, query_randoms, opts);
        } else {
            switch (test.op) {
                case mapped.CONTEXT_MAP.NOT:
                    return !(await this._matchingExpression(test.a, lvl, index, query_randoms, opts));
                case mapped.CONTEXT_MAP.AND:
                    return await this._matchingExpression(test.a, lvl, index, query_randoms, opts) && await this._matchingExpression(test.b, lvl, index, query_randoms, opts);
                case mapped.CONTEXT_MAP.XOR:
                    const a = await this._matchingExpression(test.a, lvl, index, query_randoms, opts);
                    const b = await this._matchingExpression(test.b, lvl, index, query_randoms, opts);
                    return (a & !b) || (b & !a);
                case mapped.CONTEXT_MAP.OR:
                    return await this._matchingExpression(test.a, lvl, index, query_randoms, opts) || await this._matchingExpression(test.b, lvl, index, query_randoms, opts);
                case mapped.CONTEXT_MAP.LOOKAHEAD:
                    return await this._testLookahead(test.a, test.b, lvl, index, query_randoms, false, false, opts);
                case mapped.CONTEXT_MAP.RECURSIVE_LOOKAHEAD:
                    return await this._testLookahead(test.a, test.b, lvl, index, query_randoms, true, false, opts);
                case mapped.CONTEXT_MAP.LOOKBEHIND:
                    return await this._testLookbehind(test.a, test.b, lvl, index, query_randoms, false, false, opts);
                case mapped.CONTEXT_MAP.RECURSIVE_LOOKBEHIND:
                    return await this._testLookbehind(test.a, test.b, lvl, index, query_randoms, true, false, opts);
                case mapped.CONTEXT_MAP.INVERSE_LOOKAHEAD:
                    return await this._testLookahead(test.a, test.b, lvl, index, query_randoms, false, true, opts);
                case mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKAHEAD:
                    return await this._testLookahead(test.a, test.b, lvl, index, query_randoms, true, true, opts);
                case mapped.CONTEXT_MAP.INVERSE_LOOKBEHIND:
                    return await this._testLookbehind(test.a, test.b, lvl, index, query_randoms, false, true, opts);
                case mapped.CONTEXT_MAP.INVERSE_RECURSIVE_LOOKBEHIND:
                    return await this._testLookbehind(test.a, test.b, lvl, index, query_randoms, true, true, opts);
                case mapped.CONTEXT_MAP.TRANSITION:
                    return await this._testTransitive(test.a, test.b, lvl, index, query_randoms, false, false, opts);
                case mapped.CONTEXT_MAP.RECURSIVE_TRANSITION:
                    return await this._testTransitive(test.a, test.b, lvl, index, query_randoms, true, false, opts);
                case mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_TRANSITION:
                    return await this._testTransitive(test.a, test.b, lvl, index, query_randoms, true, true, opts);
                case mapped.CONTEXT_MAP.TERNARY_1:
                    if (await this._matchingExpression(test.a, lvl, index, query_randoms, opts)) {
                        return await this._matchingExpression(test.b, lvl, index, query_randoms, opts);
                    }
                    return await this._matchingExpression(test.c, lvl, index, query_randoms, opts);
            }
        }
    }

    _createModuleTemplate(module = null) {
        if (module === null) {
            module = new StateTree({ imported: module });
        }

        this._astree.enterPos('definition');
        if (!this._astree.isPosUndefined()) {
            module.setPosValue(this._astree.getPosValue());
        }
        this._astree.leavePos();

        return module.getRaw();
    }

    async _functionCall(func, params, opts = { }) {
        opts.primitive_only = opts.primitive_only ?? false;

        let result;

        try {
            const mod = await safeImport(__dirname, '../../mods/functions/', func);

            result = await mod.default(params);
        } catch (err) {
            throw new error.FunctionError(err.message);
        }

        if (opts.primitive_only) {
            if (common.isObject(result)) {
                result = JSON.stringify(result, null, 0);
            }
        }

        return result;
    }

    async _uniqueCopyTemplate(template, opts = { }) {
        opts.functions = opts.functions ?? null;
        opts.params    = opts.params    ?? null;

        const copy = common.deepCopy(template);

        if (opts.functions !== null) {
            if (!common.isNullish(opts.functions.module)) {
                opts.params.args = opts.functions.module;

                const result = await this._functionCall(opts.functions.module[0], opts.params, { primitive_only: false });

                copy = result;
            } else {
                if (!common.isNullish(opts.functions[mapped.MODULE_KEY_MAP.TAGS])) {
                    for (let tag in opts.functions[mapped.MODULE_KEY_MAP.TAGS]) {
                        opts.params.args = opts.functions[mapped.MODULE_KEY_MAP.TAGS][tag];

                        const result = await this._functionCall(opts.functions[mapped.MODULE_KEY_MAP.TAGS][tag][0], opts.params, { primitive_only: true });

                        tag = Pairable.getPairable(tag, result);

                        copy[mapped.MODULE_KEY_MAP.TAGS] = copy[mapped.MODULE_KEY_MAP.TAGS] ?? [ ];
                        copy[mapped.MODULE_KEY_MAP.TAGS].push(tag);
                    }
                }
                if (!common.isNullish(opts.functions[mapped.MODULE_KEY_MAP.TYPE])) {
                    opts.params.args = opts.functions[mapped.MODULE_KEY_MAP.TYPE];

                    const result = await this._functionCall(opts.functions[mapped.MODULE_KEY_MAP.TYPE][0], opts.params, { primitive_only: true });

                    copy[mapped.MODULE_KEY_MAP.TYPE] = result;
                }
                if (!common.isNullish(opts.functions[mapped.MODULE_KEY_MAP.DATA])) {
                    opts.params.args = opts.functions[mapped.MODULE_KEY_MAP.DATA];

                    const result = await this._functionCall(opts.functions[mapped.MODULE_KEY_MAP.DATA][0], opts.params, { primitive_only: false });

                    copy[mapped.MODULE_KEY_MAP.DATA] = result;
                }
            }
        }

        // A UUID needs to be unique for every copy of a module, even if generated in the same statement.
        if (common.isDictionary(template)) {
            const tags = copy[mapped.MODULE_KEY_MAP.TAGS];
            if (common.isArray(tags)) {
                for (const i in tags) {
                    if (tags[i] === '@uuid') {
                        tags[i] = uuid();
                    }
                }
            }
        }

        return copy;
    }

    _overwriteModule(template) {
        this._target.setPosValue(template);
    }

    _appendModule(template) {
        this._target.enterPutAndLeave(mapped.MODULE_KEY_MAP.NESTED, template);
    }

    _printModule() {
        const copy  = { content: this._target.getPosValue(), nonce: this._astree.enterGetAndLeave('nonce') };

        this._output_modules.push(copy);
    }

    _deleteModule() {
        const spliced = this._target.getTopPos();
        if (spliced === null) {
            // then this module is the root module.
            this._target.setPosValue({ });
        } else {
            this._target.leavePos();
            this._target.getPosValue().splice(spliced, 1);
            
            if ((spliced === 0) && this._target.isPosEmpty()) {
                this._target.deletePosValue();
            }

            /**
             * When target.nextItem() is called, the negative index will auto-reset to 0.
             * The negative index is used so the composer knows to retry 0 after the array has shifted.
             * This is the easiest way to tell that the tree array has already shifted back because of a @del statement.
             */
            this._target.enterPos(spliced - 1);
        }
    }

    _editModulePart(template, nulled, key) {
        if ((template[mapped.MODULE_KEY_MAP[key]] !== undefined) || (common.isDictionary(nulled) && (nulled[mapped.MODULE_KEY_MAP[key]] === true))) {
            this._target.enterSetAndLeave(mapped.MODULE_KEY_MAP[key], template[mapped.MODULE_KEY_MAP[key]]);
        }
    }

    _editModule(template) {
        const nulled = this._astree.enterGetAndLeave('nulled');

        this._editModulePart(template, nulled, 'tags');
        this._editModulePart(template, nulled, 'attributes');
        this._editModulePart(template, nulled, 'type');
        this._editModulePart(template, nulled, 'state');

        if (!common.isEmpty(this._astree.enterGetAndLeave(mapped.MODULE_KEY_MAP.NESTED)) || (common.isDictionary(nulled) && (nulled[mapped.MODULE_KEY_MAP.NESTED] === true))) {
            this._target.enterDeleteAndLeave(mapped.MODULE_KEY_MAP.NESTED);
        }
    }

    _keyValueModule(template, opts = { }) {
        opts.tags = opts.tags ?? true;

        const dest = opts.tags ? mapped.MODULE_KEY_MAP.TAGS : mapped.MODULE_KEY_MAP.MAPPED;

        this._target.enterPos(dest);

        let items = this._target.getPosValue();
        if (items === undefined) {
            items = [ ];
        }

        if (common.isArray(template[dest])) {
            const items_length = items.length; // Because the length of the tags array changes as tags are added, and the syntax parser already does a duplicate check.

            new_items:
            for (const added of template[dest]) {
                for (let i = 0; i < items_length; i++) {
                    if (Pairable.getIdentifier(items[i]) === Pairable.getIdentifier(added)) {
                        items[i] = Pairable.setValue(items[i], Pairable.getValue(added));
                        continue new_items;
                    }
                }
    
                this._target.putPosValue(added);
            }
        }

        this._target.leavePos();
    }

    _unKeyValueModule(template, opts = { }) {
        opts.tags = opts.tags ?? true;

        const dest = opts.tags ? mapped.MODULE_KEY_MAP.TAGS : mapped.MODULE_KEY_MAP.MAPPED;

        this._target.enterPos(dest);

        const items = this._target.getPosValue();
        if (items === undefined) {
            items = [ ];
        }

        if (common.isArray(template[dest])) {
            for (const removed of template[dest]) {
                for (let i = 0; i < items.length; i++) {
                    if (Pairable.getIdentifier(items[i]) === Pairable.getIdentifier(removed)) {
                        items.splice(i, 1);
                        i--;
                    }
                }
            }
        }

        if (this._target.isPosEmpty()) {
            this._target.deletePosValue();
        }

        this._target.leavePos();
    }

    _saveModule() {
        this._saved.push(this._target.getPosValue());
    }

    _loadModule() {
        for (const module of this._saved) {
            this._appendModule(common.deepCopy(module));
        }
    }

    async _operateModule(command, opts = { }) {
        opts.template  = opts.template  ?? null;
        opts.functions = opts.functions ?? null;
        opts.params    = opts.params    ?? null;

        if (opts.template !== null) {
            opts.template = await this._uniqueCopyTemplate(opts.template, { functions: opts.functions, params: opts.params });
        }

        switch (command) {
            case mapped.OPERATION_MAP.ASTREE.OVERWRITE:
                this._overwriteModule(opts.template);
                break;
            case mapped.OPERATION_MAP.ASTREE.APPEND:
                this._appendModule(opts.template);
                break;
            case mapped.OPERATION_MAP.ASTREE.PRINT:
                this._printModule();
                break;
            case mapped.OPERATION_MAP.ASTREE.DELETE:
                this._deleteModule();
                break;
            case mapped.OPERATION_MAP.ASTREE.EDIT:
                this._editModule(opts.template);
                break;
            case mapped.OPERATION_MAP.ASTREE.EDIT_METADATA:
                this._keyValueModule(opts.template, { tags: true });
                break;
            case mapped.OPERATION_MAP.ASTREE.DELETE_METADATA:
                this._unKeyValueModule(opts.template, { tags: true });
                break;
            case mapped.OPERATION_MAP.ASTREE.EDIT_ATTRIBUTES:
                this._keyValueModule(opts.template, { tags: false });
                break;
            case mapped.OPERATION_MAP.ASTREE.DELETE_ATTRIBUTES:
                this._unKeyValueModule(opts.template, { tags: false });
                break;
            case mapped.OPERATION_MAP.ASTREE.CLIPBOARD_IN:
                this._saveModule();
                break;
            case mapped.OPERATION_MAP.ASTREE.CLIPBOARD_OUT:
                this._loadModule();
                break;
            case mapped.OPERATION_MAP.ASTREE.MULTIPLE:
            case mapped.OPERATION_MAP.ASTREE.NOP:
                break;
        }
    }

    _getModuleIndex() {
        const index = {
            real:    [ ],
            extent:  [ ],
            context: [ ]
        }

        const raw = this._target.getFullPos();
        let   ptr = this._target.getRaw();

        /**
         * Note: the indices are how the JSON database is structured at a low level.
         * For instance, the coordinates of the first module under the root module would normally be ['tree'][0].
         * Since it's 2 indices ('tree' and 0) from the perspective of the parent module, we need to make 2 jumps each time.
         */
        for (let i = 0; i < raw.length; i += 2) {
            ptr = ptr[raw[i]];
            if (!common.isArray(ptr)) {
                return index;
            }

            index.real.push(raw[i + 1]);

            index.extent.push(ptr.length);

            ptr = ptr[raw[i + 1]];
            if (!common.isDictionary(ptr)) {
                return index;
            }

            index.context.push(ptr[mapped.MODULE_KEY_MAP.TAGS] ?? [ ]);
        }

        index.extent.push((ptr[mapped.MODULE_KEY_MAP.NESTED] ?? [ ]).length);

        return index;
    }

    async _traverseModule(test, command, level, query_randoms, opts = { }) {
        opts.template  = opts.template  ?? null;
        opts.functions = opts.functions ?? null;
        opts.limit     = opts.limit     ?? null;
        opts.offset    = opts.offset    ?? 0;
        opts.count     = opts.count     ?? 0;
        opts.stats     = opts.stats     ?? { attempts: 0, successes: 0, indeces: [ ] };

        const index = this._getModuleIndex();

        const matched = await this._matchingExpression(test, level.start, index, query_randoms);
        if (matched === true) {
            opts.count++;
        }

        opts.stats.attempts++;

        if (((level.max === null) || (level.current < level.max)) && ((opts.limit === null) || (opts.count < opts.limit))) {
            await this._target.traverseAsync(mapped.MODULE_KEY_MAP.NESTED, async () => {
                const new_level = { start: level.start, current: level.current + 1, max: level.max };

                await this._traverseModule(test, command, new_level, query_randoms, opts);
                if ((opts.limit !== null) && (opts.count >= opts.limit)) {
                    return 'break';
                }
            });
        }

        const operate = {
            template:  opts.template,
            functions: opts.functions,
            params: {
                index:  common.deepCopy(index),
                random: [ ]
            }
        };
        for (let i = 0; i < this._random.seeds.length; i++) {
            operate.params.random.push({
                global: this._random.seeds[i],
                query:  query_randoms[i],
                call:   this._random.prngs[i]()
            })
        }

        if (matched && (opts.count > opts.offset)) {
            await this._operateModule(command, operate);

            opts.stats.successes++;
            opts.stats.indeces.push(index.real.join(','));
        }

        return matched;
    }

    _getStartingLevel() {
        // The 2 is determined from the number of (looping) indices required for one level of nesting.
        // Level 0 has the position ['tree'][#], level 1 is at ['tree'][#]['tree'][#], and so on.
        return this._target.getFullPos().length / 2;
    }

    /**
     * The purpose of this is strictly for optimizing how Tridy handles very large trees.
     * Without it, all modules in the database will be tested needlessly by a context expression.
     */
    _getMaximumDepth(test) {
        if (common.isEmpty(test)) {
            return 0;
        }
        
        if (this._isExpressionTreeLeaf(test)) {
            return 1;
        }
        
        let a_lvl = 0;
        if (test.a !== undefined) {
            a_lvl = this._getMaximumDepth(test.a);
        }
        if (a_lvl === null) {
            return a_lvl;
        }

        let b_lvl = 0;
        if (test.b !== undefined) {
            b_lvl = this._getMaximumDepth(test.b);
        }
        if (b_lvl === null) {
            return b_lvl;
        }

        let c_lvl = 0;
        if (test.c !== undefined) {
            c_lvl = this._getMaximumDepth(test.c);
        }
        if (c_lvl === null) {
            return c_lvl;
        }

        let lvl = Math.max(a_lvl, b_lvl, c_lvl);
        if ((test.op === mapped.CONTEXT_MAP.RECURSIVE_TRANSITION) || (test.op === mapped.CONTEXT_MAP.INCLUSIVE_RECURSIVE_TRANSITION)) {
            return null;
        }
        if (test.op === mapped.CONTEXT_MAP.TRANSITION) {
            return lvl + 1;
        }
        return lvl;
    }

    _postOperation(command, stats) {
        const nonce  = this._astree.enterGetAndLeave('nonce');
        const params = this._astree.enterGetAndLeave('output');

        if (params !== undefined) {
            this._output_params[nonce] = params;
        }

        switch (command) {
            case mapped.OPERATION_MAP.ASTREE.CLIPBOARD_OUT:
                this._saved = [ ];
                break;
            case mapped.OPERATION_MAP.ASTREE.NOP:
                this._output_modules.push({ content: stats, nonce: nonce });
                break;
            default:
                switch (mapped.global.log_level) {
                    case 'verbose':
                    case 'debug':
                    case 'silly':
                        this._output_modules.push({ content: stats, nonce: nonce });
                }
                break;
        }
    }

    async _parseNestedStatements(command) {
        if (!common.isEmpty(this._astree.enterGetAndLeave(mapped.MODULE_KEY_MAP.NESTED))) {
            switch (command) {
                case mapped.OPERATION_MAP.ASTREE.APPEND:
                    this._target.enterPos(mapped.MODULE_KEY_MAP.NESTED);
                    this._target.enterPos(this._target.getPosLength() - 1);

                    break;
                case mapped.OPERATION_MAP.ASTREE.OVERWRITE:
                case mapped.OPERATION_MAP.ASTREE.EDIT:
                case mapped.OPERATION_MAP.ASTREE.MULTIPLE:
                    break;
                default:
                    return;
            }

            await this._parse();

            switch (command) {
                case mapped.OPERATION_MAP.ASTREE.APPEND:
                    this._target.leavePos();
                    this._target.leavePos();
            }
        }
    }

    async _parseStatement() {
        const context    = this._astree.enterGetAndLeave('context');
        let   expression = context ? context.expression     : { };
        let   limit      = context ? context.limit  ?? null : null;
        const offset     = context ? context.offset ?? 0    : 0;
        const repeat     = context ? context.repeat ?? 0    : 0;

        if (!common.isEmpty(expression)) {
            expression = ContextParser.upgrade(expression);
        }

        limit = (limit === null) ? null : limit + offset;

        const command = this._astree.enterGetAndLeave('operation');

        const functions = this._astree.enterGetAndLeave('functions');

        let template = null;
        switch (command) {
            case mapped.OPERATION_MAP.ASTREE.CLIPBOARD_IN:
                this._saved = [ ];
                break;
            case mapped.OPERATION_MAP.ASTREE.CLIPBOARD_OUT:
            case mapped.OPERATION_MAP.ASTREE.PRINT:
            case mapped.OPERATION_MAP.ASTREE.DELETE:
            case mapped.OPERATION_MAP.ASTREE.MULTIPLE:
            case mapped.OPERATION_MAP.ASTREE.NOP:
                break;
            default:
                template = this._createModuleTemplate();
        }

        const start_lvl = this._getStartingLevel();
        const level     = { start: start_lvl, current: start_lvl };

        const max_depth = this._getMaximumDepth(expression);
        level.max       = (max_depth === null) ? null : start_lvl + max_depth;

        const stats = {
            attempts:  0,
            successes: 0,
            indeces:   [ ]
        };

        const randoms = this._random.prngs.map((prng) => prng());

        const traverse = {
            count:     0,
            limit:     limit,
            offset:    offset,
            template:  template,
            functions: functions,
            stats:     stats
        };

        try {
            for (let i = 0; i <= repeat; i++) {
                await this._traverseModule(expression, command, level, randoms, traverse);
                await this._parseNestedStatements(command);

                if ((limit !== null) && (traverse.count >= limit)) {
                    break;
                }
            }

            this._postOperation(command, stats);
        } catch (err) {
            if (err instanceof error.FunctionError) {
                error.error_handler.handle(err);
            } else {
                throw err;
            }
        } finally {
            this._astree.toLocalRoot(mapped.MODULE_KEY_MAP.NESTED);
            this._target.toLocalRoot(mapped.MODULE_KEY_MAP.NESTED);
        }
    }

    async _parse() {
        await this._astree.traverseAsync(mapped.MODULE_KEY_MAP.NESTED, this._parseStatement.bind(this));
    }

    async compose(input, opts = { }) {
        this._astree = new StateTree({ imported: input });

        this._output_modules = [ ];
        this._output_params  = { };

        await this._parse();

        return { modules: this._output_modules, params: this._output_params };
    }
}
