import fs from "node:fs";
import path from "node:path";

const partsDir = path.resolve("..", "wp-content", "themes", "creations-of-mine", "parts");
const outDir = path.resolve("src", "content");
fs.mkdirSync(outDir, { recursive: true });

function convert(php) {
  return php
    .replaceAll(/<\?php echo esc_url\( com_asset\( '([^']+)' \) \); \?>/g, "/assets/$1")
    .replaceAll(/<\?php echo esc_url\( home_url\( '([^']+)' \) \); \?>/g, (_, href) =>
      href.replace("/#", "#"),
    );
}

for (const file of fs.readdirSync(partsDir)) {
  if (!file.endsWith(".php")) continue;
  const name = file.replace(/\.php$/, "");
  const html = convert(fs.readFileSync(path.join(partsDir, file), "utf8")).trim();
  const exportName = `${name}Html`;
  fs.writeFileSync(
    path.join(outDir, `${name}.ts`),
    `const html = ${JSON.stringify(html)};\nexport default html;\n`,
    "utf8",
  );
  console.log(exportName);
}
