!{"type": "examples", "title": "Lezer JavaScript Example", "injectCode": ["javascript.grammar", "tokens.js"]}

# JavaScript Example

To show how a medium-sized grammar holds together, this example walks
through the definition of a grammar for a sizable subset of
JavaScript, including some of the more awkward features, such as
automatic semicolon insertion.

For this grammar, we define _two_ `@top` rules.

!top

The one that occurs first will be the default one, but code using the
parser can use the [`top` option](##lr.ParserConfig.top) to select
another one, allowing it to parse only a single expression if it needs
to.

The grammar needs a bunch of precedences to define which rules take
precedence in some cases. We'll discuss their roles when we get to the
rules that use them. Note that our dialect already drops a bunch of
operators in order to not get too repetitive—the
[real](https://github.com/lezer-parser/javascript) JavaScript grammar
has 33 named precedences.

!precedence

These are the types of statements that we recognize. The simpler ones
are defined using inline rules, where the braces that define the
rule's content follow directly after the rule's name.

!statement

The rule itself (`statement`) isn't capitalized. When statements
appear in the tree, we want a node for a specific statement type (say,
`ExpressionStatement`), without wrapping each of those in a generic
statement node. Lower-case rule names don't appear in the tree output.

But it can be useful to have some way to identify whether a node is a
statement. The `[@isGroup=Statement]` pseudo-prop declares that every
rule that is referenced as one of the choices of this rule should be
tagged with a [group](##common.NodeProp^group) prop that marks it as a
statement. We could also have added those to the individual rules,
this `@isGroup` tends to be more succinct.

Note that `ExpressionStatement` uses `semi` rather than `";"`. We'll
define that to accept either an actual semicolon, or an automatically
inserted one. Since automatically inserted semicolons are not regular
textual tokens, we will define that through an external tokenizer
later on.

!semi

Let's fill out some of the statement rules, starting with `IfStatement`.

!ifstatement

The must use the `!else` precedence to specify that an `else` should
always be attached to the `if` directly in front of it. Without it,
code like this would allow two parses, one attaching the `else` to `if
(b)` (the correct one), and one attaching it to `if (a)` (wrong).

```javascript
if (a) {}
if (b) {}
else {}
```

Lezer complains about such ambiguity and requires you to add
precedence markers to resolve it.

The `kw` rule is what we'll use for keywords. It takes a string and
specializes the `Identifier` token for that string so that it acts
like a separate token.

!kw

The `@name` prop after `@specialize` gives the newly defined token a
name that matches the keyword content, so that for example `kw<"if">`
shows up as a node called `if` in the output tree.

!returnstatement

The JavaScript standard defines `return` syntax so that the optional
expression after `return` only belongs to the return statement if an
automatic semicolon *cannot* be inserted between them. We will use
another external token to encode this constraint in the
grammar.

!noSemi

`noSemi` matches nothing, but is only generated when the token stream
is in a position where no semicolon can be inserted and a `noSemi`
token can be shifted.

!for

`for` statement are mostly straightforward. The official JavaScript
grammar parameterizes most expression-related rules with a flag that
indicates whether they are allowed to match the `in` operator, in
order to make the `for`/`in` syntax work in such a way that the `in`
is interpreted as part of the `for` spec in this case, and as a binary
operator otherwise. Here, we can just use an explicit precedence
(`!forIn`) to get that same effect.

Next come the definitions for declarations.

!functiondeclaration

The `!statement` precedence has a `@cut` annotation, which means that
when a parse moves past that marker, only the rule with the marker,
and not other rules that may match the current input, is kept in the
parse state. This is used here to implement the way JavaScript's
`function` keyword always starts a function definition when at the
start of a statement, despite function expressions using the same
keyword, and expressions being allowed in statement positions (via
`ExpressionStatement`).

The parameter list uses the `commaSep` rule template, which matches a
comma-separated list of its argument expression, and is defined like
this.

!commaSep

`commaSep1` is useful for situations where the comma-separated
expression must occur at least once, such as variable declaration
lists.

!variabledeclaration

Patterns are things that can be assigned to—variable names,
destructured arrays, and destructured objects.

The rule for `Block` (a block of statements wrapped in braces) again
uses the `!statement` marker to make it override the object expression
interpretation of the opening brace when the block interpretation is
valid.

!block

Expressions, like statements, are defined with a generic expression
rule that contains a big choice of the various kinds of expressions
that may occur. It uses `@isGroup` to tag all of these choices with a
group prop.

!expression

There are various ambiguity markers (`~arrow` and `~destructure`) in
these rules. Some of the JavaScript syntax introduced in ES2015 cannot
be disambiguated from other syntax by a plain LR parser. For example,
when seeing a parenthesized identifier, that might be just a variable,
or it might be the argument list for an arrow function. When seeing an
array of identifiers, that might be just an array, or the start of a
destructuring assignment.

```javascript
(x) + 1
(x) => x - 1
[a, b, c].join()
[a, b, c] = something()
```

Our parser uses Lezer's support for GLR parsing, where it runs
multiple different parses alongside each other until the ambiguity
goes away, to handle these cases. The ambiguity markers indicate the
places where this kind of splitting is allowed. `~destructure` will
also occur in the rules for patterns later on.

The regular precedence markers `!call` and `!newArgs` are used to give
these expression types a well-defined precedence compared to other
expression types. I.e. `!a()` should be defined as a call to `a` which
is then negated, not a call to `!a`, and arguments to `new` should be
parsed with higher precedence than regular calls.

The anonymous rule `ParamList { Identifier ~arrow }` simply wraps an
identifier that is used as a parameter to an arrow function in a
`ParamList` node. Note that anonymous nodes may share their name with
other nodes, since they cannot be referred to by name anyway.

!expression_misc

This grammar uses two different tokens, defined in exactly the same
way, for identifiers and property names. Because these do not occur in
the same places in the grammar, Lezer's contextual tokenization will
make sure that the appropriate one gets picked.

The reason for this is that when you specialize a token (as the `kw`
rule does), that specialization will take effect everywhere (the token
is simply replaced when it matches the specializer string). But
JavaScript property names may be keyword names, so we do not want that
specialization for the property name tokens.

!property

The `propKw` rule is like `kw` in that it defines keywords, but `get`
and `set` in JavaScript are _contextual_ keywords—they can also be
regular property names, but define getters and setters if they are
followed by some kind of property name.

!propKw

Thus, we use GLR parsing again, this time through the `@extend`
feature, which is similar to `@specialize`, except that it allows both
the plain token and the specialized token to be used, splitting the
parse into two possibilities when both can be parsed at that point,
somewhat like `~` markers do.

!operators

Operator parsing uses precedence markers again to set the precedence
of the precedence of the various binary operators.

The `LogicOp` and `ArithOp` tokens just wrap the token expression they
are given as an argument in a named token, which makes it easier to
assign a highlighting style to the various different operator tokens.

Assignment operators work similarly, but put some restrictions on the
kind of thing that can appear to the left of them. The first choice
parses update operators like `+=`, the second handles regular
assignment with `=`.

!assign

Patterns can be identifiers, destructured arrays, or destructured
objects. The `~destructure` markers are there to allow the ambiguity
between expressions and patterns.

!pattern

This `@skip` declaration indicates that whitespace and comments may be
skipped in any of these rules. Newlines are their own token, so that
we can track them for the purpose of automatic semicolon insertion.

!skip

That tracking is done with a context, which is a value that's kept
alongside the parse, and updated whenever a token is shifted. Contexts
can be used to do not-quite-context-free things like tracking
indentation or the set of open tags in an HTML document. In this case,
it just tracks a single boolean that indicates whether we saw a
newline since the last non-skipped token.

!context

This tracker is implemented in JavaScript like this. Note that the
export name matches the name given in the `@context` declaration.

!trackNewline

When you run `lezer-generator` on a grammar file, it generates both a
file with the parse tables, and a file with constants for the IDs of
the tokens defined in the grammar. Because this context tracker needs
to know the IDs of some tokens, it imports them from the terms file.

Template strings allow interpolations inside of them, so they must be
parsed piece-by-piece rather than as a single token. But inside of
them, comments and whitespace must not be treated specially. So we
define them in a `@skip {}` block that indicates that the global skip
rules are turned off for this rule.

!templateStrings

Defining the kind of token structure where a few specific things are
handled specially and everything else is lumped into a generic 'other'
token is best done with a `@local tokens` definition. In this case, we
are interested backslash escapes, interpolation starts (`${`), and the
end of the string. The `@else` token, `interpolationContent`, will
generated for all stretches of input that don't match the other tokens
in the block.

Block comments _can_ be matched as a single token, but since they can
be gigantic, and incremental parsing doesn't work on a single huge
token, it is a good idea to define them like this, where each line of
the comment becomes its own token.

!blockComment

That brings us to the `@tokens` block.

!tokens

Whitespace and line comments are straightforward.

!skippedTokens

We have to explicitly say that it is okay for comment, regexp, and
division tokens to all start with a slash, and that comment tokens
should take precedence.

!identifierTokens

As mentioned earlier, we define `Identifier` and `PropName` as
separate tokens, so that they can be specialized differently.

The number token definition is somewhat messy, due to the various
formats that numbers can have.

!numberTokens

If you think it is relevant to users of your syntax tree, you can of
course also define different token types for the various number
notations.

Plain strings in JavaScript are not too hard to parse, if you just
assume every character after a backslash cannot end the string.

!stringTokens

Note that this rule makes the closing quote optional. This isn't how
that actual language works, but it can be helpful to have the parser
tokenize unfinished strings (since JavaScript strings cannot continue
across lines anyway).

Next come tokens for the operators, some parameterized, some
hard-coded.

!operatorTokens

Regular expressions are a bit involved to tokenize, due to the fact that
unescaped slashes may occur inside them if they are wrapped in
brackets.

!regexpTokens

But note how, despite the token-level ambiguity between division
operators and regular expressions in JavaScript, we had to do nothing
about that here. Since there are no parse positions where a regexp and
a division operator are both valid, Lezer automatically made the
tokens contextual and reads the appropriate one depending on the parse
position.

These tokens are mentioned simply as quoted strings in the grammar,
but should appear in the output tree anyway.

!literalTokens

Because other tokens should take precedence over inserted semicolons
(JavaScript only inserts semicolons when it can't otherwise proceed
its parse), the declaration for this external tokenizer has to appear
_after_ the other tokenizers.

!insertSemicolon

Our external tokenizers are defined like this:

!externalTokenizers

The language rules are that a semicolon can only be inserted before a
`}` character, at the end of the file (`next == -1`), or if there was
a newline before the current token. Since we are using a context to
track whether a newline was seen after the last token, `stack.context`
holds the (boolean) value produced by that context.

The tokenizer for `noSemi` needs to verify that there is no whitespace
or comment ahead of the current position, since it can only determine
whether there is no newline _after_ such skipped tokens have been
seen.

That concludes our exercise of parsing half of JavaScript in Lezer.
These are the files with the full code:

 - [javascript.grammar](./javascript.grammar)
 - [tokens.js](./tokens.js)

You can use `lezer-generator` (from the @lezer/generator package) to
compile the grammar. Or use Rollup with the Lezer plugin to build a
self-contained script file (that exports the parser as `parser`) like
this:

    rollup -p @lezer/generator/rollup -e @lezer/lr javascript.grammar

Or see the [setup example](../setup/) for a more general description
of how to set up a parser project.

The full JavaScript (+ TypeScript and JSX) grammar can be found [on
GitHub](https://github.com/lezer-parser/javascript).
