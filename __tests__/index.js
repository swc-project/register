const fs = require("fs");
const path = require("path");

const registerFile = require.resolve("../lib/node");
const testFile = require.resolve("./fixtures/swcrc/es2015");
const testFileContent = fs.readFileSync(testFile);

const defaultOptions = {
  exts: [".js", ".jsx", ".es6", ".es", ".mjs", ".ts", ".tsx"],
  ignoreNodeModules: false
};

describe("@swc/register", function() {
  let currentHook, currentOptions, sourceMapSupport;

  const mocks = {
    ['pirates']: {
      addHook(hook, opts) {
        currentHook = hook;
        currentOptions = opts;

        return () => {
          currentHook = null;
          currentOptions = null;
        };
      },
    },

    ['source-map-support']: {
      install() {
        sourceMapSupport = true;
      },
    },
  };

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

  beforeEach(() => {
    currentHook = null;
    currentOptions = null;
    sourceMapSupport = false;
    jest.resetModules();
  });

  afterEach(() => {
    revertRegister();
  });

  jest.doMock("pirates", () => mocks["pirates"]);
  jest.doMock("source-map-support", () => mocks["source-map-support"]);

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

    currentHook("const a = 2;", testFile);

    expect(sourceMapSupport).toBe(true);
  });

  test("does not install source map support if asked not to", () => {
    setupRegister({
      swcrc: false,
      sourceMaps: false
    });

    currentHook("const a = 3;", testFile);

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

    expect(result).toBe('"use strict";\nrequire("assert");\n');
  });

  test("hook transpiles with swcrc", () => {
    setupRegister({
      swcrc: true,
      sourceMaps: false
    });

    const result = currentHook(testFileContent, testFile);

    expect(result).toBe('"use strict";\nrequire("assert");\n');
  });
});
