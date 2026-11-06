(() => {
  const origin = window.PORTFOLIO_API_ORIGIN;
  if (!origin) return;

  function recordView() {
    if (document.prerendering || document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', recordView);
    document.removeEventListener('prerenderingchange', recordView);

    fetch(new URL('/api/visits', origin), {
      method: 'POST',
      mode: 'no-cors',
      credentials: 'omit',
      keepalive: true,
      referrerPolicy: 'strict-origin'
    }).catch(() => {});
  }

  document.addEventListener('visibilitychange', recordView);
  document.addEventListener('prerenderingchange', recordView);
  recordView();
})();
