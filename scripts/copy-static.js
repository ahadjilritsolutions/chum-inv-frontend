// Running the Next standalone server LOCALLY needs .next/static and public/
// copied in beside it — `next build` does not do that, and the Dockerfile does
// it with two COPY lines. Without this the server boots happily and then 404s
// every CSS and JS chunk, which looks like a broken app rather than a missing
// copy step.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const pairs = [
  [".next/static", ".next/standalone/.next/static"],
  ["public", ".next/standalone/public"],
];
for (const [from, to] of pairs) {
  const src = path.join(root, from);
  if (!fs.existsSync(src)) continue;
  fs.rmSync(path.join(root, to), { recursive: true, force: true });
  fs.cpSync(src, path.join(root, to), { recursive: true });
}
console.log("static assets copied into .next/standalone");
