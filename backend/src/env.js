import { fileURLToPath } from 'node:url';
const defaultFiles=['../../.env.local','../../.env.runtime.local'].map(path=>fileURLToPath(new URL(path,import.meta.url)));
export function loadLocalEnv(files=defaultFiles) {
  // Explicit shell/--env-file values must always win, especially the QA database.
  // Among file-only values, runtime.local takes precedence over .env.local.
  const explicit={...process.env};
  try {
    for(const path of [...files].reverse()) {
      try { process.loadEnvFile(path); }
      catch(error) { if(error.code !== 'ENOENT') throw error; }
    }
  }finally {
    Object.assign(process.env,explicit);
  }
}
