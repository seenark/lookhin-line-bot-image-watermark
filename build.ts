Bun.build({
    entrypoints: ["src/index.ts"],
    sourcemap: true,
    outdir: "./dist",
    format: "esm",
    minify: true,
    target: "bun",
});
