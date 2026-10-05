/* Точка входа сайта. Контент: window.AA_CONTENT (content.js) или бэкенд, если задан AA_CONFIG.contentEndpoint. */
(function () {
  var cfg = window.AA_CONFIG || {};
  // фавикон под дизайн SH2: светлая монограмма «AA» (UnifrakturCook, когда шрифт загрузится) с мягким свечением
  // на почти чёрном и рваная тёмно-красная черта снизу, как под заголовками секций
  function favicon() {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
      x.fillStyle = '#0a0908'; x.fillRect(0, 0, 64, 64);
      x.font = '700 40px UnifrakturCook, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = 'rgba(255,255,255,.55)'; x.shadowBlur = 6; x.fillStyle = '#f2f2f2'; x.fillText('AA', 32, 30);
      x.shadowBlur = 0; x.fillStyle = '#b3261e'; x.beginPath();
      var top = [[8, 53], [18, 51], [27, 53], [38, 50], [47, 52], [56, 51]], bot = [[56, 55], [47, 57], [37, 55], [28, 57], [18, 55], [8, 56]];
      top.concat(bot).forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); x.fill();
      var l = document.querySelector('link[rel="icon"]') || document.createElement('link');
      l.rel = 'icon'; l.href = c.toDataURL('image/png'); document.head.appendChild(l);
    } catch (e) {}
  }
  if (document.fonts && document.fonts.load) document.fonts.load('700 40px UnifrakturCook').then(favicon, favicon); else favicon();

  // язык страницы: сервер задаёт AA_CONFIG.lang, иначе - по адресу (/en...)
  var lang = cfg.lang || (/^\/en(\/|$)/.test(location.pathname) ? 'en' : 'ru');
  window.AA.api.loadContent({ endpoint: cfg.contentEndpoint, fallback: window.AA_CONTENT }).then(function (raw) {
    if (lang !== 'ru' && !window.AA.langOn(raw, lang)) lang = 'ru'; // язык выключен в админке - русская версия
    var content = window.AA.localize(raw, lang);
    document.documentElement.lang = lang;
    if (content && content.site) {
      document.title = content.site.title || document.title;
      var d = document.querySelector('meta[name="description"]'); if (d && content.site.description) d.setAttribute('content', content.site.description);
    }
    var root = ReactDOM.createRoot(document.getElementById('root'));
    // документы по персональным данным - отдельные страницы на той же сборке
    var doc = (location.pathname.match(/^(?:\/en)?\/(privacy|consent)\/?$/) || [])[1]; // /privacy, /en/privacy
    if (doc) {
      var L = (content && content.legal) || {};
      document.title = (doc === 'privacy' ? L.policyTitle : L.consentTitle) || document.title;
      root.render(React.createElement(window.AA.LegalPage, { content: content, kind: doc, lang: lang }));
      return;
    }
    root.render(React.createElement(window.AA.Landing, {
      content: content,
      lang: lang,
      onSubmitLead: function (v) { return window.AA.api.submitLead(v, { endpoint: cfg.leadEndpoint }); }
    }));
  });
})();
