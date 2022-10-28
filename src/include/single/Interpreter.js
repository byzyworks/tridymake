/**
 * Tridymake database class and exported module.
 * 
 * @module
 */

//import { Composer }       from './Composer.js';
import { SyntaxParser }   from './SyntaxParser.js';
import { StatementLexer } from './StatementLexer.js';

//import * as common from '../common.js';
//import * as error  from '../error.js';
//import * as mapped from '../mapped.js';

/**
 * Database class for interpreting Tridy commands/statements.
 * 
 * A Tridy database includes three parts: a tokenizer, parser, and composer.
 * Each may be stateful to varying degrees.
 * 
 * Interacting with this class is all done through the query() method, which automatically pipes the input through these separate components in order.
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
        //this._composer = new Composer();
    }

    /**
     * Executes Tridy commands.
     * 
     * @async
     * @public
     * @method
     * @param   {String}  input             Tridy command(s)/statement(s), as a string.
     * @param   {Boolean} opts.accept_carry True to statefully retain tokens from incomplete statements, false to throw SyntaxError if receiving an incomplete statement. Default is false.
     * @param   {Boolean} opts.interactive  Allows interactive control commands like @clear and @exit to be effective. Default is false.
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

        while (tokens = this._lexer.next({ accept_carry: opts.accept_carry })) {
            astree = this._parser.parse(tokens, { interactive: opts.interactive });

            console.log(JSON.stringify(astree, null, 4)); // DEBUG
            
            /*
            if (mapped.global.flags.exit === true) {
                if ((opts.filepath !== null) || !opts.interactive) {
                    mapped.global.flags.exit = false;

                    throw new error.SyntaxError(`The @exit command does not work in non-interactive contexts such as scripts or inside server mode.`);
                }

                break;
            }

            if (mapped.global.flags.clear === true) {
                mapped.global.flags.clear = false;

                if ((opts.filepath !== null) || !opts.interactive) {
                    throw new error.SyntaxError(`The @clear command does not work in non-interactive contexts such as scripts or inside server mode.`);
                }

                console.clear();

                continue;
            }

            if (common.isEmpty(astree)) {
                continue;
            }
    
            await this._composer.compose(astree);
            */
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
