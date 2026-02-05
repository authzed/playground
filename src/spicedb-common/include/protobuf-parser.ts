/* eslint-disable */

/*
   Based on https://github.com/brotchie/protobuf-textformat/blob/master/src/parser.js
   By James Brotchie

   Original License reproduced:

   The MIT License (MIT)

   Copyright (c) 2014 James Brotchie <brotchie@gmail.com>

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
*/

import Parsimmon from "parsimmon";

export interface Pair {
  type: "pair";
  name: string;
  value: string;
}

export interface Index {
  offset: number;
  line: number;
  column: number;
}

export interface TextRange {
  startIndex: Index;
  endIndex: Index;
}

export interface Message {
  type: "message";
  name: string;
  values: MessageOrPair[];
  range: TextRange;
}

export type MessageOrPair = Pair | Message;

var regex = Parsimmon.regex,
  string = Parsimmon.string,
  optWhitespace = Parsimmon.optWhitespace,
  lazy = Parsimmon.lazy,
  alt = Parsimmon.alt,
  seq = Parsimmon.seq;

var comment = regex(/#.*/).then(optWhitespace.atMost(1));
var whitespace = optWhitespace.then(comment.atLeast(0));

var lexeme = function (p: any) {
  return p.skip(whitespace);
};

var colon = lexeme(string(":"));

var lbrace = lexeme(string("{")),
  rbrace = lexeme(string("}"));

var stripFirstLast = function (x: string) {
  return x.substr(1, x.length - 2);
};

var identifier = lexeme(regex(/[a-zA-Z_][0-9a-zA-Z_+-]*/));
var doubleString = lexeme(regex(/\"([^\"\n\\\\]|\\\\.)*(\"|\\\\?$)/).map(stripFirstLast));
var singleString = lexeme(regex(/\'([^\'\n\\\\]|\\\\.)*(\'|\\\\?$)/).map(stripFirstLast));

var number = lexeme(regex(/[.]?[0-9+-][0-9a-zA-Z_.+-]*/)).map(Number);
var trueLiteral = lexeme(string("true")).result(true);
var falseLiteral = lexeme(string("false")).result(false);

var expr: any = lazy("an expression", function () {
  return alt(pair, message).many();
});

var message: any = Parsimmon.seqMap(
  Parsimmon.index,
  seq(identifier, colon.times(0, 1).then(lbrace).then(expr).skip(rbrace)),
  Parsimmon.index,
  function (startIndex, message, endIndex) {
    return { message: message, startIndex: startIndex, endIndex: endIndex };
  },
).map(function (data) {
  const message = data.message;
  return {
    type: "message",
    name: message[0],
    values: message[1],
    range: { startIndex: data.startIndex, endIndex: data.endIndex },
  };
});

var value = alt(trueLiteral, falseLiteral, number, doubleString, singleString, identifier);

var pair = seq(identifier.skip(colon), value).map(function (pair) {
  return { type: "pair", name: pair[0], value: pair[1] };
});

export interface ParseResult {
  status: boolean;
  error: string | undefined;
  parserResult: Parsimmon.Result<MessageOrPair>;
  value: any | undefined;
}

export default function parse(input: string): ParseResult {
  const result = whitespace.then(expr).parse(input);
  return {
    status: result.status,
    error: !result.status ? Parsimmon.formatError(input, result) : undefined,
    parserResult: result as Parsimmon.Result<MessageOrPair>,
    value: result.status ? (result as Parsimmon.Success<MessageOrPair>).value : undefined,
  };
}
