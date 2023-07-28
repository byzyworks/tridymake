import path              from 'path';
import { fileURLToPath } from 'url';

import { deepCopy } from './common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export const APP = Object.freeze({
    NAME:    'Tridymake',
    VERSION: '1.0.0',
    ROOT:    path.join(__dirname, '../..')
});

export const global = {
    scriptname: 'Recipe.tri',
    flags: {
        clear: false,
        exit:  false
    },
    include: {
        sources: [
            './sources'
        ],
        sinks: [
            './sinks'
        ]
    },
    log_level: 'info',
};
global.defaults = Object.freeze(deepCopy(global));

export const REGEX = Object.freeze({
    SYMBOL: '[~!@$%^&*()=\\[\\]{}|;:,<>?\\/]',
    WORD:   '^[-A-Za-z0-9_+.]+$'
});

export const TOKEN_KEY = Object.freeze({
    SYMBOL: 'symbol',
    WORD:   'word',
    STRING: 'string'
});

export const TREE_KEY = Object.freeze({
    ASTREE: {
        LABEL:      'label',
        EXPRESSION: 'expression',
        OPERATION:  'operation',
        VALUE: {
            TYPE:      'type',
            DATA:      'data',
            ARGUMENTS: 'arguments'
        }
    },
    SHARED: {
        METADATA: 'metadata',
        DATA:     'data',
        NESTED:   'nested'
    }
});

export const EXPRESSION_TYPE = Object.freeze({
    TAG:   'tag',
    VALUE: 'value'
});

export const GENERAL_SYNTAX = Object.freeze({
    LABEL_START:     '(',
    LABEL_END:       ')',
    EXPRESSION_MARK: '@',
    MAPPING_MARK:    '$',
    STORAGE_MARK:    '@',
    FUNCTION_START:  '(',
    FUNCTION_END:    ')',
    FUNCTION_ALT:  '~',
    KEYVALUE_START:  '[',
    KEYVALUE_END:    ']',
    ASSIGNMENT:      '=',
    DELIMITER:       ',',
    STRING_DELIMITER: {
        LINE:      "'",
        MAGIC:     '"',
        MULTILINE: '`'
    },
    ESCAPE:        '\\',
    EMPLACEMENT:   ':',
    NESTED_START:  '{',
    NESTED_END:    '}',
    STATEMENT_END: ';',
    COMMENT_START: '#',
});

export const EXPRESSION = Object.freeze({
    LEFT_PARENTHESES:                        '(',
    RIGHT_PARENTHESES:                       ')',
    WILDCARD:                                '*',
    NOT:                                     '!',
    IMPLICIT_OPERATOR:                       '&',
    AND:                                     '&',
    XOR:                                     '^',
    OR:                                      '|',
    TERNARY_1:                               '?',
    TERNARY_2:                               ':',
    LOOKAHEAD:                               '>',
    RECURSIVE_LOOKAHEAD:                     '>>',
    LOOKBEHIND:                              '<',
    RECURSIVE_LOOKBEHIND:                    '<<',
    LOOKAROUND:                              '<>',
    INVERSE_LOOKAHEAD:                       '!>',
    INVERSE_RECURSIVE_LOOKAHEAD:             '!>>',
    INVERSE_LOOKBEHIND:                      '!<',
    INVERSE_RECURSIVE_LOOKBEHIND:            '!<<',
    INVERSE_LOOKAROUND:                      '!<>',
    FORWARD_TRANSITION:                      '/',
    RECURSIVE_FORWARD_TRANSITION:            '//',
    BACKWARD_TRANSITION:                     '%',
    RECURSIVE_BACKWARD_TRANSITION:           '%%',
    SIDEWARD_TRANSITION:                     '%/',
    INCLUSIVE_FORWARD_TRANSITION:            '&/',
    INCLUSIVE_RECURSIVE_FORWARD_TRANSITION:  '&//',
    INCLUSIVE_BACKWARD_TRANSITION:           '&%',
    INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION: '&%%',
    INCLUSIVE_SIDEWARD_TRANSITION:           '&%/',
    OR_LOW_PRECEDENCE:                       '||',
    TERNARY_LOW_PRECEDENCE_1:                '??',
    TERNARY_LOW_PRECEDENCE_2:                '::',
    VALUE_EXPRESSION_START:                  '[',
    VALUE_EXPRESSION_END:                    ']',
    EQUAL_TO:                                '==',
    NOT_EQUAL_TO:                            '!=',
    LESS_THAN:                               '<',
    LESS_THAN_OR_EQUAL_TO:                   '<=',
    GREATER_THAN:                            '>',
    GREATER_THAN_OR_EQUAL_TO:                '>='
});

