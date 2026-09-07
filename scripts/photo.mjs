// Makes the two files a recipe photo needs: the wide banner and the square thumbnail.
// Usage: node scripts/photo.mjs <recipe-id> <image file or URL>
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const { images } = JSON.parse(readFileSync(join(root, "config.json"), "utf8"));
const sips = (...args) => execFileSync("sips", args, { stdio: "pipe" });
const size = file => {
  const out = sips("-g", "pixelWidth", "-g", "pixelHeight", file).toString();
  return { width: +out.match(/pixelWidth: (\d+)/)[1], height: +out.match(/pixelHeight: (\d+)/)[1] };
};

// Scale so the image covers the target, then crop the centre to it.
function cover(source, target, width, height) {
  const { width: sourceWidth, height: sourceHeight } = size(source);
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  sips("-Z", String(Math.ceil(Math.max(sourceWidth, sourceHeight) * scale)), source, "--out", target);
  sips("-c", String(height), String(width), target);
  sips("-s", "format", "jpeg", "-s", "formatOptions", "60", target);
}

const [id, source] = process.argv.slice(2);
if (!id || !source) {
  console.error("usage: node scripts/photo.mjs <recipe-id> <image file or URL>");
  process.exit(1);
}

let input = source;
if (/^https?:/.test(source)) {
  input = join(mkdtempSync(join(tmpdir(), "photo-")), "source");
  execFileSync("curl", ["-sS", "-L", "-A", "cookbook/1.0 (personal cookbook)", "-o", input, source]);
}
if (!existsSync(input)) {
  console.error(`no such file: ${input}`);
  process.exit(1);
}

const hero = join(root, "images", `${id}.jpg`);
const thumb = join(root, "images", `${id}${images.thumbSuffix}.jpg`);
cover(input, hero, images.heroWidth, images.heroHeight);
cover(input, thumb, images.thumbSize, images.thumbSize);
console.log(`images/${id}.jpg and images/${id}${images.thumbSuffix}.jpg written`);
