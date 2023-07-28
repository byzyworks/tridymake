#!/usr/bin/env node

import fs   from 'fs';
import path from 'path';

import { Option, program } from 'commander';

import { ErrorHandler }                   from './include/error.js';
import { transports, logger, log_levels } from './include/logger.js';
import * as mapped                        from './include/mapped.js';

import { db }  from './database.js';
import { cli } from './console.js';

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

const parseCommands = async (commands) => {
    await db.query(commands, { accept_carry: false });
}

const parseFile = async (filepath) => {
    mapped.global.scriptname = filepath ?? mapped.defaults.global.scriptname;
        
    let input;

    try {
        input = await fs.promises.readFile(mapped.global.scriptname, 'utf-8');
    } catch (err) {
        ErrorHandler.handle(err);
    }

    await db.query(input, { accept_carry: false, filepath: path.resolve(mapped.global.scriptname) });
}

program
    .version(mapped.APP.VERSION)
    .description('Imperative programming language interpreter specially-made for dynamic/DRY-resistant config generation.')
    .addOption(
        new Option('-c, --commands <commands>', 'Execute a string of Tridy commands.')
            .conflicts('file')
    )
    .addOption(
        new Option('-f, --file <path>', 'Execute Tridy commands from a (named) script file.')
            .conflicts('command')
    )
    .addOption(
        new Option('-l, --log-level <level>', 'The log level used, as one of NPM\'s available log levels')
            .choices(Object.keys(log_levels))
            .default(mapped.global.defaults.log_level)
    )
    .addOption(
        new Option('-i, --sources <paths...>', 'Folders to search Tridy source functions out of.')
            .default(mapped.global.defaults.include.sources)
    )
    .addOption(
        new Option('-o, --sinks <paths...>', 'Folders to search Tridy sink functions out of.')
            .default(mapped.global.defaults.include.sinks)
    )
    .hook('preAction', async (thisCommand, actionCommand) => {
        const opts = program.opts();

        parseLogLevel(opts.logLevel);

        if (opts.commands) {
            parseCommands(opts.commands);
        } else {
            parseFile(opts.file);
        }
    })
;

program
    .command('bake')
    .description('Run Tridy scripts/commands and exit.')
;

program
    .command('tell')
    .description('Start an interactive console session.')
    .action(async (opts, command) => await cli(command.optsWithGlobals()))
;

program.parse(process.argv);
