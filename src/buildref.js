const {gatherMany} = require("getdocs-ts")
const {build} = require("builddocs")
const {join, relative} = require("path")

function Mod(name) {
  this.name = name
  this.shortName = /\w+$/.exec(name)[0]
  let dir = require.resolve(name)
  this.base = dir.replace(/[\\\/]dist[\\\/][^\\\/]*$/, "")
  this.main = join(join(this.base, "src"), name == "lezer-tree" ? "tree.ts" : "index.ts")
  this.relative = relative(process.cwd(), this.base) + "/"
}

exports.buildRef = function buildRef() {
  let modules = ["lezer", "lezer-tree", "lezer-generator"].map(n => new Mod(n))

  let moduleItems = gatherMany(modules.map(mod => ({filename: mod.main})))
  return modules.map((mod, i) => {
    return {
      name: mod.shortName,
      content: build({
        name: mod.name,
        anchorPrefix: mod.shortName + ".",
        main: join(mod.main, "../README.md"),
        allowUnresolvedTypes: false,
        breakAt: 45,
        imports: [type => {
          let sibling = type.typeSource && modules.find(m => type.typeSource.startsWith(m.relative))
          if (sibling) return "#" + sibling.shortName + "." + type.type
        }]
      }, moduleItems[i])
    }
  })
}
