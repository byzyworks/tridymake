import path              from 'path';
import { fileURLToPath } from 'url';

import * as common from '../common.js';
import * as error  from '../error.js';
import { logger }  from '../logger.js';
import * as mapped from '../mapped.js';

import { Tree }  from '../instance/Tree.js';

import { ExpressionNode }     from '../instance/stage-2_parsing/ExpressionNode.js';
import { FunctionNode }       from '../instance/stage-2_parsing/FunctionNode.js';
import { LexicalContextNode } from '../instance/stage-3_composition/LexicalContextNode.js';
import { Mapping }            from '../instance/stage-2_parsing/Mapping.js';
import { OperationNode }      from '../instance/stage-3_composition/OperationNode.js';
import { StorageContextNode } from '../instance/stage-3_composition/StorageContextNode.js';
import { StorageNode }        from '../instance/stage-3_composition/StorageNode.js';
import { Tag }                from '../instance/stage-2_parsing/Tag.js';
import { Token }              from '../instance/stage-1_lexing/Token.js';
import { Variable }           from '../instance/stage-2_parsing/Variable.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export class Composer {
    constructor() {
        this._program_root    = null;
        this._storage_root    = new StorageNode();
        this._program_context = null;
        this._storage_context = null;
        this._procedure_map   = new Map();
        this._file_map        = new Map();
        this._interactive     = false;
    }

    async _changeStorageContext(expression, opts = { }) {
        opts.recursive = opts.recursive ?? false;

        const exp = this._program_root.enterGetAndLeave(mapped.TREE_KEY.ASTREE.EXPRESSION);

        let   modules  = [ ];
        const callback = (matched) => {
            modules.push(matched);
        }

        await this._traverseStorageContext(expression, callback, { ignore_root: true, ignore_nested: false, recursive: opts.recursive });

        const answer = this.fork(...modules);

        return answer;
    }

    async _resolveDynamicValue(value) {
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

    async _createStorageNode(target) {
        const module = new StorageNode(target);

        let value;

        value = this._program_root.enterGetAndLeave(mapped.TREE_KEY.SHARED.DATA);
        if (!common.isNullish(value)) {
            if (value === mapped.SPECIAL_VALUE.UNDEFINED) {
                return null;
            }

            value = await this._resolveDynamicValue(value);

            module.setData(value);
        }

        const metadata = this._program_root.enterGetAndLeave(mapped.TREE_KEY.SHARED.METADATA);
        if (!common.isNullish(metadata)) {
            for (const key of Object.keys(metadata)) {
                value = await this._resolveDynamicValue(metadata[key]);

                module.setMetadata(key, value);
            }
        }

        return module;
    }

    async _appendStorageNode(target) {
        target = new Tree(target);

        const module = await this._createStorageNode(target);
        if (module === null) {
            return;
        }

        target.enterPutAndLeave(mapped.TREE_KEY.SHARED.NESTED, module);
    }

    _precedeStorageNode(target) {

    }

    _succeedStorageNode(target) {

    }

    _overwriteStorageNode(target) {

    }

    _clearConsole() {
        console.clear();
    }

    _exitConsole() {
        logger.end();

        process.exit();
    }

    async _handleStatement() {
        const context   = this._storage_context.view();
        const operation = this._program_root.enterGetAndLeave(mapped.TREE_KEY.ASTREE.OPERATION);

        switch (operation) {
            case mapped.OPERATION.APPEND_STORAGE:
            case mapped.OPERATION.PRECEDE_STORAGE:
            case mapped.OPERATION.SUCCEED_STORAGE:
                this._storage_context.pushCurrent();
                break;
            case mapped.OPERATION.CHANGE_CONTEXT:
                await this._changeStorageContext();
                break;
            case mapped.OPERATION.CONSOLE_CLEAR_OUTPUT:
                this._clearConsole();
                break;
            case mapped.OPERATION.CONSOLE_EXIT:
                this._exitConsole();
        }

        for (const target of context) {
            switch (operation) {
                case mapped.OPERATION.APPEND_STORAGE:
                    this._appendStorageNode(target);
                    break;
                case mapped.OPERATION.PRECEDE_STORAGE:
                    this._precedeStorageNode(target);
                    break;
                case mapped.OPERATION.SUCCEED_STORAGE:
                    this._succeedStorageNode(target);
                    break;
                case mapped.OPERATION.OVERWRITE_STORAGE:
                    this._overwriteStorageNode(target);
                    break;
                case mapped.OPERATION.EDIT_STORAGE:
                case mapped.OPERATION.DELETE_STORAGE:
                case mapped.OPERATION.EDIT_METADATA:
                case mapped.OPERATION.DELETE_METADATA:
                case mapped.OPERATION.DECLARE_VARIABLE:
                case mapped.OPERATION.EDIT_VARIABLE:
                case mapped.OPERATION.BLOCK:
                case mapped.OPERATION.CONDITION_SUCCESS:
                case mapped.OPERATION.CONDITION_FAILURE:
                case mapped.OPERATION.CONTROL_BREAK:
                case mapped.OPERATION.CONTROL_LOOP_STRIDE:
                case mapped.OPERATION.CONTROL_LOOP_CONTINUE:
                case mapped.OPERATION.CONTROL_PROCEDURE_EXIT:
                case mapped.OPERATION.CONTROL_EXIT:
                case mapped.OPERATION.PROCEDURE_CREATE_VIRTUAL:
                case mapped.OPERATION.PROCEDURE_INVOKE_VIRTUAL:
                case mapped.OPERATION.PROCEDURE_INVOKE_PHYSICAL:
                case mapped.OPERATION.OUTPUT_STORAGE:
                    break;
            }
    
            await this._handleSyntaxTree();
        }

        switch (operation) {
            case mapped.OPERATION.APPEND_STORAGE:
            case mapped.OPERATION.PRECEDE_STORAGE:
            case mapped.OPERATION.SUCCEED_STORAGE:
            case mapped.OPERATION.CHANGE_CONTEXT:
                this._storage_context.popCurrent();
                break;
        }
    }

    async _handleSyntaxTree() {
        await this._program_root.traverse(mapped.TREE_KEY.SHARED.NESTED, this._handleStatement.bind(this), { ordered: true });
    }

    async compose(commands, opts = { }) {
        opts._interactive = opts.interactive ?? false;

        this._program_root    = new Tree(commands);
        this._program_context = new LexicalContextNode(this._program_root);
        this._storage_context = new StorageContextNode(this._storage_root);
        this._interactive     = opts.interactive;

        await this._handleSyntaxTree();

        this._program_root    = null;
        this._program_context = null;
        this._storage_context = null;
        this._interactive     = false;
    }
}
