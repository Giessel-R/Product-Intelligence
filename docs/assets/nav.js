// Auto-highlights the active sidebar item based on the current page.
// Each page's <script> tag carries: data-page="[page-id]"
// Each sidebar <a> tag carries: data-page="[page-id]"
(function () {
  const script = document.currentScript;
  const pageId = script && script.getAttribute('data-page');
  if (!pageId) return;
  const links = document.querySelectorAll('.sidebar-item[data-page]');
  links.forEach(function (link) {
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    }
  });
})();
