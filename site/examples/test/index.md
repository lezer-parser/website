!{"type": "examples", "title": "Lezer Test Example"}

# Testing Example

When working on a grammar it can be useful to have a set of tests that
verify that it parses various input in the intended way.

The way the parser maintained alongside Lezer do this is through a
module exported by @lezer/generator, which can compare a parse tree to
a string describing a tree, and tell you when they differ.

Let's use this to test the mini-JavaScript parser from [the other
example](../javascript/).

```javascript
import {parser} from "./javascript-parser.js"
import {testTree} from "@lezer/generator/test"

let tree = parser.parse("function plus1(a) { return a + 1 }")
let spec = `Script(FunctionDeclaration(
  function,
  Identifier,
  ParamList(Identifier),
  Block(
    ReturnStatement(
      return,
      BinaryExpression(Identifier, ArithOp, Number)))))`
testTree(tree, spec)
```

If the tree matches the spec, the function will return normally. If
not, it raises an error describing the mismatch.

By default, you can leave tokens whose names are not words (like `"("`
and `"{"`) out of the spec string, though you can also include them if
you want to ensure they are present. Error nodes can be included as a
`⚠` character. When a node's child list is specified a `(...)`, its
children will not be looked at, which can be useful for abbreviating
uninteresting parts of the tree.

To help with setting up a collection of tests, the
@lezer/generator/test module also exports a `fileTests` function that,
given a file in a format like below, returns an array of tests.

```
# Block comments

/* A */
let x /* B
 C */ = 1

==>

Script(
  BlockComment,
  VariableDeclaration(let, Identifier, BlockComment, "=", Number))

# Semicolon insertion

let x
x()

==>

Script(
  VariableDeclaration(let, Identifier),
  ExpressionStatement(CallExpression(Identifier, ArgList)))
```

Each test has a `name` property holding the name written after the `#`
sign, and a `run` property holding a function that, given a parser,
parses the test's text (before the `==>` marker) and checks whether
the tree matches the spec after the marker.

If a test requires additional parser configuration (as in
[`LRParser.configure`](##lr.LRParser.configure)), you can put a
JSON object with configuration options after the test title.

```
# A test {"dialect": "somedialect"}
```

To load such a test suite and wire it up to a test runner like Mocha,
you do something like this in Node.

```javascript
import {parser} from "./parser.js"
import {fileTests} from "@lezer/generator/test"
import {readdirSync, readFileSync} from "fs"
import {join} from "path"

export function parseTests(dir) {
  for (let file of readdirSync(dir)) {
    let tests = fileTests(readFileSync(join(dir, file), "utf8"), file)
    describe(file, () => {
      for (let {name, run} of tests) it(name, () => run(parser))
    })
  }
}
```
