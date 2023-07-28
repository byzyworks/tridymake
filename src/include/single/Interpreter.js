/**
 * Tridymake database class and exported module.
 * 
 * @module
 */

import util from 'util'; //DEBUG

import { isEmpty } from '../common.js';
import { logger }  from '../logger.js';

import { Composer }       from './Composer.js';
import { SyntaxParser }   from './SyntaxParser.js';
import { StatementLexer } from './StatementLexer.js';

/**
 * Database class for interpreting Tridy commands/statements.
 * 
 * A Tridy database includes three parts: a tokenizer, parser, and composer.
 * Each may be stateful to varying degrees.
 * 
 * Interacting with this class is all done through the query() method, which automatically pipes the input through these separate components in ordered stages.
 * 
 * @class
 * @property {StatementParser} _lexer    Extracts tokens from the input string, and manages statement-queuing.
 * @property {SyntaxParser}    _parser   Processes tokens into an abstract syntax tree.
 * @property {Composer}        _composer Maintains and appends an object database using instructions received from the parser.
 */
export class Tridy {
    /**
     * Constructor for the Tridy class.
     */
    constructor() {
        this._lexer    = new StatementLexer();
        this._parser   = new SyntaxParser();
        this._composer = new Composer();
    }

    /**
     * Executes Tridy commands.
     * 
     * @async
     * @public
     * @method
     * @param   {String}  input             Tridy command(s)/statement(s), as a string.
     * @param   {Boolean} opts.accept_carry True to statefully retain tokens from incomplete statements, false to throw SyntaxError if receiving an incomplete statement. Default is false.
     * @param   {Boolean} opts.interactive  Allows interactive control commands like 'clear' and 'exit' to be effective. Default is false.
     * @param   {String}  opts.filepath     Path of the file that is the source of the command(s)/statement(s). Default is null.
     * @throws  {SyntaxError}               Thrown if the input isn't valid Tridy code.
     * @throws  {FunctionError}             Thrown if a plug-in function fail to execute.
     */
    async query(input, opts = { }) {
        opts.accept_carry = opts.accept_carry ?? false;
        opts.interactive  = opts.interactive  ?? false;
        opts.filepath     = opts.filepath     ?? null;

        let tokens;
        let astree;

        this._lexer.load(input, { filepath: opts.filepath });

        if (opts.interactive) {
            while (tokens = this._lexer.next({ accept_carry: opts.accept_carry })) {
                logger.debug(util.inspect(tokens, { showHidden: false, depth: null, colors: true}));

                if (isEmpty(tokens)) {
                    continue;
                }

                astree = this._parser.parse(tokens, { interactive: opts.interactive });
                astree = Object.freeze(astree);
    
                logger.debug(util.inspect(astree, {showHidden: false, depth: null, colors: true}));
    
                if (isEmpty(astree)) {
                    continue;
                }
        
                await this._composer.compose(astree, { interactive: opts.interactive });

                logger.debug(util.inspect(this._composer.getStorage(), {showHidden: false, depth: null, colors: true}));
            }
        } else {
            const batch = [ ];
            while (tokens = this._lexer.next({ accept_carry: opts.accept_carry })) {
                batch.push(...tokens);
            }

            logger.debug(util.inspect(batch, { showHidden: false, depth: null, colors: true}));

            if (isEmpty(batch)) {
                return;
            }

            astree = this._parser.parse(batch, { interactive: opts.interactive });
            astree = Object.freeze(astree);

            logger.debug(util.inspect(astree, { showHidden: false, depth: null, colors: true}));

            if (isEmpty(astree)) {
                return;
            }
    
            await this._composer.compose(astree, { interactive: opts.interactive });

            logger.debug(util.inspect(this._composer.getStorage(), {showHidden: false, depth: null, colors: true}));
        }
    }

    /**
     * Returns true if this interpreter instance is carrying incomplete statements, false otherwise.
     * 
     * @public
     * @method
     * @returns {Boolean} True if carrying, false if not.
     */
    isCarrying() {
        return this._lexer.isCarrying();
    }

    /**
     * Clears the input buffer, thereby removing any incomplete statements that are being carried.
     * 
     * @public
     * @method
     */
    clearCarry() {
        this._lexer.clear();
    }
}
