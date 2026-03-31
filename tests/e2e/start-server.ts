import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { onboard } from "../../cli/src/commands/onboard.ts";
import { runCommand } from "../../cli/src/commands/run.ts";
import { resolveDefaultConfigPath } from "../../cli/src/config/home.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const requestedDataDir = process.env.PAPERCLIP_E2E_DATA_DIR ?? "tmp/playwright-e2e";
const dataDir = path.resolve(projectRoot, requestedDataDir);
const relativeDataDir = path.relative(projectRoot, dataDir);

if (relativeDataDir.startsWith("..") || path.isAbsolute(relativeDataDir)) {
  throw new Error(`Refusing to clear data dir outside the workspace: ${dataDir}`);
}

process.env.PAPERCLIP_HOME = dataDir;
process.env.PAPERCLIP_INSTANCE_ID = process.env.PAPERCLIP_E2E_INSTANCE_ID ?? "default";
process.env.HOST = process.env.HOST ?? "127.0.0.1";
process.env.PORT = process.env.PAPERCLIP_E2E_PORT ?? "3110";
process.env.PAPERCLIP_OPEN_ON_LISTEN = "false";

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const configPath = resolveDefaultConfigPath(process.env.PAPERCLIP_INSTANCE_ID);

await onboard({ config: configPath, yes: true, invokedByRun: true });
await runCommand({
  config: configPath,
  instance: process.env.PAPERCLIP_INSTANCE_ID,
  repair: true,
  yes: true,
});
