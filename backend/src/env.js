import { fileURLToPath } from 'node:url';
export function loadLocalEnv() {
  for(const path of ['../../.env.local','../../.env.runtime.local']) {
    try { process.loadEnvFile(fileURLToPath(new URL(path,import.meta.url))); }
    catch(error) { if(error.code !== 'ENOENT') throw error; }
  }
}
