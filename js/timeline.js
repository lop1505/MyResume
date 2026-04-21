(function () {
  'use strict';

  /* ===================================================================
   *  DATENMODELL — hier pflegen!
   *  Neuer Job:     Objekt zu roles[] hinzufügen (to: null = "heute")
   *  Neues Projekt:  Objekt zu projects[] hinzufügen
   *  Zeitrahmen:     start / end anpassen
   * =================================================================== */
  var timeline = {
    start: '2016-01',
    end:   '2026-06',
    roles: [
      { company: 'Wilo Group', title: 'Sr. Consultant VC/CPQ', titleEn: 'Sr. Consultant VC/CPQ', location: 'Dortmund', from: '2021-12', to: null },
      { company: 'Teckentrup', title: 'Leitung LO-VC / ETO',  titleEn: 'Head of LO-VC / ETO',   location: 'Verl',     from: '2017-06', to: '2021-12' },
      { company: 'Teckentrup', title: 'Teamleitung LO-VC / PDM', titleEn: 'Team Lead LO-VC / PDM', location: 'Verl',     from: '2016-01', to: '2017-06' }
    ],
    projects: [
      { name: 'SiBoost 2.0',          nameEn: 'SiBoost 2.0',             from: '2025-04', to: '2026-04', desc: 'Work-Package-Owner Interfaces & Data Sources, Price and Product Comparison in SAP CPQ', descEn: 'Work package owner for Interfaces & Data Sources and Price and Product Comparison in SAP CPQ', company: 'Wilo' },
      { name: 'Spaix/VSX CPQ 2.0',    nameEn: 'Spaix/VSX CPQ 2.0',      from: '2025-04', to: '2026-04', desc: 'Integration externer Konfiguratoren (ETO/CTO/CTO+/KMAT/MSO), Workshops DE/FR',           descEn: 'Integration of external configurators (ETO/CTO/CTO+/KMAT/MSO), workshops DE/FR',              company: 'Wilo' },
      { name: 'VC-Analyse & AVC',      nameEn: 'VC Analysis & AVC',       from: '2021-12', to: '2025-03', desc: 'Analyse und Weiterentwicklung bestehender VC-Modelle, Upgrade auf neueste EHP-Versionen', descEn: 'Analysis and enhancement of VC models for Advanced Variant Configuration, EHP upgrades',       company: 'Wilo' },
      { name: 'CPQ Encoway',           nameEn: 'CPQ Encoway',             from: '2021-01', to: '2021-12', desc: 'Konfigurationslogik für den Übergang in eine CPQ-gestützte Angebotswelt',                 descEn: 'Configuration logic for the transition to a CPQ-driven quoting landscape',                     company: 'Teckentrup' },
      { name: 'Agilität LO-VC',       nameEn: 'Agile in LO-VC',          from: '2020-04', to: '2020-12', desc: 'Etablierung agiler Arbeitsweisen zur beschleunigten Umsetzung',                            descEn: 'Establishment of agile ways of working to accelerate delivery',                                company: 'Teckentrup' },
      { name: 'Preispolitik ETO',      nameEn: 'ETO Pricing Policy',      from: '2020-04', to: '2020-12', desc: 'Strukturierung von Preislogiken und Harmonisierung der Regeln',                            descEn: 'Structuring pricing logic and harmonizing rules for complex variant quotations',                company: 'Teckentrup' },
      { name: 'Stammdaten PO',         nameEn: 'Master Data PO',          from: '2019-04', to: '2019-12', desc: 'Bereinigung von Stücklisten und Arbeitsplänen als Basis für E2E-Prozesse',                 descEn: 'Cleanup of BOMs and routings as a foundation for stable end-to-end processes',                  company: 'Teckentrup' }
    ]
  };

  /* ---- helpers ---- */
  function parseMonth(s) { if (!s) return null; var p = s.split('-'); return +p[0] * 12 + +p[1]; }
  var S = parseMonth(timeline.start), E = parseMonth(timeline.end), SPAN = E - S;
  function pct(s) { var m = s ? parseMonth(s) : E; return ((m - S) / SPAN) * 100; }
  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'de'; }
  function mk(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  /* ---- host ---- */
  var host = document.getElementById('tl-host');
  if (!host) return;

  /* ---- tooltip ---- */
  var tip = mk('div', 'tl-tooltip');
  document.body.appendChild(tip);

  function showTip(ev, html) {
    tip.innerHTML = html;
    tip.classList.add('tl-tooltip-show');
    var r = ev.currentTarget.getBoundingClientRect();
    tip.style.left = (r.left + r.width / 2) + 'px';
    tip.style.top  = (r.top - 6) + 'px';
    tip.style.transform = 'translate(-50%, -100%)';
  }
  function hideTip() { tip.classList.remove('tl-tooltip-show'); }

  /* ---- year ticks ---- */
  for (var y = 2016; y <= 2026; y += 2) {
    var tick = mk('div', 'tl-tick');
    tick.style.left = pct(y + '-01') + '%';
    var lbl = mk('span', 'tl-tick-label');
    lbl.textContent = y;
    tick.appendChild(lbl);
    host.appendChild(tick);
  }

  /* ---- "heute" dot ---- */
  var heute = mk('div', 'tl-heute');
  heute.style.left = pct(null) + '%';
  var hLbl = mk('span', 'tl-heute-label');
  hLbl.setAttribute('data-de', 'heute');
  hLbl.setAttribute('data-en', 'present');
  hLbl.textContent = lang() === 'en' ? 'present' : 'heute';
  heute.appendChild(hLbl);
  host.appendChild(heute);

  /* ---- role bands (above axis) ---- */
  timeline.roles.forEach(function (role) {
    var band = mk('div', 'tl-role ' + (role.company === 'Wilo Group' ? 'tl-role-wilo' : 'tl-role-teckentrup'));
    band.style.left  = pct(role.from) + '%';
    band.style.width = (pct(role.to) - pct(role.from)) + '%';

    var label = mk('span', 'tl-role-label');
    label.setAttribute('data-de', role.title);
    label.setAttribute('data-en', role.titleEn);
    label.textContent = lang() === 'en' ? role.titleEn : role.title;
    band.appendChild(label);

    var sub = mk('span', 'tl-role-sub');
    sub.textContent = role.company;
    band.appendChild(sub);

    band.setAttribute('data-company', role.company);

    // Hover: highlight matching projects
    band.addEventListener('mouseenter', function () {
      host.classList.add('tl-role-hover');
      pipEls.forEach(function (p) {
        if (p.data.company.indexOf(role.company.split(' ')[0]) !== -1) {
          p.el.classList.add('tl-pip-active');
        } else {
          p.el.classList.add('tl-pip-dim');
        }
      });
    });
    band.addEventListener('mouseleave', function () {
      host.classList.remove('tl-role-hover');
      pipEls.forEach(function (p) { p.el.classList.remove('tl-pip-active', 'tl-pip-dim'); });
    });

    host.appendChild(band);
  });

  /* ---- project pips (below axis) ---- */
  var pipEls = [];

  // Detect row for overlapping projects
  var rows = []; // each entry: { from, to, row }
  function findRow(from, to) {
    for (var r = 0; r <= 2; r++) {
      var conflict = rows.some(function (x) { return x.row === r && !(to <= x.from || from >= x.to); });
      if (!conflict) return r;
    }
    return 0;
  }

  // Sort by start date so row assignment is stable
  var sorted = timeline.projects.slice().sort(function (a, b) { return parseMonth(a.from) - parseMonth(b.from); });
  var rowMap = {};
  sorted.forEach(function (proj, i) {
    var f = parseMonth(proj.from), t = parseMonth(proj.to);
    var row = findRow(f, t);
    rows.push({ from: f, to: t, row: row });
    rowMap[proj.name] = row;
  });

  timeline.projects.forEach(function (proj, idx) {
    var pip = mk('div', 'tl-pip');
    pip.style.left  = pct(proj.from) + '%';
    pip.style.width = Math.max((pct(proj.to) - pct(proj.from)), 1.8) + '%';
    var row = rowMap[proj.name] || 0;
    if (row > 0) pip.classList.add('tl-row-' + row);

    var pipLabel = mk('span', 'tl-pip-label');
    pipLabel.setAttribute('data-de', proj.name);
    pipLabel.setAttribute('data-en', proj.nameEn);
    pipLabel.textContent = lang() === 'en' ? proj.nameEn : proj.name;
    pip.appendChild(pipLabel);

    pip.setAttribute('data-company', proj.company);

    // Tooltip on hover
    pip.addEventListener('mouseenter', function (ev) {
      var l = lang();
      var n = l === 'en' ? proj.nameEn : proj.name;
      var d = l === 'en' ? proj.descEn : proj.desc;
      var t = proj.from.split('-').reverse().join('/') + ' – ' + proj.to.split('-').reverse().join('/');
      showTip(ev, '<strong>' + n + '</strong><br><small>' + t + '</small><br>' + d);
    });
    pip.addEventListener('mouseleave', hideTip);

    host.appendChild(pip);
    pipEls.push({ el: pip, data: proj, idx: idx });
  });

  /* ---- i18n ---- */
  document.addEventListener('resume:lang-change', function () {
    hLbl.textContent = lang() === 'en' ? 'present' : 'heute';
  });

})();

