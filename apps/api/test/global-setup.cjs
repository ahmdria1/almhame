const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const stateFile = path.join(__dirname, ".db-state.json");

module.exports = async function globalSetup() {
  let url = "";
  let containerId = "";
  if (process.env.USE_TESTCONTAINERS === "1") {
    process.env.TESTCONTAINERS_RYUK_DISABLED = "true";
    const { PostgreSqlContainer } = require("@testcontainers/postgresql");
    const container = await new PostgreSqlContainer("pgvector/pgvector:pg16")
      .withDatabase("elawyer_test")
      .withUsername("elawyer")
      .withPassword("elawyer")
      .start();
    url = container.getConnectionUri();
    containerId = container.getId();
  } else {
    url = process.env.TEST_DATABASE_URL || "postgresql://elawyer:elawyer@127.0.0.1:5432/elawyer_test";
  }
  execSync(`psql "${url}" -c "CREATE EXTENSION IF NOT EXISTS vector"`, {
    stdio: "inherit",
  });
  execSync("pnpm exec prisma migrate deploy", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
  fs.writeFileSync(stateFile, JSON.stringify({ url, containerId }));
};
