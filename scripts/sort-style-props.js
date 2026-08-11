#!/usr/bin/env node
const { run } = require("jscodeshift/src/Runner");
const path = require("path");

const files = process.argv.slice(2);
if (!files.length) process.exit(0);

run(path.join(__dirname, "sort-style-props-transform.js"), files, {
   verbose: 0,
   dry: false,
   print: false,
   babel: true,
   extensions: "js,jsx,ts,tsx",
   parser: "tsx",
}).then(() => process.exit(0));
