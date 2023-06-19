!{"type": "examples", "title": "Lezer Setup Example"}

# Setup Example

To create a parser using Lezer you will need to have
[Node](https://nodejs.org/) installed. You'll use
[npm](https://www.npmjs.com/) to install the Lezer packages.

Create a minimal `package.json` file like this in your project
directory.

```
{
  "name": "my-parser-name",
  "version": "0.1.0",
  "type": "module",
  "devDependencies": {
    "@lezer/generator": "^1.0.0"
  },
  "dependencies": {
    "@lezer/lr": "^1.0.0"
  },
  "scripts": {
    "prepare": "lezer-generator src/my.grammar -o src/parser.js"
  }
}
```

And run `npm install` to install the dependencies. @lezer/generator
provides the `lezer-generator` command-line tool that is used in the
`prepare` script to build the parser tables. @lezer/lr is the run-time
parser library that will be used by the generated script file.

We'll put a trivial grammar in `src/my.grammar`, which just accepts a
sequence of words, numbers, and quoted strings.

```lezer
@top File { (Identifier | Number | String)+ }

@skip { space }

@tokens {
  space { @whitespace+ }
  Identifier { $[A-Za-z_]+ }
  Number { $[0-9]+ }
  String { '"' !["]* '"' }
}

@external propSource highlighting from "./highlight.js"
```

Running `npm run prepare` will build the parser, leaving a file
`src/parser.js` that can be imported to use its `parser` export.

```javascript
import {parser} from "./src/parser.js"
console.log(parser.parse('one 2 "three"').toString())
```

## External Code and Bundling

Most parsers will use an external tokenizer or a set of highlighting
style tags defined in an external JavaScript file. The emitted parser
script will import from those (or, if you use the `--cjs` option to
`lezer-generator`, require them), and thus just work, but it is often
convenient for a module to provide a single, bundled script.

For our example, let's add a single line to the grammar that
referenced an external prop definition used for highlighting.

```lezer
@external propSource highlighting from "./highlight.js"
```

The `highlight.js` file exports [higlight tags](##highlight.styleTags)
for the grammar.

```javascript
import {styleTags, tags} from "@lezer/highlight"

export const highlighting = styleTags({
  Identifier: tags.name,
  Number: tags.number,
  String: tags.string
})
```

Tools like [Rollup](https://rollupjs.org/) can take a script and
inline (some of) its imports into it. @lezer/generator comes with a
Rollup plugin that allows you to perform your entire build, including
the parser generation, inside Rollup.

Let's add @lezer/highlight and rollup to our dependencies in
package.json, and change the build step to run Rollup.

```
{
  "name": "my-parser-name",
  "version": "0.2.0",
  "type": "module",
  "exports": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "devDependencies": {
    "@lezer/generator": "^1.0.0",
    "rollup": "^3.0.0"
  },
  "dependencies": {
    "@lezer/highlight": "^1.0.0",
    "@lezer/lr": "^1.0.0"
  },
  "scripts": {
    "prepare": "rollup -c"
  }
}
```

We've also added and `exports` field so that consumers of the package
get the correct script depending on whether they are loading it as a
CommonJS or an ES module—since we're using a bundler, it is trivial to
emit both types of modules.

The most convenient way to configure Rollup is through a
`rollup.config.js` file. Ours could look like this:

```javascript
import {lezer} from "@lezer/generator/rollup"

export default {
  input: "./src/my.grammar",
  output: [{
    format: "es",
    file: "./dist/index.js"
  }, {
    format: "cjs",
    file: "./dist/index.cjs"
  }],
  external: ["@lezer/lr", "@lezer/highlight"],
  plugins: [lezer()]
}
```

This instructs Rollup to bundle `my.grammar`, which is converted to a
script file by the @lezer/generator/rollup plugin, inlining everything
except the listed external packages, and putting both a regular ES
module and a CommonJS file into the `dist` directory.

If an external tokenizer would need to import node IDs from the
grammar, it could do something like this—the plugin will automatically
wire up imports from `.grammar.terms` files to the term file emitted
by Lezer that holds the node ID constants.

```
import {Number, String} from "./my.grammar.terms"`
```
