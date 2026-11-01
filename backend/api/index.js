import {toNodeHandler} from 'better-auth/node';
import {runtimeHandler} from '../src/runtime.js';
import {rewriteApiUrl} from '../src/routing.js';
const handle=toNodeHandler(runtimeHandler);
export default async function api(request,response) {
  const url=rewriteApiUrl(request.url);
  if(!url) {
    response.writeHead(404,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({error:'Not found'}));
    return;
  }
  // Vercel's rewrite targets one concrete function. Restore the captured path,
  // retaining OAuth state/code query values for Better Auth's Node adapter.
  request.url=url;
  return handle(request,response);
}
export const config = { api: { bodyParser: false } };
