// Set the theme before first paint so a dark page never flashes white. A file of its own
// (not an inline script) so the Content-Security-Policy can say script-src 'self'.
try {
  var t = localStorage.getItem('lunchboard-theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0a0a0a');
  }
} catch (e) {}
