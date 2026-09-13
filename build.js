const fs = require("fs");
const path = require("path");
const { minify: terserMinify } = require("terser");
const { minify: htmlMinify } = require("html-minifier-terser");

const DIR = __dirname;
const DIST = path.join(DIR, "dist");

async function build() {
  const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");

  // Extract inline <script type="module"> block
  const scriptOpenTag = '<script type="module">';
  const scriptCloseTag = "</script>";
  const scriptStart = html.indexOf(scriptOpenTag);
  const scriptEnd = html.lastIndexOf(scriptCloseTag);

  if (scriptStart === -1 || scriptEnd === -1) {
    throw new Error('Could not find inline <script type="module"> block');
  }

  const beforeScript = html.slice(0, scriptStart);
  const afterScript = html.slice(scriptEnd + scriptCloseTag.length);
  const jsCode = html.slice(scriptStart + scriptOpenTag.length, scriptEnd);

  // Minify JS with terser
  console.log("Minifying JS...");
  const jsResult = await terserMinify(jsCode, {
    module: true,
    compress: {
      passes: 2,
      drop_console: false,
      dead_code: true,
      conditionals: true,
      evaluate: true,
    },
    mangle: {
      toplevel: true,
      properties: false,
    },
    format: {
      comments: false,
    },
  });

  if (jsResult.error) throw jsResult.error;

  // Reassemble HTML with minified JS
  const assembledHtml = beforeScript + scriptOpenTag + jsResult.code + scriptCloseTag + afterScript;

  // Minify HTML
  console.log("Minifying HTML...");
  const minifiedHtml = await htmlMinify(assembledHtml, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: false,
    collapseBooleanAttributes: true,
    removeAttributeQuotes: false,
  });

  // Create dist directory
  fs.mkdirSync(DIST, { recursive: true });

  // Write output
  fs.writeFileSync(path.join(DIST, "index.html"), minifiedHtml, "utf8");

  // Print size comparison
  const origSize = Buffer.byteLength(html, "utf8");
  const minSize = Buffer.byteLength(minifiedHtml, "utf8");

  console.log("\n--- Size Comparison ---");
  console.log(`HTML: ${(origSize / 1024).toFixed(1)}KB -> ${(minSize / 1024).toFixed(1)}KB (${((1 - minSize / origSize) * 100).toFixed(1)}% reduction)`);
  console.log(`\nOutput: dist/index.html`);
}

build().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
