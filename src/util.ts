import path from "path";

export function escapeRegExp(string: string): string {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

/**
 * Babel <https://babeljs.io/>
 * Released under MIT license <https://github.com/babel/babel/blob/main/LICENSE>
 */
const sep = `\\${path.sep}`;
const endSep = `(?:${sep}|$)`;

const substitution = `[^${sep}]+`;

const starPat = `(?:${substitution}${sep})`;
const starPatLast = `(?:${substitution}${endSep})`;

const starStarPat = `${starPat}*?`;
const starStarPatLast = `${starPat}*?${starPatLast}?`;

/**
 * https://github.com/babel/babel/blob/7acc68a86b70c6aadfef28e10e83d0adb2523807/packages/babel-core/src/config/pattern-to-regex.ts
 *
 * Implement basic pattern matching that will allow users to do the simple
 * tests with * and **. If users want full complex pattern matching, then can
 * always use regex matching, or function validation.
 */
export function pathPatternToRegex(
  pattern: string,
  dirname: string,
): RegExp {
  const parts = path.resolve(dirname, pattern).split(path.sep);

  return new RegExp(
    [
      "^",
      ...parts.map((part, i) => {
        const last = i === parts.length - 1;

        // ** matches 0 or more path parts.
        if (part === "**") return last ? starStarPatLast : starStarPat;

        // * matches 1 path part.
        if (part === "*") return last ? starPatLast : starPat;

        // *.ext matches a wildcard with an extension.
        if (part.indexOf("*.") === 0) {
          return (
            substitution + escapeRegExp(part.slice(1)) + (last ? endSep : sep)
          );
        }

        // Otherwise match the pattern text.
        return escapeRegExp(part) + (last ? endSep : sep);
      }),
    ].join(""),
  );
}
