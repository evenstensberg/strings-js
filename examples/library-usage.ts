/**
 * Example: using strings-js as a library.
 *
 * Run with:  npx ts-node examples/library-usage.ts
 *      or:   npm run build && node -r ts-node/register examples/library-usage.ts
 */
import {
  parseStrings,
  parseStringsDetailed,
  parseStringsFromFile,
} from "../src/index";

// 1. From raw source content ------------------------------------------------
const raw = `
  const greeting = "hello world";
  const t = \`hi \${name}\`;
  const config = { "api-key": "abc123" };
`;

console.log("Flat list from raw content:");
console.log(parseStrings(raw));
// => [ 'hello world', 'hi ${...}', 'api-key', 'abc123' ]

console.log("\nDetailed, unique, literals only:");
console.log(
  parseStringsDetailed(raw, { propertyKeys: false, templates: false, unique: true })
);

// 2. From a file on disk ----------------------------------------------------
console.log("\nStrings read from examples/sample.js:");
console.log(parseStringsFromFile(__dirname + "/sample.js"));
