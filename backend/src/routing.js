const capturedPath = /^(?:(?:admin\/)?(?:content|visits)|auth\/(?:sign-in\/social|callback\/google|get-session|sign-out|error))$/;
export function rewriteApiUrl(rawUrl) {
  const url=new URL(rawUrl,'http://internal.invalid');
  const captures=url.searchParams.getAll('__portfolio_route');
  if(captures.length===0) {
    return capturedPath.test(url.pathname.slice('/api/'.length)) && url.pathname.startsWith('/api/') ? url.pathname+url.search : null;
  }
  if(captures.length!==1 || !capturedPath.test(captures[0])) return null;
  url.searchParams.delete('__portfolio_route');
  return '/api/'+captures[0]+url.search;
}
