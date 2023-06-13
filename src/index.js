const Mold = require("mold-template")
const markdownIt = require("markdown-it")
const {join, dirname} = require("path")
const {readFileSync, readdirSync} = require("fs")
const {mapDir} = require("./mapdir")
const {buildRef} = require("./buildref")
const {buildChangelog} = require("./changelog")
const {highlightTree, classHighlighter} = require("@lezer/highlight")

let base = join(__dirname, "..")

let currentRoot = ""

function linkRef(markdown, root) {
  return markdown.replace(/\]\(#(#.*?)\)/g, `](${root}docs/ref/$1)`)
}

function loadTemplates(dir, env) {
  let mold = new Mold(env)
  for (let filename of readdirSync(dir)) {
    let match = /^(.*?)\.html$/.exec(filename)
    if (match) mold.bake(match[1], readFileSync(join(dir, filename), "utf8").trim())
  }
  mold.defs.markdown = function(options) {
    if (typeof options == "string") options = {text: options}
    return markdown.render(linkRef(options.text, currentRoot))
  }
  mold.defs.markdownFile = function(options) {
    if (typeof options == "string") options = {file: options}
    options.text = readFileSync(join(base, options.file + ".md"), "utf8")
    return mold.defs.markdown(options)
  }
  mold.defs.root = function() {
    return currentRoot
  }
  return mold
}

const markdown = markdownIt({html: true, highlight}).use(require("markdown-it-deflist")).use(require("markdown-it-anchor"))

const escapeHTML = markdownIt().utils.escapeHtml

const escapeHtml = markdownIt().utils.escapeHtml

const parsers = {
  javascript: require("@lezer/javascript").parser,
  typescript: require("@lezer/javascript").parser.configure({dialect: "ts"}),
  lezer: require("@lezer/lezer").parser,
  shell: null,
  null: null,
}

function highlight(str, lang) {
  if (lang && !parsers.hasOwnProperty(lang))
    console.warn("No highlighting available for " + lang)
  let parser = parsers[lang]
  if (!parser) return escapeHtml(str)
  let result = "", pos = 0
  highlightTree(parser.parse(str), classHighlighter, (from, to, cls) => {
    if (from > pos) result += escapeHtml(str.slice(pos, from))
    result += `<span class="${cls}">${escapeHtml(str.slice(from, to))}</span>`
    pos = to
  })
  if (pos < str.length) result += escapeHtml(str.slice(pos))
  return result
}

let mold = loadTemplates(join(base, "template"), {})

function extractTOC(text) {
  let items = [], re = /\n(###?) (.*)/g, m
  while (m = re.exec(text)) {
    let depth = m[1].length, title = m[2], id = title.toLowerCase().replace(/\W+/g, "-")
    let list = depth == 2 ? items : items[items.length - 1].children
    list.push({name: title, link: "#" + id, children: []})
  }
  return items
}

function backToRoot(dir) {
  let result = "./"
  while (dir != ".") {
    result += "../"
    dir = dirname(dir)
  }
  return result
}

function injectCode(content, files) {
  let fileCode = files.map(f => readFileSync(f, "utf8")), m
  while (m = /\n!(\w+)\n/.exec(content)) {
    let found = false
    for (let i = 0; i < files.length; i++) {
      let code = fileCode[i], marker = "//!" + m[1] + "\n", start = code.indexOf(marker)
      if (start >= 0) {
        let end = code.indexOf("//!", start + marker.length)
        let mode = /\.ts$/.test(files[i]) ? "typescript" : /\.js$/.test(files[i]) ? "javascript" :
            /\.grammar$/.test(files[i]) ? "lezer" : ""
        let snippet = code.slice(start + marker.length, end < 0 ? code.length : end - 1).trimEnd()
        while (snippet[0] == "\n") snippet = snippet.slice(1)
        found = true
        content = content.slice(0, m.index + 1) + "```" + mode + "\n" +
          snippet + "\n```\n" +
          content.slice(m.index + m[0].length + 1)
        break
      }
    }
    if (!found) throw new Error("Reference to missing code snippet " + m[1])
  }
  return content
}

mapDir(join(base, "site"), join(base, "output"), (fullPath, name) => {
  currentRoot = backToRoot(dirname(name))
  if (name == "docs/ref/index.html") {
    let tocMap = {
      common: {name: "common", link: "#common", children: []},
      lr: {name: "lr", link: "#lr", children: []},
      highlight: {name: "highlight", link: "#highlight", children: []},
      generator: {name: "generator", link: "#generator", children: []}
    }
    let modules = buildRef()
    for (let m of modules) {
      m.content = m.content.replace(/<h3>([\S\s]+?)<\/h3>/g, (_, content) => {
        let id = m.name + '.' + content.replace(/\W+/g, '_')
        tocMap[m.name].children.push({name: content, link: '#' + id})
        return `<h3 id="${id}">${content}</h3>`
      })
    }
    let toc = []
    for (let k in tocMap) toc.push(tocMap[k])
    return {content: mold.bake(name, readFileSync(fullPath, "utf8"))({fileName: name, modules, toc})}
  } else if (name == "docs/changelog/index.md") {
    return {content: mold.defs.page({content: buildChangelog(), fileName: name}), name: name.replace(/\.md$/, ".html")}
  } else if (/\.md$/.test(name)) {
    let text = readFileSync(fullPath, "utf8")
    let meta = /^!(\{[^]*?\})\n\n/.exec(text)
    let data = meta ? JSON.parse(meta[1]) : {}
    data.content = meta ? text.slice(meta[0].length) : text
    data.fileName = name
    if (data.injectCode) {
      let files = Array.isArray(data.injectCode) ? data.injectCode : [data.injectCode]
      data.content = injectCode(data.content, files.map(f => join(dirname(fullPath), f)))
    }
    if (data.generateTOC) data.toc = extractTOC(data.content)
    return {name: name.replace(/\.md$/, ".html"),
            content: mold.defs[data.template || "page"](data)}
  } else if (/\.html$/.test(name)) {
    return {content: mold.bake(name, readFileSync(fullPath, "utf8"))({fileName: name})}
  } else {
    return null
  }
})
