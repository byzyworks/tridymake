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
    log_level: 'info'
};
global.defaults = Object.freeze(deepCopy(global));

export const varmap = [ ];

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
    EXPRESSION_MARK: '@',
    MAPPING_MARK:    '$',
    STORAGE_MARK:    '@',
    FUNCTION_START:  '(',
    FUNCTION_END:    ')',
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
    CHAINED_FORWARD_TRANSITION:              '/~',
    RECURSIVE_FORWARD_TRANSITION:            '//',
    BACKWARD_TRANSITION:                     '%',
    CHAINED_BACKWARD_TRANSITION:             '%~',
    RECURSIVE_BACKWARD_TRANSITION:           '%%',
    INCLUSIVE_FORWARD_TRANSITION:            '&/',
    INCLUSIVE_CHAINED_FORWARD_TRANSITION:    '&/~',
    INCLUSIVE_RECURSIVE_FORWARD_TRANSITION:  '&//',
    INCLUSIVE_BACKWARD_TRANSITION:           '&%',
    INCLUSIVE_CHAINED_BACKWARD_TRANSITION:   '&%~',
    INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION: '&%%',
    OR_LOW_PRECEDENCE:                       ',',
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

export const PRECEDENCE = Object.freeze({
    '!':   1,
    '&':   2,
    '^':   3,
    '|':   4,
    '?':   5,
    ':':   5,
    '>':   6,
    '>>':  6,
    '<':   6,
    '<<':  6,
    '<>':  6,
    '!>':  6,
    '!>>': 6,
    '!<':  6,
    '!<<': 6,
    '!<>': 6,
    '/':   7,
    '/~':  7,
    '//':  7,
    '%':   7,
    '%~':  7,
    '%%':  7,
    '&/':  7,
    '&/~': 7,
    '&//': 7,
    '&%':  7,
    '&%~': 7,
    '&%%': 7,
    ',':   8,
    '??':  9,
    '::':  9
});

export const OPERATION = Object.freeze({
    NOP:                   'tridy',
    APPEND_MODULE:         'new',
    PRECEDE_MODULE:        'head',
    SUCCEED_MODULE:        'tail',
    OVERWRITE_MODULE:      'write',
    EDIT_MODULE:           'put',
    DELETE_MODULE:         'delete',
    EDIT_METADATA:         'set',
    DELETE_METADATA:       'unset',
    DECLARE_VARIABLE:      'let',
    EDIT_VARIABLE:         'var',
    BLOCK:                 'do',
    CONDITION_SUCCESS:     'if',
    CONDITION_FAILURE:     'unless',
    LOOP:                  'for',
    CONTROL_SKIP_TO_LABEL: 'skipto',
    CONTROL_LABEL:         'label',
    CHANGE_CONTEXT:        '@',
    OUTPUT_MODULE:         'out',
    CONSOLE_CLEAR_OUTPUT:  'clear',
    CONSOLE_EXIT:          'exit',
});

export const JAVASCRIPT_TO_TRIDY_VALUE = Object.freeze({
    true:      'true',
    false:     'false',
    NaN:       'artifact',
    null:      'null',
    undefined: 'empty',
});

export const SPECIAL_VALUE = Object.freeze({
    ARTIFACT:  Symbol('artifact'),
    NULL:      Symbol('null'),
    EMPTY:     Symbol('empty'),
    UNDEFINED: Symbol('undefined')
});

export const TRIDY_TO_JAVASCRIPT_VALUE = Object.freeze({
    true:      true,
    false:     false,
    artifact:  SPECIAL_VALUE.ARTIFACT,
    null:      SPECIAL_VALUE.NULL,
    empty:     SPECIAL_VALUE.EMPTY,
    undefined: SPECIAL_VALUE.UNDEFINED
});
