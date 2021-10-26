# Lezer Website

These are the sources for the [Lezer
website](https://lezer.codemirror.net).

The build process requires `@lezer/common`, `@lezer/lr`, and
`@lezer/generator` to resolve to the _source_ checkouts of those
packages, not just the installed npm packages. At the moment there's
no automated way to set that up.

```
npm install
node src/index.js
```

This uses [getdocs-ts](https://github.com/marijnh/getdocs-ts/) and
[builddocs](https://github.com/marijnh/builddocs/) to extract types
and documentation from the project's source code.