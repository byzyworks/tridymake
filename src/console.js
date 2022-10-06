import * as readline from 'readline/promises';

import chalk from 'chalk';

import { isEmpty }      from './include/common.js';
import { ErrorHandler } from './include/error.js';
import { global }       from './include/mapped.js';

import { db } from './database.js';

const getPrompt = () => {
    let prompt = '@Tridy>';
    if (db.isCarrying()) {
        prompt = '.'.repeat(prompt.length);
    }
    prompt += ' ';

    return chalk.yellow(prompt);
}

export const cli = async (opts = { }) => {
    const rl = readline.createInterface({
        input:    process.stdin,
        output:   process.stdout,
        terminal: true
    });

    rl.on("SIGINT", () => {
        db.clearCarry();
        rl.setPrompt(getPrompt());

        rl.write(chalk.red("^C"));
        rl.clearLine(-1);
        rl.prompt();
    });

    let answers;

    while (global.flags.exit !== true) {
        answers = await rl.question(getPrompt());

        // The newline is added back since it affects lexer behavior around comments and debug information.
        answers += "\n";

        let out;
        let retry = false;
        try {
            out = await db.query(answers, { accept_carry: true, interactive: true });
        } catch (err) {
            if (err instanceof Error) {
                db.clearCarry();
            } else {
                throw err;
            }
            ErrorHandler.handle(err);
            retry = true;
        }

        if (!retry && !isEmpty(out)) {
            out = await db.present(out);

            if (!isEmpty(out)) {
                console.log(out);
            }
        }
    }

    rl.close();
}
