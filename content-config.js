// Set window.PORTFOLIO_API_ORIGIN before this script to use another API origin.
// Example for local development: window.PORTFOLIO_API_ORIGIN = 'http://localhost:3000';
window.PORTFOLIO_API_ORIGIN ??= (['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '3000')
  ? location.origin
  : 'https://jazfer-portfolio-admin.vercel.app';
