import { CancellationToken, editor, Position } from 'monaco-editor-core';
import { LocalParseState } from '../services/localparse';
import {
  getCaveatDefinitions,
  getRelatableDefinitions,
  getStorableRelations,
  getSubjectDefinitions,
  StorableRelation,
  SubjectDefinition,
} from '../services/semantics';

export const TUPLE_LANGUAGE_NAME = 'tuple';
export const TUPLE_THEME_NAME = 'tuple-theme';
export const TUPLE_DARK_THEME_NAME = 'tuple-theme-dark';

export default function registerTupleLanguage(
  monaco: any,
  localParseState: () => LocalParseState
) {
  // Based on: https://raw.githubusercontent.com/Aedron/monaco-protobuf/master/index.js
  monaco.languages.register({ id: TUPLE_LANGUAGE_NAME });
  monaco.languages.setMonarchTokensProvider(TUPLE_LANGUAGE_NAME, {
    keywords: ['...'],
    tokenizer: {
      root: [
        [/([a-z0-9_]+\/)*[a-z0-9_]+/, 'namespace'],
        [/:/, { token: 'object.start', bracket: '@open', next: '@object' }],
        [/@/, { token: 'userset.start', bracket: '@open', next: '@userset' }],
        [/#/, { token: 'relation.start', bracket: '@open', next: '@relation' }],
        [
          /\[([^\]]+)\]/,
          { token: 'userset-caveat', bracket: '@close', next: '@popall' },
        ],
        [/[A-Za-z0-9]+/, 'invalid'],

        { include: '@whitespace' },
      ],
      object: [
        [
          /[a-zA-Z0-9/_|\-=+]+/,
          { token: 'object', bracket: '@close', next: '@popall' },
        ],
      ],
      relation: [
        [
          /[a-z0-9_]+/,
          { token: 'relation', bracket: '@close', next: '@popall' },
        ],
        [
          /\.\.\./,
          { token: 'dotdotdotrel', bracket: '@close', next: '@popall' },
        ],
      ],
      whitespace: [
        [/\s+/, 'white'],
        [/\/\/.*$/, 'comment'],
      ],
      caveatorend: [
        [/$/, { token: 'userset.end', bracket: '@close', next: '@popall' }],
        [
          /\[([^\]]+)\]$/,
          { token: 'userset-caveat', bracket: '@close', next: '@popall' },
        ],
      ],
      relationorcaveatorend: [
        [/$/, { token: 'userset.end', bracket: '@close', next: '@popall' }],
        [
          /#[a-z0-9_]+$/,
          {
            token: 'userset-relation',
            bracket: '@close',
            next: '@popall',
          },
        ],
        [
          /#[a-z0-9_]+/,
          {
            token: 'userset-relation',
            bracket: '@close',
            next: '@caveatorend',
          },
        ],
        [
          /\[([^\]]+)\]$/,
          { token: 'userset-caveat', bracket: '@close', next: '@popall' },
        ],
      ],
      userset: [
        [/$/, { token: 'userset.end', bracket: '@close', next: '@popall' }],
        [/([a-z0-9_]+\/)?[a-z0-9_]+/, 'userset-namespace'],
        [
          /#[a-z0-9_]+/,
          {
            token: 'userset-relation',
            bracket: '@close',
            next: '@caveatorend',
          },
        ],
        [
          /#\.\.\./,
          {
            token: 'userset-dotdotdotrel',
            next: '@caveatorend',
          },
        ],
        [
          /:[a-zA-Z0-9/_|\-=+]+$/,
          { token: 'userset-object', bracket: '@close', next: '@popall' },
        ],
        [
          /:\*$/,
          {
            token: 'userset-wildcard-object',
            next: '@popall',
          },
        ],
        [
          /:\*/,
          {
            token: 'userset-wildcard-object',
            next: '@caveatorend',
          },
        ],
        [
          /:[a-zA-Z0-9/_|\-=+]+/,
          {
            token: 'userset-object',
            next: '@relationorcaveatorend',
          },
        ],
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider(TUPLE_LANGUAGE_NAME, {
    triggerCharacters: ['/', '#', '@', '['],

    // Function to generate autocompletion results
    provideCompletionItems: function (
      model: editor.ITextModel,
      position: Position,
      token: CancellationToken
    ) {
      // Based on: https://gist.github.com/mwrouse/05d8c11cd3872c19c684bd1904a2202e
      // Split everything the user has typed on the current line up at each space, and only look at the last word
      var lastChars = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 0,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      var words = lastChars.replace('\t', '').split(' ');
      var activeTyping = words[words.length - 1]; // What the user is currently typing (everything after the last space)

      switch (activeTyping[activeTyping.length - 1]) {
        case '/':
          return {
            suggestions: getRelatableDefinitions(localParseState()).map(
              (namespaceName: string) => {
                const hasPrefix = namespaceName.indexOf('/') > -1;
                return {
                  label: namespaceName,
                  kind: monaco.languages.CompletionItemKind.Module,
                  detail: '',
                  insertText: hasPrefix
                    ? namespaceName.split('/')[1]
                    : namespaceName,
                };
              }
            ),
          };

        case '#':
          return {
            suggestions: getStorableRelations(
              words[words.length - 1],
              localParseState()
            ).map((found: StorableRelation) => {
              return {
                label: found.name,
                kind: found.isPermission
                  ? monaco.languages.CompletionItemKind.Property
                  : monaco.languages.CompletionItemKind.Field,
                detail: '',
                insertText: found.name,
              };
            }),
          };

        case '@':
          return {
            suggestions: getSubjectDefinitions(
              words[words.length - 1],
              localParseState()
            ).map((sd: SubjectDefinition) => {
              return {
                label: sd.name,
                kind: sd.isUserDefinition
                  ? monaco.languages.CompletionItemKind.User
                  : monaco.languages.CompletionItemKind.Class,
                detail: '',
                insertText: sd.name,
              };
            }),
          };

        case '[':
          return {
            suggestions: getCaveatDefinitions(localParseState()).map(
              (caveatName: string) => {
                return {
                  label: caveatName,
                  kind: monaco.languages.CompletionItemKind.Function,
                  detail: '',
                  insertText: caveatName,
                };
              }
            ),
          };
      }

      return {
        suggestions: [],
      };
    },
  });

  monaco.editor.defineTheme(TUPLE_THEME_NAME, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'namespace', foreground: '4242ff' },
      { token: 'relation', foreground: '883425' },
      { token: 'dotdotdotrel', foreground: '0a5ed7' },
      { token: 'object', foreground: '000000' },

      { token: 'relation.start', foreground: 'aaaaaa' },
      { token: 'object.start', foreground: 'aaaaaa' },

      { token: 'userset-namespace', foreground: '4242ff', fontStyle: 'italic' },
      { token: 'userset-relation', foreground: '44778a', fontStyle: 'italic' },
      {
        token: 'userset-dotdotdotrel',
        foreground: 'aaaaaa',
        fontStyle: 'italic',
      },
      { token: 'userset-object', foreground: '000000', fontStyle: 'italic' },
      { token: 'userset-caveat', foreground: 'ff87a6', fontStyle: 'italic' },
      {
        token: 'userset-wildcard-object',
        foreground: '00ffe5',
        fontStyle: 'italic',
      },

      { token: 'userset.start', foreground: '000000', fontStyle: 'bold' },
    ],
  });

  monaco.editor.defineTheme(TUPLE_DARK_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'namespace', foreground: '8787ff' },
      { token: 'relation', foreground: 'ff8887' },
      { token: 'dotdotdotrel', foreground: '0a5ed7' },
      { token: 'object', foreground: 'ffffff' },

      { token: 'relation.start', foreground: 'cccccc' },
      { token: 'object.start', foreground: 'cccccc' },

      { token: 'userset-namespace', foreground: '8787ff', fontStyle: 'italic' },
      { token: 'userset-relation', foreground: '87deff', fontStyle: 'italic' },
      {
        token: 'userset-dotdotdotrel',
        foreground: 'cccccc',
        fontStyle: 'italic',
      },
      { token: 'userset-object', foreground: 'ffffff', fontStyle: 'italic' },
      { token: 'userset-caveat', foreground: 'ff87a6', fontStyle: 'italic' },
      {
        token: 'userset-wildcard-object',
        foreground: '00ffe5',
        fontStyle: 'italic',
      },

      { token: 'userset.start', foreground: 'ffffff', fontStyle: 'bold' },
    ],
  });
}
