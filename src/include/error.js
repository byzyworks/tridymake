import { logger } from './logger.js';

export class BaseError extends Error {
    constructor(description, opts = { }) {
        if (new.target === BaseError) {
            throw new Error(`Tried to instantiate abstract class.`);
        }

        super(description, opts);

        this.is_warning = opts.is_warning ?? false;
        this.is_fatal   = opts.is_fatal   ?? false;
    }
}

export class ProgramError extends BaseError {
    constructor(description) {
        logger.debug('Program Error: ' + description);

        super('A fatal exception has occurred.', { is_warning: false, is_fatal: true });
    }
}

export class SyntaxError extends BaseError {
    constructor(description) {
        description = 'Syntax Error: ' + description;

        super(description, { is_warning: false, is_fatal: false });
    }
}

export class FunctionError extends BaseError {
    constructor(description) {
        description = 'Function Error: ' + description;

        super(description, { is_warning: false, is_fatal: false });
    }
}

export class ErrorHandler {
    static handle(err) {
        if ((err instanceof Error) && (process.exitCode === 0)) {
            try {
                if ((err instanceof BaseError) && (err.is_warning === true)) {
                    logger.warn(err.message);
                } else {
                    logger.error(err.message);
                }
                if (err.stack !== undefined) {
                    logger.debug(err.stack);
                }
            } finally {
                if (!(err instanceof BaseError) || (err.is_fatal === true)) {
                    logger.end();
                    process.exitCode = 1;
                }
            }
        }
    }
}
