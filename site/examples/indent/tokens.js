//!trackIndent

import {ContextTracker} from "@lezer/lr"
import {indent, dedent} from "./indent.grammar.terms"

class IndentLevel {
  constructor(parent, depth) {
    this.parent = parent
    this.depth = depth
    this.hash = (parent ? parent.hash + parent.hash << 8 : 0) + depth + (depth << 4)
  }
}

export const trackIndent = new ContextTracker({
  start: new IndentLevel(null, 0),
  shift(context, term, stack, input) {
    if (term == indent) return new IndentLevel(context, stack.pos - input.pos)
    if (term == dedent) return context.parent
    return context
  },
  hash: context => context.hash
})

//!indentation

import {ExternalTokenizer} from "@lezer/lr"
import {blankLineStart} from "./indent.grammar.terms"

const newline = 10, space = 32, tab = 9, hash = 35

export const indentation = new ExternalTokenizer((input, stack) => {
  let prev = input.peek(-1)
  if (prev != -1 && prev != newline) return
  let spaces = 0
  while (input.next == space || input.next == tab) { input.advance(); spaces++ }
  if ((input.next == newline || input.next == hash) && stack.canShift(blankLineStart)) {
    input.acceptToken(blankLineStart, -spaces)
  } else if (spaces > stack.context.depth) {
    input.acceptToken(indent)
  } else if (spaces < stack.context.depth) {
    input.acceptToken(dedent, -spaces)
  }
})
