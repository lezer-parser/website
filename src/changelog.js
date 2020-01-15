const {readFileSync} = require("fs")
const {join} = require("path")

exports.buildChangelog = function() {
  let logs = ["lezer", "lezer-tree", "lezer-generator"].map(mod => {
    let dir = require.resolve(mod)
    let base = dir.replace(/[\\\/]dist[\\\/][^\\\/]*$/, "")
    return {mod, log: readFileSync(join(base, "CHANGELOG.md"), "utf8")}
  })

  let entries = []
  let release = /(?:^|\n)## ([\d\.]+) \(([\d-]+)\)\n([^]*?)(?=\n## )/g
  for (let {mod, log} of logs) {
    for (let m; m = release.exec(log);) {
      let [_, version, date, body] = m
      entries.push({date, content: `## [${mod}](../ref/#${mod}) ${version} (${date})\n${body}`})
    }
  }
  return "# Version Changelog\n\n" +
    entries.sort((a, b) => (a.date == b.date ? 0 : a.date < b.date ? 1 : -1)).map(e => e.content).join("\n")
}
