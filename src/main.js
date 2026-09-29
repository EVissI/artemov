/* Точка входа сайта. Контент: window.AA_CONTENT (content.js) или бэкенд, если задан AA_CONFIG.contentEndpoint. */
(function () {
  var cfg = window.AA_CONFIG || {};
  // фавикон «AA» рисуется шрифтом UnifrakturCook, когда он загрузится
  function favicon() {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
      x.fillStyle = '#0c0a09'; x.fillRect(0, 0, 64, 64);
      x.fillStyle = '#e3a596'; x.font = '700 40px UnifrakturCook, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('AA', 32, 36);
      x.fillStyle = '#c4141e'; x.beginPath(); x.arc(54, 10, 5, 0, 7); x.fill();
      var l = document.querySelector('link[rel="icon"]') || document.createElement('link');
      l.rel = 'icon'; l.href = c.toDataURL('image/png'); document.head.appendChild(l);
    } catch (e) {}
  }
  if (document.fonts && document.fonts.load) document.fonts.load('700 40px UnifrakturCook').then(favicon, favicon); else favicon();

  window.AA.api.loadContent({ endpoint: cfg.contentEndpoint, fallback: window.AA_CONTENT }).then(function (content) {
    if (content && content.site) {
      document.title = content.site.title || document.title;
      var d = document.querySelector('meta[name="description"]'); if (d && content.site.description) d.setAttribute('content', content.site.description);
    }
    var root = ReactDOM.createRoot(document.getElementById('root'));
    // документы по персональным данным - отдельные страницы на той же сборке
    var doc = (location.pathname.match(/(?:^|\/)(privacy|consent)(?:\.html)?\/?$/) || [])[1]; // /privacy на сервере, .../privacy.html на GitHub Pages
    if (doc) {
      var L = (content && content.legal) || {};
      document.title = (doc === 'privacy' ? L.policyTitle : L.consentTitle) || document.title;
      root.render(React.createElement(window.AA.LegalPage, { content: content, kind: doc }));
      return;
    }
    root.render(React.createElement(window.AA.Landing, {
      content: content,
      onSubmitLead: function (v) { return window.AA.api.submitLead(v, { endpoint: cfg.leadEndpoint }); }
    }));
  });
})();
