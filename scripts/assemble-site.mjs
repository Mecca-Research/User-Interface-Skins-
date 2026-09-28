import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".output/public");
const skins = JSON.parse(readFileSync(join(root, "skins.json"), "utf8"));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const skin of skins) {
  const dir = join(root, "skins", skin.id);
  const dest = join(out, skin.id);
  if (skin.build) {
    const result = spawnSync(skin.build, {
      cwd: dir,
      stdio: "inherit",
      shell: true,
    });
    if (result.status !== 0) {
      console.error(`Build failed for ${skin.name}`);
      process.exit(result.status ?? 1);
    }
    cpSync(join(dir, skin.output ?? ".output/public"), dest, { recursive: true });
  } else {
    cpSync(dir, dest, {
      recursive: true,
      filter: (src) => {
        const rel = relative(dir, src);
        if (!rel) return true;
        return !rel.split(/[\\/]/).some((part) =>
          part === "node_modules" || part === ".output" || part === "README.md",
        );
      },
    });
  }
}

const page = galleryHtml(skins);
writeFileSync(join(out, "index.html"), page);
writeFileSync(join(out, "404.html"), page);
writeFileSync(join(out, ".nojekyll"), "");
writeFileSync(join(out, "skins.json"), JSON.stringify(skins, null, 2) + "\n");

function galleryHtml(list) {
  const cards = list
    .map(
      (skin) => `<a class="card" href="./${skin.id}/">
        <p class="kicker">${escapeHtml(skin.name)}</p>
        <p class="blurb">${escapeHtml(skin.description)}</p>
        <span class="open">Open</span>
      </a>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>User Interface Skins</title>
    <meta
      name="description"
      content="A gallery of experimental interfaces. Open Network Sphere or Token Lake, and add the next skin the same way."
    />
    <meta name="theme-color" content="#07090d" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Syne:wght@600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: #07090d; color: #e7eef2; }
      body {
        font-family: Manrope, system-ui, sans-serif;
        padding: 48px 20px 72px;
      }
      main { max-width: 880px; margin: 0 auto; }
      h1 {
        margin: 0;
        font-family: Syne, sans-serif;
        font-size: clamp(2.4rem, 6vw, 4rem);
        letter-spacing: -0.04em;
        font-weight: 700;
      }
      .lead {
        max-width: 38rem;
        margin: 14px 0 0;
        color: #93a3ad;
        line-height: 1.5;
      }
      .grid {
        display: grid;
        gap: 14px;
        margin-top: 36px;
      }
      @media (min-width: 720px) {
        .grid { grid-template-columns: 1fr 1fr; }
      }
      .card {
        display: flex;
        min-height: 180px;
        flex-direction: column;
        gap: 10px;
        padding: 22px;
        text-decoration: none;
        color: inherit;
        border-radius: 18px;
        background: rgba(18, 24, 30, 0.72);
        box-shadow: 0 0 0 1px rgba(231, 238, 242, 0.08);
      }
      .card:hover { box-shadow: 0 0 0 1px rgba(231, 238, 242, 0.22); }
      .kicker {
        margin: 0;
        font-family: Syne, sans-serif;
        font-size: 1.35rem;
        letter-spacing: -0.03em;
      }
      .blurb { margin: 0; color: #93a3ad; line-height: 1.45; flex: 1; }
      .open { color: #d5e4ea; font-size: 0.85rem; }
      footer { margin-top: 28px; color: #6d7c86; font-size: 0.85rem; }
      code { color: #d5e4ea; }
    </style>
  </head>
  <body>
    <main>
      <h1>User Interface Skins</h1>
      <p class="lead">
        Experimental interfaces, each in its own folder, each with a live page.
        Open one, or add the next by dropping a folder in <code>skins/</code> and a line in <code>skins.json</code>.
      </p>
      <div class="grid">
        ${cards}
      </div>
      <footer>Mecca Research</footer>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (ch) => {
    if (ch === "&") return "&" + "amp;";
    if (ch === "<") return "&" + "lt;";
    if (ch === ">") return "&" + "gt;";
    return "&" + "quot;";
  });
}
