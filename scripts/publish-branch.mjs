import { cpSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// GitHub Pages for this repo publishes the main branch (not the Actions
// artifact). Copy the assembled site to the repo root so /token-lake/ and
// /network-sphere/ are real pages, and a missing URL shows the gallery
// instead of the sphere.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".output/public");
const skins = JSON.parse(readFileSync(join(root, "skins.json"), "utf8"));

for (const file of ["index.html", "404.html", ".nojekyll"]) {
  cpSync(join(out, file), join(root, file));
}

for (const skin of skins) {
  if (!/^[a-z0-9-]+$/.test(skin.id)) {
    throw new Error(`Refusing to publish unsafe skin id: ${skin.id}`);
  }
  const dest = join(root, skin.id);
  rmSync(dest, { recursive: true, force: true });
  cpSync(join(out, skin.id), dest, { recursive: true });
}

const lake = readFileSync(join(root, "token-lake/index.html"), "utf8");
const sphere = readFileSync(join(root, "network-sphere/index.html"), "utf8");
if (!lake.includes("<title>Token Lake</title>")) {
  throw new Error("token-lake/index.html is not the Token Lake page");
}
if (!sphere.includes("<title>Network Sphere</title>")) {
  throw new Error("network-sphere/index.html is not the Network Sphere page");
}
if (sphere.includes("/User-Interface-Skins-/assets/")) {
  throw new Error("Network Sphere is still loading site-root assets");
}

console.log("Published gallery, Token Lake, and Network Sphere at the repo root.");
