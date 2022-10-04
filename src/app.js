#!/usr/bin/env node

import fs   from 'fs';
import path from 'path';

import { Option, program } from 'commander';

import { ErrorHandler }                   from './include/error.js';
import { transports, logger, log_levels } from './include/logger.js';
import * as mapped                        from './include/mapped.js';

//import { db }         from './database.js';
//import { cli }        from './console.js';
//import { queryFiles } from './files.js';

process.exitCode = 0;

process.on('uncaughtException', (err) => {
    ErrorHandler.handle(err);
});

process.on('unhandledRejection', (err) => {
    ErrorHandler.handle(err);
});

const parseLogLevel = (log_level) => {
    transports.console.level = log_level;
    logger.verbose(`Console log level set to '${log_level}'.`);
    mapped.global.log_level = log_level;
}

const parseTridyArgs = (args) => {
    if (args.length % 2 !== 0) {
        program.error(`The number of arguments passed over to Tridymake should be an even number (the number passed was ${args.length}).`);
    }

    // "vars" is referring to variables internal to Tridy, not JavaScript (in other words, as part of the application).
    const global_vars = { };

    const variable_name = new RegExp(mapped.REGEX_MAP.UNQUOTED);
    let   key           = null;
    for (const arg of args) {
        if (key === null) {
            if (!variable_name.test(arg)) {
                program.error(`Argument names (and variable names in general) can only contain letters (lower- and upper-case), digits, or underscores.`);
            }

            key = arg;
        } else {
            global_vars[key] = arg;

            key = null;
        }
    }

    mapped.varmap.push(global_vars);
};

program
    .version(mapped.APP.VERSION)
    .description('Imperative programming language interpreter specially-made for dynamic/DRY-resistant config generation.')
    .addOption(
        new Option('-a, --args <args...>', 'Global (cross-script) variables that are retained over the session, given as key-value pairs (--args key value key value ...).')
    )
    .addOption(
        new Option('-c, --command <commands>', 'Pre-load a Tridy database from a string of Tridy commands.')
            .conflicts('file')
    )
    .addOption(
        new Option('-f, --file <paths...>', 'Pre-load a Tridy database from one or several files.')
            .conflicts('command')
    )
    .addOption(
        new Option('-i, --include <paths...>', 'Folders to search Tridy functions out of.')
            .default(mapped.global.defaults.include)
    )
    .addOption(
        new Option('-l, --log-level <level>', 'The log level used, as one of NPM\'s available log levels')
            .choices(Object.keys(log_levels))
            .default(mapped.global.defaults.log_level)
    )
    .hook('preAction', async (thisCommand, actionCommand) => {
        const opts = program.opts();

        // Handle log level before everything else (that may call logging functionality).
        parseLogLevel(opts.logLevel);

        // Loads cross-script (Tridy-global) variables.
        if (opts.args !== undefined) {
            parseTridyArgs(opts.args);
        }

        if (opts.command) {
            //await db.query(opts.command, { accept_carry: false });
        } else if (opts.file) {
            for (let filepath of opts.file) {
                filepath = path.join(mapped.APP.ROOT, filepath);

                try {
                    const input = await fs.promises.readFile(filepath, 'utf-8');
                } catch (err) {
                    ErrorHandler.handle(err);

                    continue;
                }
        
                //await db.query(input, { accept_carry: false, filepath: path.resolve(filepath) });
            }
        }
    })
;

program
    .command('make')
    .description('Run Tridy scripts/commands and exit.')
    .action(async (opts, command) => {
        opts = command.optsWithGlobals();

        if (!opts.command && !opts.file) {
            program.error('error: either --command or --file need to be given with the "make" command.');
        }
    })
;

program
    .command('tell')
    .description('Start an interactive console session.')
    //.action(async (opts, command) => await cli(command.optsWithGlobals()))
;

program.parse(process.argv);
