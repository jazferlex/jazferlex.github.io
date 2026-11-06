import { isOwner } from './auth.js';
import { publicContent, saveSchema } from './schema.js';
import { classifyVisit } from './visits.js';
const MAX_BODY = 128 * 1024;
function json(body, status=200, headers={}) {
  return Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
}
async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new RangeError('body');
  let length=0; const parts=[];
  if (request.body) {
    const reader=request.body.getReader();
    try {
      for (;;) { const {done,value}=await reader.read(); if(done) break; length+=value.byteLength; if(length>MAX_BODY) {await reader.cancel(); throw new RangeError('body');} parts.push(value); }
    } finally { reader.releaseLock(); }
  }
  const bytes=new Uint8Array(length); let offset=0; for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function createApp({config,auth,repository,visits}) {
  return async function handle(request) {
    const path=new URL(request.url).pathname;
    try {
      if(path==='/api/content') {
        const cors={'vary':'Origin'};
        if(request.headers.get('origin')===config.publicOrigin) cors['access-control-allow-origin']=config.publicOrigin;
        if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{...cors,'access-control-allow-methods':'GET','cache-control':'no-store'}});
        if(request.method!=='GET') return json({error:'Method not allowed'},405,{'allow':'GET',...cors});
        const current=await repository.read();
        return current ? json({...current,content:publicContent(current.content)},200,cors) : json({error:'Content is not initialized'},503,cors);
      }
      if(path==='/api/visits') {
        if(request.method!=='POST') return json({error:'Method not allowed'},405,{'allow':'POST'});
        if(request.headers.get('origin')!==config.publicOrigin) return json({error:'Untrusted origin'},403);
        if(request.body || Number(request.headers.get('content-length'))>0) return json({error:'Unexpected request body'},400);
        await visits.record(classifyVisit(request.headers));
        return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
      }
      if(path.startsWith('/api/auth/')) {
        if(!['/api/auth/sign-in/social','/api/auth/callback/google','/api/auth/get-session','/api/auth/sign-out','/api/auth/error'].includes(path)) return json({error:'Not found'},404);
        if(!auth) return json({error:'Google sign-in is not configured'},503);
        if(!['GET','HEAD','OPTIONS'].includes(request.method) && path!=='/api/auth/callback/google' && request.headers.get('origin')!==config.authOrigin) return json({error:'Untrusted origin'},403);
        const response=await auth.handler(request);
        response.headers.set('cache-control','no-store');
        response.headers.set('x-content-type-options','nosniff');
        return response;
      }
      if(path!=='/api/admin/content' && path!=='/api/admin/visits') return json({error:'Not found'},404);
      const methods = path==='/api/admin/visits' ? ['GET'] : ['GET','PUT'];
      if(!methods.includes(request.method)) return json({error:'Method not allowed'},405,{'allow':methods.join(', ')});
      if(request.method==='PUT' && request.headers.get('origin')!==config.authOrigin) return json({error:'Untrusted origin'},403);
      if(!auth) return json({error:'Google sign-in is not configured'},503);
      const session=await auth.api.getSession({headers:request.headers,query:{disableCookieCache:true}});
      if(!session?.user) return json({error:'Sign in required'},401);
      if(!isOwner(session.user)) return json({error:'Access denied'},403);
      if(path==='/api/admin/visits') return json(await visits.summary());
      if(request.method==='GET') {
        const current=await repository.read();
        return current ? json(current) : json({error:'Content is not initialized'},503);
      }
      if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return json({error:'Use application/json'},415);
      let body;
      try { body=await readBody(request); } catch(error) {return json({error:error instanceof RangeError ? 'Content exceeds 128 KB' : 'Invalid JSON'},error instanceof RangeError ? 413 : 400);}
      const parsed=saveSchema.safeParse(body);
      if(!parsed.success) return json({error:'Content validation failed',issues:parsed.error.issues.map(issue=>({path:issue.path,message:issue.message}))},400);
      const saved=await repository.save(parsed.data.content,parsed.data.revision);
      return saved ? json(saved) : json({error:'Content changed since you loaded it. Reload before saving.'},409);
    } catch {
      // Never log request bodies, headers, SQL, connection strings or error objects.
      console.error('Portfolio API dependency failed');
      return json({error:'Service temporarily unavailable'},503);
    }
  };
}
