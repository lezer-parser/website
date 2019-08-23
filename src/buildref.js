const {gather} = require("gettypes")
const {build} = require("builddocs")
const {join, relative} = require("path")

function Mod(name) {
  this.name = name
  this.shortName = /\w+$/.exec(name)[0]
  let dir = require.resolve(name)
  this.base = dir.replace(/[\\\/]dist[\\\/][^\\\/]*$/, "")
  this.main = join(join(this.base, "src"), name == "lezer-tree" ? "tree.ts" : "index.ts")
  this.relative = relative(process.cwd(), this.base)
}

exports.buildRef = function buildRef() {
  let modules = ["lezer", "lezer-tree", "lezer-generator"].map(n => new Mod(n))

  return modules.map(mod => {
    let items = gather({filename: mod.main})
    return {
      name: mod.shortName,
      content: build({
        name: mod.name,
        anchorPrefix: mod.shortName + ".",
        main: join(mod.main, "../README.md"),
        allowUnresolvedTypes: false,
        markdownFilter: exports.linkRef,
        imports: [type => {
          let sibling = type.typeSource && modules.find(m => type.typeSource.startsWith(m.relative))
          if (sibling) return "#" + sibling.name + "." + type.type
        }]
      }, items)
    }
  })
}

exports.linkRef = function linkRef(markdown) {
  return markdown.replace(/\]\(#(#.*?)\)/g, "](/docs/ref/$1)")
}
