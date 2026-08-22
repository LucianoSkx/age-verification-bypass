'use strict';

const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "age-verification-bypass.user.js");
const src = fs.readFileSync(file, "utf8");
let failures = 0;
let passed = 0;

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log("OK  ", name);
    } catch (e) {
        failures++;
        console.log("FAIL", name, "-", e.message);
    }
}

check("userscript parses as valid JavaScript", () => {
    new Function(src);
});

const MARK = "const modified = `";
let idx = 0;
let count = 0;

while ((idx = src.indexOf(MARK, idx)) !== -1) {
    count++;
    const start = idx + MARK.length;
    let search = start;
    let rendered = null;
    while (search < src.length) {
        const bt = src.indexOf("`;", search);
        if (bt === -1) break;
        try {
            rendered = new Function("return `" + src.slice(start, bt) + "`")();
            break;
        } catch (_) {
            search = bt + 2;
        }
    }
    const label = `injected template #${count}`;
    if (rendered === null) {
        failures++;
        console.log("FAIL", label, "- could not extract/render");
    } else {
        check(`${label} renders and parses (${rendered.length} chars)`, () => {
            new Function(rendered);
        });
    }
    idx += MARK.length;
}

if (count === 0) {
    failures++;
    console.log("FAIL no injected templates found - extraction logic may be broken");
}

console.log("---");
console.log(`${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
