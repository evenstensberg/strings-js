import * as ts from "typescript";
import * as fs from "fs";

/** The kind of node a string was extracted from. */
export type StringKind = "literal" | "template" | "propertyKey";

/** A single extracted string plus where it came from. */
export interface ExtractedString {
  /** The string value (template literals use their text, with `${...}` for slots). */
  value: string;
  /** What kind of syntax node produced this string. */
  kind: StringKind;
  /** 1-based line number in the source. */
  line: number;
  /** 1-based column number in the source. */
  column: number;
}

export interface ParseStringsOptions {
  /** Include single/double-quoted string literals. Default: true. */
  literals?: boolean;
  /** Include template literals (backtick strings). Default: true. */
  templates?: boolean;
  /** Include string-valued object property keys. Default: true. */
  propertyKeys?: boolean;
  /** Enable JSX syntax when parsing. Default: true. */
  jsx?: boolean;
  /** Parse the source as TypeScript instead of JavaScript. Default: false. */
  typescript?: boolean;
  /** Drop duplicate string values, keeping first occurrence. Default: false. */
  unique?: boolean;
  /**
   * Optional file name used only to label the source when parsing.
   * Its extension does not change behaviour (that is controlled by the
   * `jsx` / `typescript` options).
   */
  fileName?: string;
}

/** Reconstruct the readable text of a template literal node. */
function templateText(node: ts.TemplateLiteral): string {
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  // TemplateExpression: head + spans, with `${...}` marking each interpolation.
  let out = node.head.text;
  for (const span of node.templateSpans) {
    out += "${...}" + span.literal.text;
  }
  return out;
}

/** True when a string literal node is being used as a (non-computed) property key. */
function isPropertyKey(node: ts.StringLiteral): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (
    ts.isPropertyAssignment(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent) ||
    ts.isGetAccessorDeclaration(parent) ||
    ts.isSetAccessorDeclaration(parent) ||
    ts.isEnumMember(parent) ||
    ts.isPropertyDeclaration(parent)
  ) {
    return parent.name === node;
  }
  return false;
}

/**
 * Parse JavaScript (or TypeScript) source and return every string it
 * contains, with metadata about each occurrence. Comments and other
 * non-string tokens are ignored because parsing is AST-based.
 */
export function parseStringsDetailed(
  code: string,
  options: ParseStringsOptions = {}
): ExtractedString[] {
  const {
    literals = true,
    templates = true,
    propertyKeys = true,
    jsx = true,
    typescript = false,
    unique = false,
    fileName,
  } = options;

  const scriptKind = typescript
    ? jsx
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
    : jsx
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.JS;

  const name = fileName ?? (typescript ? "input.ts" : "input.js");

  const sourceFile = ts.createSourceFile(
    name,
    code,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind
  );

  const results: ExtractedString[] = [];

  const record = (value: string, kind: StringKind, node: ts.Node) => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile)
    );
    results.push({ value, kind, line: line + 1, column: character + 1 });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node)) {
      if (isPropertyKey(node)) {
        if (propertyKeys) record(node.text, "propertyKey", node);
      } else if (literals) {
        record(node.text, "literal", node);
      }
    } else if (
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    ) {
      if (templates) record(templateText(node), "template", node);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (!unique) return results;

  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.value)) return false;
    seen.add(r.value);
    return true;
  });
}

/**
 * Parse JavaScript (or TypeScript) source and return a flat array of the
 * string values. This is the simple form most callers want.
 */
export function parseStrings(
  code: string,
  options: ParseStringsOptions = {}
): string[] {
  return parseStringsDetailed(code, options).map((r) => r.value);
}

/**
 * Infer sensible `typescript` / `jsx` defaults from a file's extension,
 * without overriding anything the caller set explicitly.
 */
function optionsForExtension(
  filePath: string,
  options: ParseStringsOptions
): ParseStringsOptions {
  const lower = filePath.toLowerCase();
  const inferred: ParseStringsOptions = {};
  if (options.typescript === undefined) {
    inferred.typescript = lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".mts") || lower.endsWith(".cts");
  }
  if (options.jsx === undefined) {
    inferred.jsx = lower.endsWith(".jsx") || lower.endsWith(".tsx") || !inferred.typescript;
  }
  return { ...inferred, ...options, fileName: options.fileName ?? filePath };
}

/**
 * Read a JavaScript/TypeScript file from disk and return the detailed list of
 * strings it contains. TypeScript/JSX parsing is inferred from the file
 * extension unless overridden via `options`. (Node.js only.)
 */
export function parseStringsDetailedFromFile(
  filePath: string,
  options: ParseStringsOptions = {}
): ExtractedString[] {
  const code = fs.readFileSync(filePath, "utf8");
  return parseStringsDetailed(code, optionsForExtension(filePath, options));
}

/**
 * Read a JavaScript/TypeScript file from disk and return a flat array of the
 * string values it contains. (Node.js only.)
 */
export function parseStringsFromFile(
  filePath: string,
  options: ParseStringsOptions = {}
): string[] {
  return parseStringsDetailedFromFile(filePath, options).map((r) => r.value);
}
