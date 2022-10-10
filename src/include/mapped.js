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
    include: [
        './functions'
    ],
    log_level: 'info'
};
global.defaults = Object.freeze(deepCopy(global));

export const varmap = [ ];

export const MODULE_KEY_MAP = Object.freeze({
    METADATA: 'meta',
    DATA:     'data',
    NESTED:   'tree'
});

export const GENERAL_SYNTAX_MAP = Object.freeze({
    ASSIGNMENT:          '=',
    DELIMITER:           ',',
    EMPLACEMENT:         ':',
    CONTEXT_START:       '(',
    CONTEXT_END:         ')',
    CONTEXT_VALUE_START: '[',
    CONTEXT_VALUE_END:   ']',
    METADATA_START:      '[',
    METADATA_END:        ']',
    FUNCTION_START:      '(',
    FUNCTION_END:        ')',
    NESTED_START:        '{',
    NESTED_END:          '}',
    STRING_DELIMITER: {
        LINE:      "'",
        MAGIC:     '"',
        MULTILINE: '`'
    },
    ESCAPE:        '\\',
    STATEMENT_END: ';',
    COMMENT_START: '#',
});

export const REGEX_MAP = Object.freeze({
    UNQUOTED: '^[A-Za-z0-9_.]+$',
    SYMBOL:   '[~!$%^&*()-=+\\[\\]{}|;:,<>?\\/]'
});

export const TOKEN_KEY_MAP = Object.freeze({
    SYMBOL: 'sym',
    STRING: {
        UNQUOTED: 'str',
        QUOTED:   'qstr',
    },
    CONTEXT: {
        LITERAL:       'val',
        VARIABLE:      'var',
        FUNCTION:      'func',
        TAGLIKE:       'tag',
        OPERATION:     'op',
        MISCELLANEOUS: 'misc'
    }
});

