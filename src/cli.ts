#!/usr/bin/env node

import { spawn, exec } from "child_process";
import path from "path";

console.log("\n🚀 Starting Hilux WAF Engine & Dashboard...");

// Resolve the compiled server.js path alongside cli.js in dist/
const serverPath = path.join(__dirname, "server.js");

const serverProcess = spawn("node", [serverPath], {
  stdio: "inherit",
  env: {
    ...process.env,
    // We can inject environment variables specifically for the dash here if needed
  },
});

serverProcess.on("error", (err) => {
  console.error("Failed to start Hilux server:", err);
  process.exit(1);
});

// Give the server a few seconds to initialize its DB pool and bind the port
setTimeout(() => {
  const port = process.env.PORT || process.env.HILUX_PORT || 3000;
  const url = `http://localhost:${port}/hilux-dashboard/`;
  
  console.log(`\n=================================================`);
  console.log(`📡 Hilux Dashboard is live at:`);
  console.log(`   ${url}`);
  console.log(`=================================================\n`);
  
  const startCmd = process.platform === 'darwin' ? 'open'
                 : process.platform === 'win32' ? 'start'
                 : 'xdg-open';
                 
  // Auto-open browser
  exec(`${startCmd} ${url}`, (err) => {
     if (err) {
         console.log(`⚠️ Could not auto-open browser. Please manually navigate to ${url}`);
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
