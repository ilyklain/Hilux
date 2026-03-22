#!/usr/bin/env node

import { spawn, exec } from "child_process";
import path from "path";

console.log("Starting Hilux WAF & Dashboard...");

const serverPath = path.join(__dirname, "server.js");

const serverProcess = spawn("node", [serverPath], {
  stdio: "inherit",
  env: {
    ...process.env,
  },
});

serverProcess.on("error", (err) => {
  console.error("Failed to start Hilux server:", err);
  process.exit(1);
});

setTimeout(() => {
  const port = process.env.PORT || process.env.HILUX_PORT || 3000;
  const url = `http://localhost:${port}/hilux-dashboard/`;

  console.log(`———————————————————————————————`);
  console.log(`   Hilux Dashboard is live at:`);
  console.log(`   ${url}`);
  console.log(`———————————————————————————————\n`);

  const startCmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
      : 'xdg-open';

  exec(`${startCmd} ${url}`, (err) => {
    if (err) {
      console.log(`We couldn't open the browser. Please manually navigate to ${url} or press Shift + Left Click on the URL above`);
    }
  });

}, 2500);

process.on("SIGINT", () => {
  serverProcess.kill("SIGINT");
  process.exit(0);
});
process.on("SIGTERM", () => {
  serverProcess.kill("SIGTERM");
  process.exit(0);
});
