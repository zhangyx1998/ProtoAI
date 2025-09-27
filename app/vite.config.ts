import { resolve } from "path";
import { fileURLToPath } from "url";
import fs from "node:fs";
import { defineConfig, Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import electron from "vite-plugin-electron/simple";
import pkg from "./package.json";

function cjsRequire(module: string): Plugin {
    return {
        name: "vite-plugin-cjs-require::" + module,
        resolveId(id) {
            if (id === module) return "\0" + id;
        },
        load(id) {
            if (id === "\0" + module) {
                return [
                    `import { createRequire } from 'module';`,
                    `const require = createRequire(import.meta.url);`,
                    `export default require('${module}');`,
                ].join("\n");
            }
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
    fs.rmSync("dist-electron", { recursive: true, force: true });

    const isServe = command === "serve";
    const isBuild = command === "build";
    const sourcemap = isServe || !!process.env.VSCODE_DEBUG;
    const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), "..");

    return {
        plugins: [
            vue(),
            cjsRequire("core"),
            electron({
                main: {
                    // Shortcut of `build.lib.entry`
                    entry: "electron/main.ts",
                    vite: {
                        build: {
                            sourcemap,
                            minify: isBuild,
                            outDir: "dist-electron",
                            rollupOptions: {
                                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons,
                                // we can use `external` to exclude them to ensure they work correctly.
                                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                                // Of course, this is not absolute, just this way is relatively simple. :)
                                external: pkg.external ?? [],
                            },
                        },
                    },
                },
                preload: {
                    // Shortcut of `build.rollupOptions.input`.
                    // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
                    input: "electron/preload.ts",
                    vite: {
                        build: {
                            sourcemap: sourcemap ? "inline" : undefined, // #332
                            minify: isBuild,
                            outDir: "dist-electron",
                            rollupOptions: {
                                external: Object.keys(
                                    "dependencies" in pkg
                                        ? pkg.dependencies
                                        : {}
                                ),
                            },
                        },
                    },
                },
                // Ployfill the Electron and Node.js API for Renderer process.
                // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
                // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
                renderer: {},
            }),
        ],
        server:
            process.env.VSCODE_DEBUG &&
            (() => {
                const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
                return {
                    host: url.hostname,
                    port: +url.port,
                };
            })(),
        clearScreen: false,
        resolve: {
            alias: {
                "@": resolve(PROJECT_ROOT, "src"),
                "@lib": resolve(PROJECT_ROOT, "lib"),
                "@src": resolve(PROJECT_ROOT, "src"),
            },
        },
    };
});