// For multi-character symbols, make sure to change how they're handled in the token lexer under _readSymbols() as well.
const VALUE_SYMBOL       = '$';
export const CONTEXT_MAP = Object.freeze({
    LEFT_PARENTHESES:                             '(',
    RIGHT_PARENTHESES:                            ')',
    WILDCARD_LONG:                                'any',
    WILDCARD:                                     '*',
    NOT_LONG:                                     'not',
    NOT:                                          '!',
    AND_LONG:                                     'and',
    AND:                                          '&',
    XOR_LONG:                                     'xor',
    XOR:                                          '^',
    OR_LONG:                                      'or',
    OR:                                           '|',
    OR_EXTRA:                                     ',',
    TERNARY_1_LONG:                               'then',
    TERNARY_1:                                    '?',
    TERNARY_2_LONG:                               'else',
    TERNARY_2:                                    ':',
    LOOKAHEAD_LONG:                               'parent',
    LOOKAHEAD:                                    '>',
    RECURSIVE_LOOKAHEAD_LONG:                     'ascend',
    RECURSIVE_LOOKAHEAD:                          '>>',
    LOOKBEHIND_LONG:                              'child',
    LOOKBEHIND:                                   '<',
    RECURSIVE_LOOKBEHIND_LONG:                    'descend',
    RECURSIVE_LOOKBEHIND:                         '<<',
    LOOKAROUND_LONG:                              'sibling',
    LOOKAROUND:                                   '<>',
    INVERSE_LOOKAHEAD_LONG:                       'nonparent',
    INVERSE_LOOKAHEAD:                            '!>',
    INVERSE_RECURSIVE_LOOKAHEAD_LONG:             'nonascend',
    INVERSE_RECURSIVE_LOOKAHEAD:                  '!>>',
    INVERSE_LOOKBEHIND_LONG:                      'nonchild',
    INVERSE_LOOKBEHIND:                           '!<',
    INVERSE_RECURSIVE_LOOKBEHIND_LONG:            'nondescend',
    INVERSE_RECURSIVE_LOOKBEHIND:                 '!<<',
    INVERSE_LOOKAROUND_LONG:                      'nonsibling',
    INVERSE_LOOKAROUND:                           '!<>',
    FORWARD_TRANSITION_LONG:                      'to',
    FORWARD_TRANSITION:                           '/',
    CHAINED_FORWARD_TRANSITION_LONG:              'tochain',
    CHAINED_FORWARD_TRANSITION:                   '//',
    RECURSIVE_FORWARD_TRANSITION_LONG:            'toall',
    RECURSIVE_FORWARD_TRANSITION:                 '/~',
    BACKWARD_TRANSITION_LONG:                     'back',
    BACKWARD_TRANSITION:                          '%',
    CHAINED_BACKWARD_TRANSITION_LONG:             'backchain',
    CHAINED_BACKWARD_TRANSITION:                  '%%',
    RECURSIVE_BACKWARD_TRANSITION_LONG:           'backall',
    RECURSIVE_BACKWARD_TRANSITION:                '%~',
    INCLUSIVE_FORWARD_TRANSITION_LONG:            'andto',
    INCLUSIVE_FORWARD_TRANSITION:                 '&/',
    INCLUSIVE_CHAINED_FORWARD_TRANSITION_LONG:    'andtochain',
    INCLUSIVE_CHAINED_FORWARD_TRANSITION:         '&//',
    INCLUSIVE_RECURSIVE_FORWARD_TRANSITION_LONG:  'andtoall',
    INCLUSIVE_RECURSIVE_FORWARD_TRANSITION:       '&/~',
    INCLUSIVE_BACKWARD_TRANSITION_LONG:           'andback',
    INCLUSIVE_BACKWARD_TRANSITION:                '&%',
    INCLUSIVE_CHAINED_BACKWARD_TRANSITION_LONG:   'andbackchain',
    INCLUSIVE_CHAINED_BACKWARD_TRANSITION:        '&%%',
    INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION_LONG: 'andbackall',
    INCLUSIVE_RECURSIVE_BACKWARD_TRANSITION:      '&%~',
    VALUE_SYMBOL:                                 VALUE_SYMBOL,
    EQUAL_TO_LONG:                                'eq',
    EQUAL_TO:                                     '==',
    EQUAL_TO_INTERNAL:                            VALUE_SYMBOL + '==',
    NOT_EQUAL_TO_LONG:                            'ne',
    NOT_EQUAL_TO:                                 '!=',
    NOT_EQUAL_TO_INTERNAL:                        VALUE_SYMBOL + '!=',
    LESS_THAN_LONG:                               'lt',
    LESS_THAN:                                    '<',
    LESS_THAN_INTERNAL:                           VALUE_SYMBOL + '<',
    LESS_THAN_OR_EQUAL_TO_LONG:                   'le',
    LESS_THAN_OR_EQUAL_TO:                        '<=',
    LESS_THAN_OR_EQUAL_TO_INTERNAL:               VALUE_SYMBOL + '<=',
    GREATER_THAN_LONG:                            'gt',
    GREATER_THAN:                                 '>',
    GREATER_THAN_INTERNAL:                        VALUE_SYMBOL + '>',
    GREATER_THAN_OR_EQUAL_TO_LONG:                'ge',
    GREATER_THAN_OR_EQUAL_TO:                     '>=',
    GREATER_THAN_OR_EQUAL_TO_INTERNAL:            VALUE_SYMBOL + '>=',
    ADD_LONG:                                     'add',
    ADD:                                          '+',
    ADD_INTERNAL:                                 VALUE_SYMBOL + '+',
    SUBTRACT_LONG:                                'sub',
    SUBTRACT:                                     '-',
    SUBTRACT_INTERNAL:                            VALUE_SYMBOL + '-',
    MULTIPLY_LONG:                                'mul',
    MULTIPLY:                                     '*',
    MULTIPLY_INTERNAL:                            VALUE_SYMBOL + '*',
    DIVIDE_LONG:                                  'div',
    DIVIDE:                                       '/',
    DIVIDE_INTERNAL:                              VALUE_SYMBOL + '/',
    MODULUS_LONG:                                 'mod',
    MODULUS:                                      '%',
    MODULUS_INTERNAL:                             VALUE_SYMBOL + '%',
    EXPONENT_LONG:                                'exp',
    EXPONENT:                                     '^',
    EXPONENT_INTERNAL:                            VALUE_SYMBOL + '^',
});

export const OPERATION_MAP = Object.freeze({
    NOP:                  'tridy',
    APPEND_MODULE:        'new',
    PRECEDE_MODULE:       'head',
    SUCCEED_MODULE:       'tail',
    OVERWRITE_MODULE:     'force',
    EDIT_MODULE:          'put',
    DELETE_MODULE:        'delete',
    EDIT_METADATA:        'set',
    DELETE_METADATA:      'unset',
    ACCESS_VARIABLE:      'var',
    ACCESS_CONTEXT:       'in',
    CONDITION_EXISTS:     'if',
    CONDITION_NOT_EXISTS: 'unless',
    SWITCH_START:         'switch',
    LOOP_START:           'for',
    CONTROL_CONTINUE:     'continue',
    CONTROL_BREAK:        'break',
    CONSOLE_STATISTICS:   'stat',
    CONSOLE_CLEAR_OUTPUT: 'clear',
    CONSOLE_EXIT:         'exit'
});

export const META_OPERATION_MAP = Object.freeze({
    CONDITION_ELSE:       'else',
    SWITCH_CASE:          'case',
    SWITCH_DEFAULT:       'default',
    LOOP_SOURCE:          'of'
});

export const VALUE_MAP = Object.freeze({
    TRUE:      'true',
    FALSE:     'false',
    NAN:       'fact',
    NULL:      'null',
    UNDEFINED: 'none'
});
