const { spawnSync } = require("node:child_process");

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const port = process.env.PORT || "3000";

// Ensure DB schema is up to date in production
run("npx", ["prisma", "migrate", "deploy"]);

// Start Next.js on the platform-provided port
run("npx", ["next", "start", "-H", "0.0.0.0", "-p", port]);
