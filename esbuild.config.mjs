import fs from "fs";
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const saveToTestVault = {
  name: "save-to-test-vault",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length === 0) {
        const testVaultPluginDir =
          "obsidianrc-test-vault/.obsidian/plugins/obsidianrc";
        fs.copyFileSync("main.js", `${testVaultPluginDir}/main.js`);
        fs.copyFileSync("styles.css", `${testVaultPluginDir}/styles.css`);
        fs.copyFileSync("manifest.json", `${testVaultPluginDir}/manifest.json`);
        console.log(`Copied build to ${testVaultPluginDir}`);
      }
    });
  },
};

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: {
    js: banner,
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  plugins: prod ? [] : [saveToTestVault],
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
