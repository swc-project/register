import * as swc from "@swc/core";
import fs from "fs";
import deepClone from "lodash.clonedeep";
import { escapeRegExp, pathPatternToRegex } from "./util";
import path from "path";
import { addHook } from "pirates";
import sourceMapSupport from "source-map-support";

export interface InputOptions extends TransformOptions {
  extensions?: string[];
}

/**
 * Babel has built-in ignore & only support while @swc/core doesn't. So let's make our own!
 */

export interface TransformOptions extends swc.Options {
  only?: FilePattern;
  ignore?: FilePattern;
}

// https://github.com/babel/babel/blob/7e50ee2d823ebc9e50eb3575beb77666214edf8e/packages/babel-core/src/config/validation/options.ts#L201-L202
export type FilePattern = ReadonlyArray<string | ((filename: string, { dirname }: { dirname: string }) => any) | RegExp>;

const maps: { [src: string]: string } = {};
let transformOpts: TransformOptions = {};
let piratesRevert: (() => void) | null = null;

function installSourceMapSupport() {
  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: "node",
    retrieveSourceMap(source) {
      const map = maps && maps[source];
      if (map) {
        return {
          url: null as any,
          map: map
        };
      } else {
        return null;
      }
    }
  });
}

function mtime(filename: string) {
  return +fs.statSync(filename).mtime;
}

function compile(code: string | any, filename: string) {
  // merge in base options and resolve all the plugins and presets relative to this file
  const opts = {
    sourceRoot: path.dirname(filename) + path.sep,
    ...deepClone(transformOpts),
    filename
  };

  if (typeof code !== "string") {
    code = code.toString();
  }
  delete opts.only;
  delete opts.ignore;
  const output: swc.Output = swc.transformSync(code, {
    ...opts,
    sourceMaps: opts.sourceMaps === undefined ? true : opts.sourceMaps
  });

  if (output.map) {
    if (Object.keys(maps).length === 0) {
      installSourceMapSupport();
    }
    maps[filename] = output.map;
  }

  return output.code;
}

let compiling = false;

function compileHook(code: string, filename: string) {
  if (compiling) return code;

  try {
    compiling = true;
    return compile(code, filename);
  } finally {
    compiling = false;
  }
}

function hookExtensions(exts: readonly string[]) {
  if (piratesRevert) piratesRevert();
  piratesRevert = addHook(compileHook, { exts: exts as string[], ignoreNodeModules: false, matcher });
}

export function revert() {
  if (piratesRevert) piratesRevert();
}

export default function register(opts: InputOptions = {}) {
  // Clone to avoid mutating the arguments object with the 'delete's below.
  opts = {
    ...opts
  };
  hookExtensions(opts.extensions || swc.DEFAULT_EXTENSIONS);

  delete opts.extensions;

  transformOpts = {
    ...opts,
    caller: {
      name: "@swc/register",
      ...(opts.caller || {})
    }
  };

  let { cwd = "." } = transformOpts;

  // Ensure that the working directory is resolved up front so that
  // things don't break if it changes later.
  cwd = transformOpts.cwd = path.resolve(cwd);

  if (transformOpts.ignore === undefined && transformOpts.only === undefined) {
    transformOpts.only = [
      // Only compile things inside the current working directory.
      new RegExp("^" + escapeRegExp(cwd), "i")
    ];
    transformOpts.ignore = [
      // Ignore any node_modules inside the current working directory.
      new RegExp(
        "^" +
        escapeRegExp(cwd) +
        "(?:" +
        path.sep +
        ".*)?" +
        escapeRegExp(path.sep + "node_modules" + path.sep),
        "i"
      )
    ];
  }
}


/**
 * https://github.com/babel/babel/blob/7acc68a86b70c6aadfef28e10e83d0adb2523807/packages/babel-core/src/config/config-chain.ts
 *
 * Tests if a filename should be ignored based on "ignore" and "only" options.
 */
function matcher(filename: string, dirname?: string) {
  if (!dirname) {
    dirname = transformOpts.cwd || path.dirname(filename);
  }
  return shouldCompile(transformOpts.ignore, transformOpts.only, filename, dirname);
}

function shouldCompile(
  ignore: FilePattern | undefined | null,
  only: FilePattern | undefined | null,
  filename: string,
  dirname: string,
): boolean {
  if (ignore && matchPattern(ignore, dirname, filename)) {
    return false;
  }
  if (only && !matchPattern(only, dirname, filename)) {
    return false;
  }
  return true;
}

/**
 * https://github.com/babel/babel/blob/7acc68a86b70c6aadfef28e10e83d0adb2523807/packages/babel-core/src/config/config-chain.ts
 *
 * Returns result of calling function with filename if pattern is a function.
 * Otherwise returns result of matching pattern Regex with filename.
 */
function matchPattern(
  patterns: FilePattern,
  dirname: string,
  pathToTest: string
): boolean {
  return patterns.some(pattern => {
    if (typeof pattern === "function") {
      return Boolean(pattern(pathToTest, { dirname }));
    }

    if (typeof pathToTest !== "string") {
      throw new Error(
        `Configuration contains string/RegExp file pattern, but no filename was provided.`,
      );
    }

    if (typeof pattern === "string") {
      pattern = pathPatternToRegex(pattern, dirname);
    }
    return pattern.test(path.resolve(dirname, pathToTest));
  });
}

