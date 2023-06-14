!{"type": "examples", "title": "Lezer Indentation Example", "injectCode": ["indent.grammar", "tokens.js"]}

# Indentation Example

In this example, we build a parser for a small indentation-sensitive
language. Note that the approach shown here is no one-size-fits-all
technique—the details of how indentation-based languages handle things
like commend and empty lines differ, and you'll have to adjust your
parsing approach solution to fit the language.

The language we implement here looks somewhat like
[Sass](https://sass-lang.com)'s indented syntax. It just supports
words that can be nested with indentation, and line comments.

```
Word

Section
  Subsection
    # Comment
    Content
    More # Comment 2

  Etc
```

When a line is indented more than the current block, it starts a new
block. When indentation becomes smaller again, the current block is
ended. Commented or blank lines do not influence block structure.

The general approach to this kind of syntax in Lezer is to define a
[context](../../docs/guide/#context) that tracks the current
indentation, and have an external tokenizer emit tokens at the points
where indentation is added or removed. These tokens can then be used
as the start and end of blocks.

Such languages tend to treat newlines as significant tokens as well,
following a less free-form line structure than languages that just
ignore all whitespace between tokens.

The grammar itself is really simple.

!element

A document is a sequence of elements, and an element can either be an
atom (an identifier without an indented block after it) or a section.

Newlines are explicitly mentioned, and not skipped.

!lineEnd

This rule matches either a line break or the end of the file, so that
input that doesn't end in a blank line also parses properly.

!block

Blocks start with an increase in indentation, and end when a line that
is dedented beyond their indentation level is found, or at the end of
the document.

!skip

Beyond spaces and comments, the `@skip` declaration also includes
empty lines. We'll use an external tokenizer to detect, at the start
of a line, whether the line is empty, so that we can emit the special
`blankLineStart` token.

As mentioned, we need a context to track indentation levels.

!context

The context value is an object that forms a linked list of indentation
levels. It does some bit mixing to create a hash from its indentation
level and the hash of the parent level.

!trackIndent

The context tracking relies on the external tokenizer to notice
indentation and dedentation and emit the proper tokens. `indent`
tokens cover the indentation text (so that the context tracker can
easily derive the depth from the token size). `dedent` tokens are
zero-length.

!externalTokens

Since both the indentation tokens and the `blankLineStart` token need
to act at the start of lines and need to scan through indentation,
they are put in the same external tokenizer function.

!indentation

If the character after the indentation is a hash (comment) or a line
break, the line is empty. `blankLineStart` is again a zero-length
token. Such tokens must be used with care—it is easy to get into an
infinite loop if your grammar continues to consume them and your
tokenizer continues to generate them.

In this case, we make sure to only emit `blankLineStart` if the stack
can currently shift it. That means that it has not already entered the
`@skip` expression for blank lines. That skip expression always
matches something (a line end), so it can't land us in an infinite
loop.

Similarly, `dedent` tokens are only emitted as long as the indent
context indicates there is still indentation, which provides a limit
on how many of those can be emitted (since each one will remove an
indentation level).

Finally, these are the non-external tokens in the grammar.

!tokens

These are the full files for the code in this example:

 - [indent.grammar](./indent.grammar)
 - [tokens.js](./tokens.js)

Again, you can build them into a script that exports the parser with
Rollup:

    rollup -p @lezer/generator/rollup -e @lezer/lr indent.grammar
