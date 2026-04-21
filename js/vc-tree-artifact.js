(function () {
  const root = document.getElementById('vc-tree-artifact');
  if (!root) return;

  const openBtn = document.getElementById('tree-open-btn');
  const caption = document.getElementById('tree-caption');
  const nodes = Array.from(root.querySelectorAll('.tree-node'));
  const edges = Array.from(root.querySelectorAll('.tree-edge'));

  function clearHighlight() {
    nodes.forEach((node) => node.classList.remove('node-active'));
    edges.forEach((edge) => edge.classList.remove('edge-active'));
  }

  function setCaption(nodeName) {
    if (!caption) return;

    const labels = {
      product: 'Produktklasse -> Merkmale -> Werte',
      feature: 'Merkmal Standort -> Werte Remote / Vor Ort',
      role: 'Merkmal Rolle -> Werte Junior / Projektleiter',
      'value-remote': 'Wert Remote -> Constraint-Pruefung',
      'value-onsite': 'Wert Vor Ort ohne Constraint-Sperre',
      'value-junior': 'Wert Junior -> Constraint mit Projektleiter',
      'value-lead': 'Wert Projektleiter -> Constraint mit Junior',
      constraint: 'Constraint-Knoten zeigt gesperrte Kombinationen'
    };

    caption.textContent = `Aktiver Pfad: ${labels[nodeName] || 'kein Pfad'}.`;
  }

  function activateNode(node) {
    clearHighlight();

    node.classList.add('node-active');
    const edgeIds = (node.dataset.edges || '').split(' ').filter(Boolean);

    edgeIds.forEach((id) => {
      const edge = document.getElementById(id);
      if (edge) edge.classList.add('edge-active');
    });

    setCaption(node.dataset.node || '');
  }

  nodes.forEach((node) => {
    node.addEventListener('click', () => activateNode(node));
    node.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateNode(node);
      }
    });
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `Pfad fuer ${node.dataset.node || 'Knoten'} hervorheben`);
  });

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      const isCollapsed = root.classList.contains('tree-collapsed');

      if (isCollapsed) {
        root.classList.remove('tree-collapsed');
        root.setAttribute('aria-hidden', 'false');
        openBtn.setAttribute('aria-expanded', 'true');
        openBtn.textContent = 'Merkmalsbaum schließen';
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        root.classList.add('tree-collapsed');
        root.setAttribute('aria-hidden', 'true');
        openBtn.setAttribute('aria-expanded', 'false');
        openBtn.textContent = 'Merkmalsbaum öffnen';
      }
    });
  }
})();
