import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8'};
const rootFiles=new Set(['index.html','content.js','content-config.js','visits.js','motion.js','style.css','Jazfer_Licaros.pdf','ads.txt']);
export function createStaticHandler(root,publicRoot) {
  return async (request,response) => {
    if(!['GET','HEAD'].includes(request.method)) {response.writeHead(405,{'allow':'GET, HEAD'}).end();return;}
    let path;
    try{path=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{response.writeHead(400).end();return;}
    if(path==='/admin') {response.writeHead(308,{location:'/admin/'}).end();return;}
    let base,relative;
    if(path==='/admin/' || path.startsWith('/admin/')) {base=publicRoot;relative=path==='/admin/'?'admin/index.html':path.slice(1);}
    else if(path.startsWith('/images/')) {base=resolve(root,'images');relative=path.slice('/images/'.length);}
    else {base=root;relative=path==='/'?'index.html':path.slice(1);if(!rootFiles.has(relative)){response.writeHead(404).end();return;}}
    if(relative.split('/').some(part=>part.startsWith('.') || !part) || relative.includes('\\')) {response.writeHead(404).end();return;}
    try {
      const file=await realpath(resolve(base,relative)),allowed=await realpath(base);
      if(!file.startsWith(allowed+sep)) {response.writeHead(404).end();return;}
      const bytes=await readFile(file);
      response.writeHead(200,{'content-type':types[extname(file)] || 'application/octet-stream','x-content-type-options':'nosniff',...(path.startsWith('/admin') ? {'cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'"} : {})});
      response.end(request.method==='HEAD'?undefined:bytes);
    }catch{response.writeHead(404).end();}
  };
}
