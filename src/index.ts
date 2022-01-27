import { InputOptions } from "./node";

/**
 * This file wraps the compiled ES6 module implementation of register so
 * that it can be used both from a standard CommonJS environment, and also
 * from a compiled swc import.
 */

exports = module.exports = function(...args: InputOptions[]) {
  return register(...args);
};
exports.__esModule = true;

const node = require("./nodeWrapper");
const register = node.default;

Object.assign(exports, node);
