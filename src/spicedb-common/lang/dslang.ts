import {
  findReferenceNode,
  parse,
} from '../parsers/dsl/dsl';
import {
  ResolvedReference,
  Resolver,
} from '../parsers/dsl/resolution';
import {
  Position,
  editor,
  languages,
} from 'monaco-editor-core';
import * as monacoEditor from 'monaco-editor';

export const DS_LANGUAGE_NAME = 'dsl';
export const DS_THEME_NAME = 'dsl-theme';
export const DS_DARK_THEME_NAME = 'dsl-theme-dark';
export const DS_EMBED_DARK_THEME_NAME = 'dsl-theme-embed-dark';

export default function registerDSLanguage(monaco: typeof monacoEditor) {
  // Based on: https://github.com/microsoft/monaco-languages/blob/main/src/typescript/typescript.ts
  const richEditConfiguration = {
     
    wordPattern:
      /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,

    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'] satisfies [string, string],
    },

    brackets: [
      ['{', '}'] satisfies [string, string],
      ['[', ']'] satisfies [string, string],
      ['(', ')'] satisfies [string, string],
    ],

    onEnterRules: [
      {
        // e.g. /** | */
        beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
        afterText: /^\s*\*\/$/,
        action: {
          indentAction: monaco.languages.IndentAction.IndentOutdent,
          appendText: ' * ',
        },
      },
      {
        // e.g. /** ...|
        beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
        action: {
          indentAction: monaco.languages.IndentAction.None,
          appendText: ' * ',
        },
      },
      {
        // e.g.  * ...|
        beforeText: /^(\t|( {2}))* \*( ([^*]|\*(?!\/))*)?$/,
        action: {
          indentAction: monaco.languages.IndentAction.None,
          appendText: '* ',
        },
      },
      {
        // e.g.  */|
        beforeText: /^(\t|( {2}))* \*\/\s*$/,
        action: {
          indentAction: monaco.languages.IndentAction.None,
          removeText: 1,
        },
      },
    ],

    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string', 'comment'] },
      { open: '`', close: '`', notIn: ['string', 'comment'] },
      { open: '/**', close: ' */', notIn: ['string'] },
    ],
  };

  monaco.languages.register({ id: DS_LANGUAGE_NAME });
  monaco.languages.setLanguageConfiguration(
    DS_LANGUAGE_NAME,
    richEditConfiguration
  );
  monaco.languages.setMonarchTokensProvider(DS_LANGUAGE_NAME, {
    keywords: [],
    symbols: /[=><!~?:&|+\-*^%]+/,
    escapes:
      /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
      root: [
        [
          /definition/,
          {
            token: 'keyword.definition',
            bracket: '@open',
            next: '@definition',
          },
        ],
        [
          /caveat/,
          { token: 'keyword.caveat', bracket: '@open', next: '@caveat' },
        ],
        [
          /permission/,
          {
            token: 'keyword.permission',
            bracket: '@open',
            next: '@permission',
          },
        ],
        [
          /relation/,
          { token: 'keyword.relation', bracket: '@open', next: '@relation' },
        ],
        { include: '@whitespace' },

        // delimiters and operators
        [/[{}]/, '@brackets'],
        [
          /@symbols/,
          {
            cases: {
              '@default': '',
            },
          },
        ],
      ],
      caveat: [
        [
          /([a-z0-9_]+\/)+/,
          { token: 'identifier.caveat-prefix', next: '@subcav' },
        ],
        [/[a-z0-9_]+/, { token: 'identifier.caveat', next: '@caveatparams' }],
      ],
      subcav: [
        [/[a-z0-9_]+/, { token: 'identifier.caveat', next: '@caveatparams' }],
      ],
      caveatparams: [[/\(/, { token: '@rematch', next: '@caveatparam' }]],
      caveatparam: [
        [
          /[a-z0-9_]+/,
          { token: 'identifier.caveat-param-name', next: '@caveattype' },
        ],
      ],
      caveattype: [
        [
          /[a-z0-9_]+/,
          {
            token: 'identifier.caveat-param-type-name',
            next: '@genericsornextcaveatparam',
          },
        ],
      ],
      genericsornextcaveatparam: [
        [/</, { token: 'open', next: '@caveattype' }],
        [/>/, { token: 'close', next: '@genericsornextcaveatparam' }],
        [/,/, { token: 'comma', next: '@caveatparam' }],
        [/\)/, { token: '@rematch', next: '@caveatexprblock' }],
      ],
      caveatexprblock: [
        [/$/, { token: 'close', next: '@popall', nextEmbedded: '@pop' }],
        [
          /{/,
          {
            token: 'open',
            next: '@caveatexpr',
            bracket: '@open',
            nextEmbedded: 'cel',
          },
        ],
        [
          /}/,
          {
            token: '@rematch',
            next: '@popall',
            bracket: '@close',
            nextEmbedded: '@pop',
          },
        ],
      ],
      caveatexpr: [
        [/$/, { token: 'close', next: '@popall', nextEmbedded: '@pop' }],
        [
          /{/,
          {
            token: 'open',
            next: '@caveatexpr',
            bracket: '@open',
          },
        ],
        [
          /}/,
          {
            token: '@rematch',
            next: '@pop',
            bracket: '@close',
          },
        ],
        [
          /\(/,
          {
            token: 'open',
            next: '@caveatexpr',
            bracket: '@open',
          },
        ],
        [
          /\)/,
          {
            token: '@rematch',
            next: '@pop',
            bracket: '@close',
          },
        ],
        [
          /[a-z0-9_]+/,
          {
            token: 'identifier.caveat-usage',
            next: '@caveatexpr',
          },
        ],
        [
          /./,
          {
            token: 'othercaveattoken',
            next: '@caveatexpr',
          },
        ],
        [
          /[ \t\r\n]+/,
          {
            token: 'whitespace',
            next: '@caveatexpr',
          },
        ],
      ],
      definition: [
        [
          /([a-z0-9_]+\/)+/,
          { token: 'identifier.definition-prefix', next: '@subdef' },
        ],
        [/[a-z0-9_]+/, { token: 'identifier.definition', next: '@popall' }],
      ],
      subdef: [
        [/[a-z0-9_]+/, { token: 'identifier.definition', next: '@popall' }],
      ],
      permission: [
        [/[a-z0-9_]+/, { token: 'identifier.permission', next: '@expr' }],
      ],
      expr: [
        [/$/, { token: 'close', next: '@popall' }],
        [/}/, { token: '@rematch', next: '@popall' }],
        [/relation/, { token: '@rematch', next: '@popall' }],
        [/permission/, { token: '@rematch', next: '@popall' }],
        [/any/, { token: 'keyword.any', next: '@arrowopen' }],
        [/all/, { token: 'keyword.all', next: '@arrowopen' }],
        [/nil/, { token: 'keyword.nil' }],
        [/\w+/, { token: 'identifier.relorperm' }],
        { include: '@whitespace' },
      ],
      arrowopen: [
        [/$/, { token: 'close', next: '@popall' }],
        [/}/, { token: '@rematch', next: '@popall' }],
        [/\)/, { token: 'close', next: '@pop' }],
        [/\(/, { token: '@rematch', next: '@arrowrel' }],
        { include: '@whitespace' },
      ],
      arrowrel: [
        [/$/, { token: 'close', next: '@popall' }],
        [/}/, { token: '@rematch', next: '@popall' }],
        [/\)/, { token: 'close', next: '@pop' }],
        [/\w+/, { token: 'identifier.relorperm' }],
        { include: '@whitespace' },
      ],
      relation: [
        [/[a-z0-9_]+/, { token: 'identifier.relation', next: '@allowed' }],
      ],
      allowed: [[/:/, { token: 'allowed', next: '@typedef' }]],
      typedef: [
        [/$/, { token: 'close', next: '@popall' }],
        [/}/, { token: '@rematch', next: '@popall' }],
        [/relation/, { token: '@rematch', next: '@popall' }],
        [/permission/, { token: '@rematch', next: '@popall' }],
        [
          /([a-z0-9_]+\/)+/,
          { token: 'identifier.type-prefix', next: '@typedef' },
        ],
        [/\w+#/, { token: '@rematch', next: '@relationref' }],
        [/\w+:/, { token: '@rematch', next: '@wildcardref' }],
        [/\w+/, { token: 'type.identifier' }],
        { include: '@whitespace' },
      ],
      relationref: [
        [/\w+/, { token: 'type.identifier', next: '@relsymbol' }],
        [/./, { token: '@rematch', next: '@pop' }],
        [/$/, { token: 'close', next: '@popall' }],
      ],
      relsymbol: [
        [/#/, { token: 'type.relsymbol', next: '@relvalue' }],
        [/./, { token: '@rematch', next: '@pop' }],
        [/$/, { token: 'close', next: '@popall' }],
      ],
      relvalue: [[/\w+/, { token: 'type.relation', next: '@pop' }]],
      wildcardref: [
        [/\w+/, { token: 'type.identifier', next: '@wildcardsymbol' }],
        [/./, { token: '@rematch', next: '@pop' }],
        [/$/, { token: 'close', next: '@popall' }],
      ],
      wildcardsymbol: [
        [/:/, { token: 'type.wildcardsymbol', next: '@wildcardvalue' }],
        [/./, { token: '@rematch', next: '@pop' }],
        [/$/, { token: 'close', next: '@popall' }],
      ],
      wildcardvalue: [[/\*/, { token: 'type.wildcard', next: '@pop' }]],
      comment: [
        // eslint-disable-next-line
        [/[^\/*]+/, 'comment'],

        [/\*\//, 'comment', '@pop'],

        // eslint-disable-next-line
        [/[\/*]/, 'comment'],
      ],
      doccomment: [
        // eslint-disable-next-line
        [/[^\/*]+/, 'comment.doc'],

        [/\*\//, 'comment.doc', '@pop'],

        // eslint-disable-next-line
        [/[\/*]/, 'comment.doc'],
      ],
      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\*\*(?!\/)/, 'comment.doc', '@doccomment'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider(DS_LANGUAGE_NAME, {
    triggerCharacters: [':', '=', '+', '-', '&', '(', '|', '#'],

    provideCompletionItems: function () {
      //const lastChars = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: 0, endLineNumber: position.lineNumber, endColumn: position.column });
      return {
        suggestions: [],
      };
    },
  });

  monaco.languages.registerDefinitionProvider(DS_LANGUAGE_NAME, {
    provideDefinition: function (
      model: editor.ITextModel,
      position: Position,
    ): languages.ProviderResult<languages.Definition> {
      const text = model.getValue();
      const parserResult = parse(text);
      if (parserResult.error) {
        return;
      }

      const found = findReferenceNode(
        parserResult.schema!,
        position.lineNumber,
        position.column
      );
      if (!found) {
        return;
      }

      const resolution = new Resolver(parserResult.schema!);
      switch (found.node?.kind) {
        case 'typeref': {
          const def = resolution.lookupDefinition(found.node.path);
          if (def) {
            if (found.node.relationName) {
              const relation = def.lookupRelationOrPermission(
                found.node.relationName
              );
              if (relation) {
                return {
                  uri: model.uri,
                  range: {
                    startLineNumber: relation.range.startIndex.line,
                    startColumn: relation.range.startIndex.column,
                    endLineNumber: relation.range.startIndex.line,
                    endColumn: relation.range.startIndex.column,
                  },
                };
              }
            } else {
              return {
                uri: model.uri,
                range: {
                  startLineNumber: def.definition.range.startIndex.line,
                  startColumn: def.definition.range.startIndex.column,
                  endLineNumber: def.definition.range.startIndex.line,
                  endColumn: def.definition.range.startIndex.column,
                },
              };
            }
          }
          break;
        }

        case 'relationref': {
          const relation = resolution.resolveRelationOrPermission(
            found.node,
            found.def
          );
          if (relation) {
            return {
              uri: model.uri,
              range: {
                startLineNumber: relation.range.startIndex.line,
                startColumn: relation.range.startIndex.column,
                endLineNumber: relation.range.startIndex.line,
                endColumn: relation.range.startIndex.column,
              },
            };
          }
          break;
        }
      }

      return undefined;
    },
  });

  monaco.languages.registerDocumentSemanticTokensProvider(DS_LANGUAGE_NAME, {
    getLegend: function (): languages.SemanticTokensLegend {
      return {
        tokenTypes: [
          'type',
          'property',
          'member',
          'type.unknown',
          'member.unknown',
        ],
        tokenModifiers: ['declaration'],
      };
    },
    provideDocumentSemanticTokens: function (
      model: editor.ITextModel,
    ): languages.ProviderResult<languages.SemanticTokens> {
      const text = model.getValue();
      const parserResult = parse(text);
      const data: number[] = [];
      if (parserResult.error) {
        return {
          data: new Uint32Array(data),
          resultId: undefined,
        };
      }

      // Data format:
      // - Line number (0-indexed, and offset from the *previous line*)
      // - Column position (0-indexed)
      // - Token length
      // - Token type index
      // - Modifier index
      let prevLine = 0;
      let prevChar = 0;

      const appendData = (
        lineNumber: number,
        colPosition: number,
        length: number,
        tokenType: number,
        modifierIndex: number
      ) => {
        data.push(
          lineNumber - prevLine,
          prevLine === lineNumber ? colPosition - prevChar : colPosition,
          length,
          tokenType,
          modifierIndex
        );

        prevLine = lineNumber;
        prevChar = colPosition;
      };

      // Resolve all type references and relation/permission references in expressions and color based on their kind and resolution
      // status.
      const resolution = new Resolver(parserResult.schema!);
      resolution.resolvedReferences().forEach((resolved: ResolvedReference) => {
        const lineNumber = resolved.reference.range.startIndex.line - 1; // parser ranges are 1-indexed
        const colPosition = resolved.reference.range.startIndex.column - 1;

        switch (resolved.kind) {
          case 'type':
            if (resolved.referencedTypeAndRelation === undefined) {
              appendData(
                lineNumber,
                colPosition,
                resolved.reference.path.length,
                /* type.unknown */ 3,
                0
              );
              return;
            }

            appendData(
              lineNumber,
              colPosition,
              resolved.reference.path.length,
              /* type */ 0,
              0
            );

            if (resolved.reference.relationName) {
              if (resolved.referencedTypeAndRelation.relation !== undefined) {
                appendData(
                  lineNumber,
                  colPosition + 1 + resolved.reference.path.length,
                  resolved.reference.relationName.length,
                  /* member */ 2,
                  0
                );
              } else if (
                resolved.referencedTypeAndRelation.permission !== undefined
              ) {
                appendData(
                  lineNumber,
                  colPosition + 1 + resolved.reference.path.length,
                  resolved.reference.relationName.length,
                  /* property */ 1,
                  0
                );
              } else {
                appendData(
                  lineNumber,
                  colPosition + 1 + resolved.reference.path.length,
                  resolved.reference.relationName.length,
                  /* member.unknown */ 3,
                  0
                );
              }
            }
            break;

          case 'expression':
            if (resolved.resolvedRelationOrPermission === undefined) {
              appendData(
                lineNumber,
                colPosition,
                resolved.reference.relationName.length,
                /* property.unknown */ 4,
                0
              );
            } else {
              switch (resolved.resolvedRelationOrPermission.kind) {
                case 'permission':
                  appendData(
                    lineNumber,
                    colPosition,
                    resolved.reference.relationName.length,
                    /* property */ 1,
                    0
                  );
                  break;

                case 'relation':
                  appendData(
                    lineNumber,
                    colPosition,
                    resolved.reference.relationName.length,
                    /* member */ 2,
                    0
                  );
                  break;
              }
            }
            break;
        }
      });

      return {
        data: new Uint32Array(data),
        resultId: undefined,
      };
    },
    releaseDocumentSemanticTokens: function () {},
  });

  monaco.editor.defineTheme(DS_THEME_NAME, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '608b4e' },
      { token: 'comment.doc', foreground: '64bf3b' },
      { token: 'keyword', foreground: '8787ff' },

      { token: 'type', foreground: '4242ff' },
      { token: 'type.unknown', foreground: 'ff0000' },

      { token: 'type.relation', foreground: '883425' },
      { token: 'type.identifier', foreground: '4242ff' },
      { token: 'type.relsymbol', foreground: '000000' },

      { token: 'type.wildcard', foreground: '00cfba', fontStyle: 'bold' },
      { token: 'type.wildcardsymbol', foreground: '000000' },

      { token: 'member', foreground: '883425' },
      { token: 'member.unknown', foreground: 'ff0000' },

      { token: 'property', foreground: '158a64' },
      { token: 'property.unknown', foreground: 'ff0000' },

      { token: 'identifier.relorperm', foreground: '666666' },

      { token: 'keyword.permission', foreground: '158a64' },
      { token: 'keyword.relation', foreground: '883425' },
      { token: 'keyword.definition', foreground: '4242ff' },
      { token: 'keyword.caveat', foreground: 'ff4271' },
      { token: 'keyword.nil', foreground: '999999' },
      { token: 'keyword.any', foreground: '23974d' },
      { token: 'keyword.all', foreground: '972323' },
  
      { token: 'identifier.type-prefix', foreground: 'aaaaaa' },
      { token: 'identifier.definition-prefix', foreground: 'aaaaaa' },

      { token: 'identifier.caveat', foreground: '000000' },
      { token: 'identifier.caveat-param-name', foreground: '9eb4df' },
      { token: 'identifier.caveat-usage', foreground: '000000' },

      { token: 'identifier.definition', foreground: '000000' },
      { token: 'identifier.permission', foreground: '000000' },
      { token: 'identifier.relation', foreground: '000000' },
    ],
    colors: {},
  });

  const DARK_RULES = [
    { token: 'comment', foreground: '608b4e' },
    { token: 'comment.doc', foreground: '64bf3b' },
    { token: 'keyword', foreground: '8787ff' },

    { token: 'type', foreground: 'cec2f3' },
    { token: 'type.unknown', foreground: 'ff0000' },

    { token: 'type.relation', foreground: 'f9cdbd' },
    { token: 'type.identifier', foreground: 'cec2f3' },
    { token: 'type.relsymbol', foreground: 'ffffff' },

    { token: 'type.wildcard', foreground: '00ffe5', fontStyle: 'bold' },
    { token: 'type.wildcardsymbol', foreground: 'ffffff' },

    { token: 'member', foreground: 'f9cdbd' },
    { token: 'member.unknown', foreground: 'ff0000' },

    { token: 'property', foreground: '95ffce' },
    { token: 'property.unknown', foreground: 'ff0000' },

    { token: 'identifier.relorperm', foreground: 'cccccc' },

    { token: 'keyword.permission', foreground: '1acc92' },
    { token: 'keyword.relation', foreground: 'ffa887' },
    { token: 'keyword.definition', foreground: '8787ff' },
    { token: 'keyword.caveat', foreground: 'ff87a6' },
    { token: 'keyword.nil', foreground: 'cccccc' },
    { token: 'keyword.any', foreground: 'abe5ff' },
    { token: 'keyword.all', foreground: 'ffabab' },

    { token: 'identifier.type-prefix', foreground: 'aaaaaa' },
    { token: 'identifier.definition-prefix', foreground: 'aaaaaa' },

    { token: 'identifier.caveat-param-type-name', foreground: 'cec2f3' },

    { token: 'identifier.caveat', foreground: 'ffffff' },
    { token: 'identifier.caveat-param-name', foreground: '9eb4df' },
    { token: 'identifier.caveat-usage', foreground: 'ffffff' },

    { token: 'identifier.definition', foreground: 'ffffff' },
    { token: 'identifier.permission', foreground: 'ffffff' },
    { token: 'identifier.relation', foreground: 'ffffff' },
  ];

  monaco.editor.defineTheme(DS_DARK_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: DARK_RULES,
    colors: {
      'editor.background': '#0e0d11',
    },
  });
  monaco.editor.defineTheme(DS_EMBED_DARK_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: DARK_RULES,
    colors: {
      'editor.background': '#0e0d11',
    },
  });
}
