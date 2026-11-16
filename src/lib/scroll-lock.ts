// A dialog locks the page's scrolling (and its clicks) while it is open, and gives them back when it closes. If the
// dialog is torn down some other way (the page behind it changes, someone is signed out under it), the lock can stay
// and the page neither scrolls nor takes a tap. When no dialog is open, give both back.
export function releaseStaleScrollLock() {
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
  const body = document.body;
  body.removeAttribute('data-scroll-locked');
  for (const prop of ['overflow', 'pointer-events', 'padding-right', 'margin-right', 'position', 'top', 'left', 'right', 'width']) body.style.removeProperty(prop);
  document.documentElement.style.removeProperty('overflow');
}
