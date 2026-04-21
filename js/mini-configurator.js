(function () {
  const root = document.getElementById('cfg-mini-configurator');
  if (!root) return;
  const openBtn = document.getElementById('cfg-open-btn');

  const i18n = {
    de: {
      messages: {
        remoteAutomotive: 'Remote + Automotive ist gesperrt: die meisten OEMs lassen das nicht zu.',
        automotiveRemote: 'Automotive + Remote ist gesperrt: bitte Hybrid oder Vor Ort wählen.',
        juniorProjectLead: 'Junior + Projektleiter ist gesperrt.',
        veteranDoors: 'Easter Egg aktiv: Veteran erzwingt Türen & Tore.',
        cpqWithoutVc: 'CPQ ohne VC funktioniert, aber der Consultant wird unrund.'
      },
      openLabel: 'Mini-Konfigurator öffnen',
      closeLabel: 'Mini-Konfigurator schließen',
      locale: 'de-DE'
    },
    en: {
      messages: {
        remoteAutomotive: "Remote + Automotive is locked: most OEMs don't allow this.",
        automotiveRemote: 'Automotive + Remote is locked: please choose hybrid or on-site.',
        juniorProjectLead: 'Junior + Project Lead is locked.',
        veteranDoors: 'Easter egg active: Veteran enforces Doors & Gates.',
        cpqWithoutVc: 'CPQ without VC works, but the consultant becomes unstable.'
      },
      openLabel: 'Open Mini Configurator',
      closeLabel: 'Close Mini Configurator',
      locale: 'en-GB'
    }
  };

  const els = {
    domainChecks: Array.from(root.querySelectorAll('input[name="cfg-domain"]')),
    level: document.getElementById('cfg-level'),
    industry: document.getElementById('cfg-industry'),
    role: document.getElementById('cfg-role'),
    location: document.getElementById('cfg-location'),
    humor: document.getElementById('cfg-humor'),
    coffee: document.getElementById('cfg-coffee'),
    score: document.getElementById('cfg-score'),
    meter: document.getElementById('cfg-meter'),
    rate: document.getElementById('cfg-rate'),
    messages: document.getElementById('cfg-messages'),
    reveal: document.getElementById('cfg-reveal'),
    reset: document.getElementById('cfg-reset')
  };

  const baseRateByLevel = {
    '': 950,
    Junior: 950,
    Senior: 1250,
    Lead: 1450,
    Veteran: 1600
  };

  const roleDelta = {
    '': 0,
    'Business Consultant': 80,
    'Technical Consultant': 70,
    'Product Owner': 120,
    Projektleiter: 140
  };

  function getLang() {
    return document.documentElement.lang === 'en' ? 'en' : 'de';
  }

  function t() {
    return i18n[getLang()];
  }

  function getDomains() {
    return els.domainChecks.filter((c) => c.checked).map((c) => c.value);
  }

  function formatRate(value) {
    return new Intl.NumberFormat(t().locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }

  function enforceConstraints() {
    const level = els.level.value;
    const industry = els.industry.value;
    const location = els.location.value;
    const role = els.role.value;

    const messages = [];

    const automotiveOption = els.industry.querySelector('option[value="Automotive"]');
    const remoteOption = els.location.querySelector('option[value="Remote"]');
    const projectLeadOption = els.role.querySelector('option[value="Projektleiter"]');
    const doorsOption = els.industry.querySelector('option[value="TuerenTore"]');

    if (automotiveOption) automotiveOption.disabled = false;
    if (remoteOption) remoteOption.disabled = false;
    if (projectLeadOption) projectLeadOption.disabled = false;
    if (doorsOption) doorsOption.disabled = false;

    if (location === 'Remote') {
      if (automotiveOption) automotiveOption.disabled = true;
      if (industry === 'Automotive') {
        els.industry.value = '';
      }
      messages.push({
        type: 'lock',
        text: t().messages.remoteAutomotive
      });
    }

    if (industry === 'Automotive') {
      if (remoteOption) remoteOption.disabled = true;
      if (location === 'Remote') {
        els.location.value = '';
      }
      messages.push({
        type: 'lock',
        text: t().messages.automotiveRemote
      });
    }

    if (level === 'Junior') {
      if (projectLeadOption) projectLeadOption.disabled = true;
      if (role === 'Projektleiter') {
        els.role.value = '';
      }
      messages.push({ type: 'lock', text: t().messages.juniorProjectLead });
    }

    if (level === 'Veteran') {
      if (doorsOption) doorsOption.disabled = false;
      if (els.industry.value !== 'TuerenTore') {
        els.industry.value = 'TuerenTore';
      }
      messages.push({ type: 'lock', text: t().messages.veteranDoors });
    }

    const domains = getDomains();
    if (domains.includes('SAP CPQ') && !domains.includes('SAP VC')) {
      messages.push({
        type: 'warn',
        text: t().messages.cpqWithoutVc
      });
    }

    return messages;
  }

  function computeRate(level, role) {
    let rate = (baseRateByLevel[level] || 950) + (roleDelta[role] || 0);
    if (level === 'Lead' || level === 'Veteran') {
      rate += 120;
    }
    return rate;
  }

  function computeScore(messages) {
    const domains = getDomains();
    const complete = [
      domains.length > 0,
      !!els.level.value,
      !!els.industry.value,
      !!els.role.value,
      !!els.location.value,
      !!els.humor.value,
      !!els.coffee.value
    ];

    const completedCount = complete.filter(Boolean).length;
    let score = Math.round((completedCount / 7) * 70);

    if (domains.includes('SAP VC')) score += 8;
    if (domains.includes('SAP CPQ')) score += 8;
    if (domains.includes('SAP VC') && domains.includes('SAP CPQ')) score += 4;

    if (
      els.level.value === 'Senior' ||
      els.level.value === 'Lead' ||
      els.level.value === 'Veteran'
    ) {
      score += 4;
    }
    if (els.role.value === 'Business Consultant') score += 4;
    if (
      els.location.value === 'Hybrid' ||
      els.location.value === 'Vor Ort (Umkreis Soest)'
    ) {
      score += 2;
    }

    const hasWarning = messages.some((m) => m.type === 'warn');
    if (hasWarning) score -= 6;

    if (score > 100) score = 100;
    if (score < 0) score = 0;
    return score;
  }

  function renderMessages(items) {
    els.messages.innerHTML = '';
    if (!items.length) {
      return;
    }

    items.forEach((m) => {
      const li = document.createElement('li');
      li.className = m.type === 'warn' ? 'cfg-warn' : 'cfg-lock';
      li.textContent = m.text;
      els.messages.appendChild(li);
    });
  }

  function update() {
    const messages = enforceConstraints();
    const score = computeScore(messages);
    const rate = computeRate(els.level.value, els.role.value);

    els.score.textContent = score + '%';
    els.meter.style.width = score + '%';
    els.rate.textContent = formatRate(rate);
    renderMessages(messages);

    if (score >= 75) {
      els.reveal.style.display = 'block';
    } else {
      els.reveal.style.display = 'none';
    }
  }

  function resetAll() {
    els.domainChecks.forEach((c) => {
      c.checked = false;
    });
    els.level.value = '';
    els.industry.value = '';
    els.role.value = '';
    els.location.value = '';
    els.humor.value = '';
    els.coffee.value = '';
    update();
  }

  [
    ...els.domainChecks,
    els.level,
    els.industry,
    els.role,
    els.location,
    els.humor,
    els.coffee
  ].forEach((el) => {
    el.addEventListener('change', update);
  });

  els.reset.addEventListener('click', resetAll);

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      const isCollapsed = root.classList.contains('cfg-collapsed');

      if (isCollapsed) {
        root.classList.remove('cfg-collapsed');
        root.setAttribute('aria-hidden', 'false');
        openBtn.setAttribute('aria-expanded', 'true');
        openBtn.textContent = t().closeLabel;
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        root.classList.add('cfg-collapsed');
        root.setAttribute('aria-hidden', 'true');
        openBtn.setAttribute('aria-expanded', 'false');
        openBtn.textContent = t().openLabel;
      }
    });
  }

  document.addEventListener('resume:lang-change', function () {
    if (!openBtn) {
      update();
      return;
    }

    const isOpen = !root.classList.contains('cfg-collapsed');
    openBtn.textContent = isOpen ? t().closeLabel : t().openLabel;
    update();
  });

  update();
})();
