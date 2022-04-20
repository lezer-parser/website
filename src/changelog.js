const {readFileSync} = require("fs")
const {join} = require("path")

const nameChange = "2021-06-26"
const nameMap = {common: "lezer-tree", lr: "lezer", generator: "lezer-generator"}

exports.buildChangelog = function() {
  let logs = ["common", "lr", "highlight", "generator"].map(mod => {
    let dir = require.resolve("@lezer/" + mod)
    let base = dir.replace(/[\\\/]dist[\\\/][^\\\/]*$/, "")
    return {mod, log: readFileSync(join(base, "CHANGELOG.md"), "utf8")}
  })

  let entries = []
  let release = /(?:^|\n)## ([\d\.]+) \(([\d-]+)\)\n([^]*?)(?=$|\n## )/g
  for (let {mod, log} of logs) {
    for (let m; m = release.exec(log);) {
      let [_, version, date, body] = m
      let modName = date < nameChange ? nameMap[mod] : "@lezer/" + mod
      entries.push({date, content: `## [${modName}](../ref/#${mod}) ${version} (${date})\n${body}`})
    }
  }
  return "# Version Changelog\n\n" +
    entries.sort((a, b) => (a.date == b.date ? 0 : a.date < b.date ? 1 : -1)).map(e => e.content).join("\n")
}