/**
 * Precedence is decided on the basis on the outcome of a function.
 * 
 * NOT and AND have the weakest effect, because they are associative with any of the nested operators.
 * It makes no difference to have a&(b>c) vs. (a&b)>c, or a&(b/c) vs. (a&b)/c.
 * They only look at tag properties, and do not affect the actual traversal itself.
 * In addition, they cannot cause the traversal algorithm to branch off into two or more possible paths.
 * That's because, in order for them to apply as true, both their operands have to describe the same module.
 * Nested operators go to either a parent or a child of the current module, so they cannot describe the same module as an expression that lacks them.
 * 
 * Below that are the non-transitive nested operators.
 * These can affect traversal because they have to look either at the module's parents or its children to come to an answer.
 * However, they still cannot cause the algorithm to branch off into different paths.
 * Again, the answer is applied back to the original (same) module being rooted from since they are not transitive.
 * 
 * XOR, OR, and the ternary operator *can* cause the traversal algorithm to split off into different possible paths.
 * Think about it. If you have a||b/c, it's the same as saying either a module "a", or a module "c" under module "b", starting at the same root.
 * "c" cannot be "a", so this is two different paths.
 * a&b/c
 */
export const PRECEDENCE = Object.freeze({
    '!':   1,
    '&':   2,
    '>':   3,
    '>>':  3,
    '<':   3,
    '<<':  3,
    '<>':  3,
    '!>':  3,
    '!>>': 3,
    '!<':  3,
    '!<<': 3,
    '!<>': 3,
    '^':   4,
    '|':   5,
    '?':   6,
    ':':   6,
    '/':   7,
    '//':  7,
    '%':   7,
    '%%':  7,
    '%/':  7,
    '&/':  7,
    '&//': 7,
    '&%':  7,
    '&%%': 7,
    '&%/': 7,
    '^^':  8,
    '||':  9,
    '??':  10,
    '::':  10
});

export const OPERATION = Object.freeze({
    NOP:                       'tridy',
    APPEND_STORAGE:            'new',
    PRECEDE_STORAGE:           'head',
    SUCCEED_STORAGE:           'tail',
    OVERWRITE_STORAGE:         'write',
    EDIT_STORAGE:              'put',
    DELETE_STORAGE:            'delete',
    EDIT_METADATA:             'set',
    DELETE_METADATA:           'unset',
    DECLARE_VARIABLE:          'let',
    EDIT_VARIABLE:             'var',
    BLOCK:                     'do',
    CONDITION_BASIC:           'if',
    CONDITION_EXISTENCE:       'ifone',
    CONDITION_UNIVERSAL:       'ifall',
    CONTROL_BREAK:             'break',
    CONTROL_LOOP_STRIDE:       'stride',
    CONTROL_LOOP_CONTINUE:     'continue',
    CONTROL_PROCEDURE_EXIT:    'return',
    CONTROL_EXIT:              'exit',
    PROCEDURE_CREATE_VIRTUAL:  'define',
    PROCEDURE_INVOKE_VIRTUAL:  'call',
    PROCEDURE_INVOKE_PHYSICAL: 'import',
    OUTPUT_STORAGE:            'export',
    CHANGE_CONTEXT:            '@',
    CONSOLE_CLEAR_OUTPUT:      'clear',
    CONSOLE_EXIT:              'exit'
});

export const INTERNAL_OPERATION = Object.freeze({
    BREAK:    Symbol('break'),
    STRIDE:   Symbol('stride'),
    CONTINUE: Symbol('continue')
});

export const JAVASCRIPT_TO_TRIDY_VALUE = Object.freeze({
    true:      'true',
    false:     'false',
    null:      'null',
    undefined: 'empty'
});

/**
 * The use of symbols for Tridy's nullish-values (in this case, 'empty', where the separate value of undefined in Tridy is equivalent to deletion) has reasons,
 * even though JavaScript has its own nullish primitives that (mostly) are 1:1 with Tridy's.
 * This is intended to prevent the code from confusing nullish (primitive JavaScript) values (symbolizing the absence of a field) from Tridy's own nullish values
 * that are explicitly set by the user.
 */
export const SPECIAL_VALUE = Object.freeze({
    NULL:      Symbol('null'),
    EMPTY:     Symbol('empty'),
    UNDEFINED: Symbol('undefined')
});

export const TRIDY_TO_JAVASCRIPT_VALUE = Object.freeze({
    true:      true,
    false:     false,
    null:      SPECIAL_VALUE.NULL,
    empty:     SPECIAL_VALUE.EMPTY,
    undefined: SPECIAL_VALUE.UNDEFINED
});

export const DIRECTION = Object.freeze({
    PARENTS:  -1,
    SIBLINGS: 0,
    CHILDREN: 1
});
