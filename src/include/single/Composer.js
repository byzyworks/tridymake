import path              from 'path';
import { fileURLToPath } from 'url';

import * as common from '../common.js';
import * as error  from '../error.js';
import { logger }  from '../logger.js';
import * as mapped from '../mapped.js';

import { Stack } from '../instance/Stack.js';
import { Tree }  from '../instance/Tree.js';

import { Artifact }       from '../instance/stage-2_parsing/Artifact.js';
import { FunctionNode }   from '../instance/stage-2_parsing/FunctionNode.js';
import { LexicalNode }    from '../instance/stage-3_composition/LexicalNode.js';
import { Mapping }        from '../instance/stage-2_parsing/Mapping.js';
import { StorageContext } from '../instance/stage-3_composition/StorageContext.js';
import { StorageNode }    from '../instance/stage-3_composition/StorageNode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export class Composer {
    constructor() {
        this._astree      = null;
        this._storage     = new StorageNode();
        this._context     = new StorageContext(this._storage);
        this._lexicon     = new LexicalNode();
        this._interactive = false;
        this._program     = new Stack();
        this._imports     = { };
        this._skipto      = null;
        this._output      = null;
    }

    async _resolveDynamic(value) {
        if (value instanceof Mapping) {
            if (value instanceof FunctionNode) {
                
            }

            if (value instanceof Variable) {

            }

            if (value instanceof Tag) {

            }
        }

        return value;
    }

    async _createModule(target) {
        const module = new StorageNode(target);

        let value;

        value = this._astree.enterGetAndLeave(mapped.TREE_KEY.SHARED.DATA);
        if (!common.isNullish(value)) {
            if (value === mapped.SPECIAL_VALUE.UNDEFINED) {
                return null;
            }

            value = await this._resolveDynamic(value);

            module.setData(value);
        }

        const metadata = this._astree.enterGetAndLeave(mapped.TREE_KEY.SHARED.METADATA);
        if (!common.isNullish(metadata)) {
            for (const key of Object.keys(metadata)) {
                value = await this._resolveDynamic(metadata[key]);

                module.setMetadata(key, value);
            }
        }

        return module;
    }

    async _appendModule(target) {
        target = new Tree(target);

        const module = await this._createModule(target);
        if (module === null) {
            return;
        }

        target.enterPutAndLeave(mapped.TREE_KEY.SHARED.NESTED, module);
    }

    _precedeModule(target) {

    }

    _succeedModule(target) {

    }

    _overwriteModule(target) {

    }

    async _changeContext() {
        const exp = this._astree.enterGetAndLeave(mapped.TREE_KEY.ASTREE.EXPRESSION);
        await this._context.apply(exp);
    }

    _clearConsole() {
        console.clear();
    }

    _exitConsole() {
        logger.end();

        process.exit();
    }

    async _handleStatement() {
        const context   = this._context.viewCurrent();
        const operation = this._astree.enterGetAndLeave(mapped.TREE_KEY.ASTREE.OPERATION);

        switch (operation) {
            case mapped.OPERATION.APPEND_MODULE:
            case mapped.OPERATION.PRECEDE_MODULE:
            case mapped.OPERATION.SUCCEED_MODULE:
                this._context.pushCurrent();
                break;
            case mapped.OPERATION.CHANGE_CONTEXT:
                await this._changeContext();
                break;
            case mapped.OPERATION.CONSOLE_CLEAR_OUTPUT:
                this._clearConsole();
                break;
            case mapped.OPERATION.CONSOLE_EXIT:
                this._exitConsole();
        }

        for (const target of context) {
            switch (operation) {
                case mapped.OPERATION.APPEND_MODULE:
                    this._appendModule(target);
                    break;
                case mapped.OPERATION.PRECEDE_MODULE:
                    this._precedeModule(target);
                    break;
                case mapped.OPERATION.SUCCEED_MODULE:
                    this._succeedModule(target);
                    break;
                case mapped.OPERATION.OVERWRITE_MODULE:
                    this._overwriteModule(target);
                    break;
                case mapped.OPERATION.EDIT_MODULE:
                case mapped.OPERATION.DELETE_MODULE:
                case mapped.OPERATION.EDIT_METADATA:
                case mapped.OPERATION.DELETE_METADATA:
                case mapped.OPERATION.DECLARE_VARIABLE:
                case mapped.OPERATION.EDIT_VARIABLE:
                case mapped.OPERATION.BLOCK:
                case mapped.OPERATION.CONDITION_SUCCESS:
                case mapped.OPERATION.CONDITION_FAILURE:
                case mapped.OPERATION.LOOP:
                case mapped.OPERATION.CONTROL_SKIP_TO_LABEL:
                case mapped.OPERATION.CONTROL_LABEL:
                case mapped.OPERATION.PROCEDURE_CREATE_VIRTUAL:
                case mapped.OPERATION.PROCEDURE_INVOKE_VIRTUAL:
                case mapped.OPERATION.PROCEDURE_INVOKE_PHYSICAL:
                case mapped.OPERATION.OUTPUT_MODULE:
                    break;
            }
    
            await this._handleSyntaxTree();
        }

        switch (operation) {
            case mapped.OPERATION.APPEND_MODULE:
            case mapped.OPERATION.PRECEDE_MODULE:
            case mapped.OPERATION.SUCCEED_MODULE:
            case mapped.OPERATION.CHANGE_CONTEXT:
                this._context.popCurrent();
                break;
        }
    }

    async _handleSyntaxTree() {
        await this._astree.traverseSerial(mapped.TREE_KEY.SHARED.NESTED, this._handleStatement.bind(this));
    }

    async compose(commands, opts = { }) {
        opts._interactive = opts.interactive ?? false;

        this._astree      = new Tree(commands);
        this._interactive = opts.interactive;

        await this._handleSyntaxTree();

        this._astree = null;
    }

    getStorage() {
        return this._storage;
    }

    upgradeNamespace() {
        const child = new LexicalNode({ parent: this._lexicon });

        this._lexicon = child;
    }

    downgradeNamespace() {
        this._lexicon = this._lexicon.parent;
    }
}
