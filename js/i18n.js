(function () {
  const supported = ['de', 'en'];
  const defaultLang = 'de';

  function getUrlLang() {
    const params = new URLSearchParams(window.location.search);
    const candidate = (params.get('lang') || '').toLowerCase();
    return supported.includes(candidate) ? candidate : null;
  }

  function updateUrl(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    history.replaceState({}, '', url);
  }

  function applyNodeTranslations(lang) {
    document.querySelectorAll('[data-de][data-en]').forEach((node) => {
      const value = lang === 'en' ? node.getAttribute('data-en') : node.getAttribute('data-de');
      node.textContent = value;
    });

    document.querySelectorAll('[data-aria-de][data-aria-en]').forEach((node) => {
      const ariaValue = lang === 'en' ? node.getAttribute('data-aria-en') : node.getAttribute('data-aria-de');
      node.setAttribute('aria-label', ariaValue);
    });

    document.querySelectorAll('[data-title-de][data-title-en]').forEach((node) => {
      const titleValue = lang === 'en' ? node.getAttribute('data-title-en') : node.getAttribute('data-title-de');
      if (node.tagName === 'TITLE') {
        document.title = titleValue;
      } else {
        node.textContent = titleValue;
      }
    });
  }

  function updateFlagState(lang) {
    document.querySelectorAll('[data-lang-toggle]').forEach((button) => {
      const isActive = button.getAttribute('data-lang-toggle') === lang;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function setLanguage(lang, updateAddressBar) {
    document.documentElement.lang = lang;
    applyNodeTranslations(lang);
    updateFlagState(lang);

    if (updateAddressBar) {
      updateUrl(lang);
    }

    document.dispatchEvent(new CustomEvent('resume:lang-change', { detail: { lang } }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const initialLang = getUrlLang() || defaultLang;
    setLanguage(initialLang, false);

    document.querySelectorAll('[data-lang-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextLang = button.getAttribute('data-lang-toggle');
        if (!supported.includes(nextLang)) return;
        setLanguage(nextLang, true);
      });
    });
  });
})();
