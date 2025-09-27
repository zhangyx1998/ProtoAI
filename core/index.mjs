// ------------------------------------------------------
// Copyright (c) 2025 Yuxuan Zhang
// This source code is licensed under the MIT license.
// You may find the full license in project root directory.
// -------------------------------------------------------
// ESM wrapper: use createRequire to load the .node file
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Module = require("./index.cjs");

export default Module;
// (optional) re-expose named exports for nicer ESM ergonomics:
export const { Counter, __origin__ } = Module;
