import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const standaloneServer = join(process.cwd(), ".next", "standalone", "server.js");
const source = readFileSync(standaloneServer, "utf8");

if (source.includes("attachRealtimeVoiceBridge")) {
  process.exit(0);
}

const hook = `
const http = require('http')
const { attachRealtimeVoiceBridge } = require('./realtime-voice-bridge.cjs')
const originalCreateServer = http.createServer
http.createServer = function patchedCreateServer(...args) {
  const server = originalCreateServer.apply(this, args)
  attachRealtimeVoiceBridge(server)
  return server
}
`;

const marker = "require('next')\n";
if (!source.includes(marker)) {
  throw new Error("Could not find Next standalone server marker for realtime bridge patch.");
}

writeFileSync(standaloneServer, source.replace(marker, `${hook}\n${marker}`));
