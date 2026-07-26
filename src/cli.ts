#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import {
  parseStrings,
  parseStringsDetailed,
  ParseStringsOptions,
} from "./index";

interface CliArgs {
  input?: string;
  code?: string;
  stdin: boolean;
  out?: string;
  detailed: boolean;
  unique: boolean;
  pretty: boolean;
  help: boolean;
  options: ParseStringsOptions;
}

function printHelp(): void {
  console.log(`strings-js — extract the strings from JavaScript/TypeScript

Usage:
  strings-js <file.js> [options]      Parse a file
  strings-js --code "<source>" [opts] Parse raw source passed inline
  strings-js --stdin [options]        Parse raw source piped on stdin
  cat file.js | strings-js            (stdin is used automatically when piped)

Input options:
  -c, --code <source>     Parse the given raw source string directly
  --stdin                 Read raw source from standard input

Output options:
  -o, --out <file.json>   Write the result to a JSON file
  --detailed              Include kind + line/column for each string
  --unique                Drop duplicate values
  --pretty                Pretty-print JSON to stdout (default: compact)

Scope options:
  --no-literals           Exclude single/double-quoted string literals
  --no-templates          Exclude template (backtick) literals
  --no-property-keys      Exclude string object property keys
  --ts                    Parse input as TypeScript
  --no-jsx                Disable JSX parsing

  -h, --help              Show this help

Examples:
  strings-js app.js
  strings-js app.js --detailed -o strings.json
  strings-js --code 'const a = "hi"; const o = { "k": 1 };' --detailed
  echo 'const x = \`t \${y}\`;' | strings-js --pretty
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    stdin: false,
    detailed: false,
    unique: false,
    pretty: false,
    help: false,
    options: {},
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-c":
      case "--code":
        args.code = argv[++i];
        break;
      case "--stdin":
        args.stdin = true;
        break;
      case "-":
        args.stdin = true;
        break;
      case "-o":
      case "--out":
        args.out = argv[++i];
        break;
      case "--detailed":
        args.detailed = true;
        break;
      case "--unique":
        args.unique = true;
        args.options.unique = true;
        break;
      case "--no-literals":
        args.options.literals = false;
        break;
      case "--no-templates":
        args.options.templates = false;
        break;
      case "--no-property-keys":
        args.options.propertyKeys = false;
        break;
      case "--ts":
        args.options.typescript = true;
        break;
      case "--no-jsx":
        args.options.jsx = false;
        break;
      case "--pretty":
        args.pretty = true;
        break;
      default:
        if (a.startsWith("-") && a !== "-") {
          console.error(`Unknown option: ${a}`);
          process.exit(1);
        }
        if (!args.input) args.input = a;
        break;
    }
  }
  return args;
}

/** Read all of standard input synchronously as a UTF-8 string. */
function readStdin(): string {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * Resolve the source code to parse, from (in priority order):
 *   1. --code <source>
 *   2. --stdin / "-", or any piped stdin when no file was given
 *   3. a file path argument
 * Also infers TypeScript/JSX defaults from a file path's extension.
 */
function resolveSource(args: CliArgs): { code: string; label: string } {
  // 1. Inline raw source.
  if (args.code !== undefined) {
    return { code: args.code, label: "--code" };
  }

  // 2. Explicit stdin, or piped stdin when no file path was provided.
  const pipedStdin = !process.stdin.isTTY && !args.input;
  if (args.stdin || pipedStdin) {
    return { code: readStdin(), label: "stdin" };
  }

  // 3. File path.
  if (args.input) {
    const inputPath = path.resolve(args.input);
    if (!fs.existsSync(inputPath)) {
      console.error(`File not found: ${args.input}`);
      process.exit(1);
    }
    const code = fs.readFileSync(inputPath, "utf8");
    // Infer language from extension unless the user overrode it.
    const lower = args.input.toLowerCase();
    if (args.options.typescript === undefined) {
      args.options.typescript =
        lower.endsWith(".ts") ||
        lower.endsWith(".tsx") ||
        lower.endsWith(".mts") ||
        lower.endsWith(".cts");
    }
    if (args.options.jsx === undefined) {
      args.options.jsx =
        lower.endsWith(".jsx") ||
        lower.endsWith(".tsx") ||
        !args.options.typescript;
    }
    return { code, label: args.input };
  }

  // Nothing to parse.
  printHelp();
  process.exit(1);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const { code, label } = resolveSource(args);

  let result: unknown;
  try {
    result = args.detailed
      ? parseStringsDetailed(code, args.options)
      : parseStrings(code, args.options);
  } catch (err) {
    console.error(`Failed to parse ${label}: ${(err as Error).message}`);
    process.exit(1);
  }

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
    const count = Array.isArray(result) ? result.length : 0;
    console.error(`Wrote ${count} strings to ${args.out}`);
  } else {
    console.log(JSON.stringify(result, null, args.pretty ? 2 : 0));
  }
}

main();
