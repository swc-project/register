const fs = require("fs");
const path = require("path");

let currentHook;
let currentOptions;
let sourceMapSupport = false;

const registerFile = require.resolve("../lib/node");
const testFile = require.resolve("./fixtures/swcrc/es2015");
const testFileContent = fs.readFileSync(testFile);

jest.mock("pirates", () => {
  return {
    addHook(hook, opts) {
      currentHook = hook;
      currentOptions = opts;

      return () => {
        currentHook = null;
        currentOptions = null;
      };
    }
  };
});

jest.mock("source-map-support", () => {
  return {
    install() {
      sourceMapSupport = true;
    }
  };
});

const defaultOptions = {
  exts: [".js", ".jsx", ".es6", ".es", ".mjs", ".ts", ".tsx"],
  ignoreNodeModules: false
};

describe("@swc/register", function() {
  let swcRegister;

  function setupRegister(config = { swcrc: false }) {
    config = {
      cwd: path.dirname(testFile),
      ...config
    };

    swcRegister = require(registerFile);
    swcRegister.default(config);
  }

  function revertRegister() {
    if (swcRegister) {
      swcRegister.revert();
      delete require.cache[registerFile];
      swcRegister = null;
    }
  }

  afterEach(() => {
    revertRegister();
    currentHook = null;
    currentOptions = null;
    sourceMapSupport = false;
    jest.resetModules();
  });

  test("registers hook correctly", () => {
    setupRegister();

    expect(typeof currentHook).toBe("function");
    expect(currentOptions).toEqual(defaultOptions);
  });

  test("unregisters hook correctly", () => {
    setupRegister();
    revertRegister();

    expect(currentHook).toBeNull();
    expect(currentOptions).toBeNull();
  });

  test("installs source map support by default", () => {
    setupRegister();

    currentHook("const a = 1;", testFile);

    expect(sourceMapSupport).toBe(true);
  });

  test("installs source map support when requested", () => {
    setupRegister({
      swcrc: false,
      sourceMaps: true
    });

    currentHook("const a = 1;", testFile);

    expect(sourceMapSupport).toBe(true);
  });

  test("does not install source map support if asked not to", () => {
    setupRegister({
      swcrc: false,
      sourceMaps: false
    });

    currentHook("const a = 1;", testFile);

    expect(sourceMapSupport).toBe(false);
  });

  test("hook transpiles with config", () => {
    setupRegister({
      swcrc: false,
      sourceMaps: false,
      module: {
        type: "commonjs"
      }
    });

    const result = currentHook(testFileContent, testFile);

    expect(result.replace(/\n/g, "")).toBe("'use strict';require('assert');");
  });

  test("hook transpiles with swcrc", () => {
    setupRegister({
      swcrc: true,
      sourceMaps: false
    });

    const result = currentHook(testFileContent, testFile);

    expect(result.replace(/\n/g, "")).toBe("'use strict';require('assert');");
  });
});
