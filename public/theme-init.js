// Set the theme before first paint so a dark page never flashes white. A file of its own
// (not an inline script) so the Content-Security-Policy can say script-src 'self'.
try {
  var t = localStorage.getItem('lunchboard-theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0a0a0a');
  }
} catch (e) {}
// A signed-in person gets the app, not the landing page: hide the page's pre-rendered copy of it until the app starts
// so it never flashes by.
try {
  if (localStorage.getItem('lunchboard-signed-in') === '1') document.documentElement.classList.add('signed-in');
} catch (e) {}
