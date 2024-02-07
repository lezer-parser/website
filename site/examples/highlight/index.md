!{"type": "examples", "title": "Lezer Highlighting Example"}

# Highlighting Example

Lezer's syntax highlighting system works in two levels. On the parser
side, [highlighting information](##highlight.styleTags) is attached
some types of nodes, usually tokens but sometimes larger constructs,
that can be used as a basis for syntax highlighting. This information
takes the form of [tags](##highlight.Tag) that assign some semantic
role to a given node.

This actual syntax highlighting is done by a
[highlighter](##highlight.Highlighter) which, given a set of tags,
produces a set of CSS class names. There is a [basic
highlighter](##highlight.classHighlighter) available that assigns
predictable classes to a number of common tags, but it is also
possible to [define](##highlight.tagHighlighter) custom highlighters
for more specific behavior.

Most grammars will use an external node prop source to include their
highlighting information.

```lezer
@external propSource highlight from "./highlight"
```

And define the tag assignments an external file using the
[`styleTags`](##highlight.styleTags) vocabulary.

```javascript
import {styleTags, tags} from "@lezer/highlight"

export const jsHighlight = styleTags({
  // The 'new' node type is a keyword
  new: tags.keyword,
  // These three tokens are control keyword
  "for if else": tags.controlKeyword,
  Boolean: tags.bool,
  Number: tags.number,
  String: tags.string,
  VariableName: tags.variableName,
  VariableDefinition: tags.definition(tags.variableName),
  LineComment: tags.lineComment,
  ArithOp: tags.arithmeticOperator,
  "( )": tags.paren,
  // A variable name whose parent is a call is a function name
  "CallExpression/VariableName": tags.function(tags.variableName),
  // Ignore any child nodes of TemplateString, style them as
  // special string
  "TemplateString!": tags.special(tags.string),
  // All content within a doc comment should have the doc comment
  // tag added, in addition to whatever tags inner nodes have
  "DocComment/...": tags.docComment,  
})
```

There is a large amount of predefined [tags](##highlight.tags) to use.
It is also possible to define your own tags, but of course, those will
only be used by highlighters that you yourself define.

## Running a Highlighter

To emit highlighted code, you can use the
[`highlightTree`](#highlight.highlightTree) function. It calls a
callback function for every piece of text that you use to emit the
actual code.

Here is how you'd build up browser DOM nodes for a piece of Rust code,
collecting it in the `result` node.

```javascript
import {parser} from "@lezer/rust"
import {highlightCode, classHighlighter} from "@lezer/highlight"

let code = `fn main() {
    println!("Hello, world!");
}`

let result = document.createElement("pre")

function emit(text, classes) {
  let node = document.createTextNode(text)
  if (classes) {
    let span = document.createElement("span")
    span.appendChild(node)
    span.className = classes
    node = span
  }
  result.appendChild(node)
}
function emitBreak() {
  result.appendChild(document.createTextNode("\n"))
}

highlightCode(code, parser.parse(code), classHighlighter,
              emit, emitBreak)
```

The output will hold a mess of spans for styled content, tagged with
classes like `tok-keyword` that `classHighlighter` produces. If you
want to emit raw HTML text, you'd do something similar, accumulating a
string with `<span>` tags and (**HTML escaped**) code text.
