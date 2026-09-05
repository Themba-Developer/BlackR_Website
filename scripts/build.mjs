import {cp, copyFile, mkdir, rm} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const files = [
  ".nojekyll",
  "_headers",
  "_routes.json",
  "chatbot.css",
  "form.css",
  "homepage.css",
  "index.html",
  "parents-onboarding.html",
  "products.css",
  "products.html",
  "school-onboarding.html",
  "script.js",
  "styles.css",
];

await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
await Promise.all(
  files.map(async (file) => {
    const destination = resolve(output, file);
    await mkdir(dirname(destination), {recursive: true});
    await copyFile(resolve(root, file), destination);
  }),
);
await Promise.all([
  cp(resolve(root, "assets"), resolve(output, "assets"), {recursive: true}),
  cp(resolve(root, "admin"), resolve(output, "admin"), {recursive: true}),
  cp(resolve(root, "js"), resolve(output, "js"), {recursive: true}),
]);

console.log("Built Cloudflare Pages assets in dist/.");
