const {gather} = require("gettypes")
const {build} = require("builddocs")
const {join} = require("path")

function Mod(name) {
  this.name = name
  let dir = require.resolve(name)
  this.base = dir.replace(/[\\\/]dist[\\\/][^\\\/]*$/, "")
  this.main = join(join(this.base, "src"), name == "lezer-tree" ? "tree.ts" : "index.ts")
}

function gatherAll(obj, target) {
  if (obj.id) target[obj.id] = obj
  if (Object.prototype.hasOwnProperty.call(obj, "constructor")) gatherAll(obj.constructor, target)
  if (obj.properties) for (let prop in obj.properties) gatherAll(obj.properties[prop], target)
  if (obj.staticProperties) for (let prop in obj.staticProperties) gatherAll(obj.staticProperties[prop], target)
  return target
}

exports.buildRef = function buildRef() {
  let modules = ["lezer", "lezer-tree", "lezer-generator"].map(n => new Mod(n))

  return modules.map(mod => {
    let {exports, usages} = gather({filename: mod.main})
    let imports = {"[object Object]": false, Iteration: false} // FIXME investigate
    for (let name in usages) {
      let sibling = modules.find(m => usages[name] && usages[name].startsWith(m.base))
      if (sibling) imports[name] = sibling.name + "." + name
    }
    return {
      module: mod.name,
      content: build({
        name: mod.name,
        main: join(mod.main, "../README.md"),
        allowUnresolvedTypes: false,
        imports: [imports]
      }, {
        items: exports,
        all: gatherAll({properties: exports}, Object.create(null))
      })
    }
  })
}
