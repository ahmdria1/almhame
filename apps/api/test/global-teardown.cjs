const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = async function globalTeardown() {
  const stateFile = path.join(__dirname, ".db-state.json");
  if (!fs.existsSync(stateFile)) return;
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  if (state.containerId) {
    try {
      execSync(`docker rm -f ${state.containerId}`, { stdio: "ignore" });
    } catch {
      /* already stopped */
    }
  }
};
