# strings-js

A small TypeScript library **and** CLI that reads JavaScript (or TypeScript) and parses its strings into an array.

It uses the TypeScript compiler to build an abstract syntax tree, so it collects **real** strings from the code and ignores things like text inside comments. It captures three kinds of strings:

- **String literals** — `'hello'`, `"world"`
- **Template literals** — `` `hi ${name}` `` (interpolation slots are shown as `${...}`)
- **Object property keys** — the `"foo"` in `{ "foo": 1 }`

You can feed it either a **file path** or **raw source content** — both from code (as a library) and from the command line.

## Install

```bash
npm install
npm run build
```

The only runtime dependency is `typescript`.

## Use as a library

```ts
import {
  parseStrings,
  parseStringsDetailed,
  parseStringsFromFile,
  parseStringsDetailedFromFile,
} from "strings-js";

// --- From raw source content ---
const code = `const greeting = "hello"; const t = \`hi \${name}\`; const o = { "key": 1 };`;

parseStrings(code);
// => ["hello", "hi ${...}", "key"]

parseStringsDetailed(code);
// => [
//   { value: "hello",     kind: "literal",     line: 1, column: 18 },
//   { value: "hi ${...}", kind: "template",    line: 1, column: 43 },
//   { value: "key",       kind: "propertyKey", line: 1, column: 68 },
// ]

// --- From a file on disk (language inferred from the extension) ---
parseStringsFromFile("./app.js");
parseStringsDetailedFromFile("./module.ts"); // .ts/.tsx/.jsx auto-detected
```

`parseStrings` / `parseStringsDetailed` take **raw content**; the `...FromFile`
variants read a path and are thin wrappers around them.

### Options

Every function takes an optional second `ParseStringsOptions` argument:

| Option         | Default | Description                                        |
| -------------- | ------- | -------------------------------------------------- |
| `literals`     | `true`  | Include single/double-quoted string literals       |
| `templates`    | `true`  | Include template (backtick) literals               |
| `propertyKeys` | `true`  | Include string-valued object property keys         |
| `jsx`          | `true`  | Enable JSX syntax when parsing                      |
| `typescript`   | `false` | Parse the source as TypeScript                     |
| `unique`       | `false` | Drop duplicate values, keeping first occurrence    |
| `fileName`     | —       | Label used for the source (does not change parsing)|

```ts
parseStrings(code, { propertyKeys: false, unique: true });
```

For the `...FromFile` helpers, `typescript` and `jsx` are inferred from the file
extension unless you set them explicitly.

## Use from the command line

```bash
# Parse a file
node dist/cli.js app.js

# Parse raw source passed inline
node dist/cli.js --code 'const a = "hi"; const o = { "k": 1 };' --detailed

# Parse raw source piped on stdin
cat app.js | node dist/cli.js --pretty
node dist/cli.js --stdin < app.js

# Pretty-print with kind + line/column
node dist/cli.js app.js --detailed --pretty

# Write results to a file, de-duplicated
node dist/cli.js app.js --unique -o strings.json

# Parse a TypeScript source file
node dist/cli.js module.ts --ts
```

Input precedence is `--code`, then stdin (`--stdin`/`-`/a pipe), then a file path.
Run `node dist/cli.js --help` for the full list, including `--no-literals`,
`--no-templates`, and `--no-property-keys` to narrow the scope.

During development you can skip the build step with `npm run dev -- app.js`.

## License

MIT
