!{"type": "examples", "title": "Lezer Basic Example", "injectCode": "basic.grammar"}

# Basic Example

Lezer's grammar notation borrows from extended Backus-Naur notation
and regular expression syntax, using `|` to indicate a choice between
several forms, `*` and `+` for repetition, and `?` for optional
elements.

A grammar should be put in its own [file](./basic.grammar), typically
with a `.grammar` extension, and ran through
[lezer-generator](https://lezer.codemirror.net/docs/guide/#building-a-grammar)
to create a JavaScript file.

Each regular (non-token) rule expresses the structure of a given
construct (say, an expression or a statement, or a smaller part of
those). For example, this rule indicates that an expression can be
either an identifier, a string, a number, or a sequence of expressions
between parentheses.

!expression

The separate things that count as an expression are separated by `|`
characters. Things that should come after each other are simply
written next to each other.

This tells the parser generated from the grammar that, if it is in a
position where an expression would be allowed and the next token is
the starting token for one of these options, it should start parsing
an expression. And when it reaches the end of either of these options,
it should count that has having parsed an expression.

The parse position at the start of the parse is determined by the rule
marked with `@top`.

!top

This expresses that a document should be parsed as any number of
`expression`s, and the top node of the syntax tree should be called
`Program`.

Rule names that start with a capital letter will end up in the syntax
tree produced by the parser. Other rules, such as `expression`, which
are only there to structure the grammar, will be left out (to keep the
tree small and clean).

Simple tokens that just match a string can be included directly in
rules as quoted strings (for example `"("` and `")"` in `Application`.
More involved tokens have to be defined in a `@tokens` block:

!tokens

These use a syntax similar to the rule definitions, but can only
express a _regular_ language, which roughly mean they can't be
recursive. Quoted literals match exactly the text in the quotes, sets
of characters can be specified with `$[]` syntax, and `![]` is used to
match all characters _except_ the ones between the brackets.

By default, tokens implicitly created by using literal strings in the
(non-token) grammar won't be part of the syntax tree. By mentioning
such tokens (like `"("` and `")"`) explicitly in the `@tokens` block,
we indicate that they should be included.

The `LineComment` and `space` tokens haven't been used anywhere yet.
That's because they aren't normal parts of the grammar, but are
“skipped” elements, that may appear anywhere between other tokens, and
don't affect the structure of the program. This is declared with a
`@skip` rule.

!skip

And finally, the parser generator can be asked to automatically infer
matching delimiters with a `@detectDelim` directive. This will cause
it to add
[metadata](https://lezer.codemirror.net/docs/ref/#tree.NodeProp^closedBy)
to those node types, which the editor can use for things like bracket
matching and automatic indentation.

!delim

If this grammar lives in `example.grammar`, you can run
`lezer-generator example.grammar` to create a JavaScript module
holding the parse tables.

```
lezer-generator example.grammar > example.mjs
```

Or see the [setup example](../setup/) for a more general description
of how to set up a parser project.