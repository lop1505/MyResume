(function () {
  const root = document.getElementById('vc-tree-artifact');
  if (!root) return;

  const model = {
    merkmale: [
      { id: 'standort', label: 'Standort', werte: ['Remote', 'Hybrid', 'Vor Ort'] },
      { id: 'branche', label: 'Branche', werte: ['Maschinenbau', 'Pumpenbau', 'Automotive', 'Türen & Tore'] },
      { id: 'level', label: 'Level', werte: ['Junior', 'Senior', 'Lead', 'Veteran'] },
      { id: 'rolle', label: 'Rolle', werte: ['Business Consultant', 'Product Owner', 'Projektleiter'] }
    ],
    constraints: [
      {
        id: 'C1',
        label: 'C1: Remote + Automotive -> verboten',
        blocks: [['standort:Remote', 'branche:Automotive']]
      },
      {
        id: 'C2',
        label: 'C2: Junior + Projektleiter -> verboten',
        blocks: [['level:Junior', 'rolle:Projektleiter']]
      },
      {
        id: 'C3',
        label: 'C3: Veteran erzwingt Branche = Türen & Tore',
        forces: [{ if: 'level:Veteran', then: 'branche:Türen & Tore' }]
      },
      {
        id: 'C4',
        label: 'C4: Lead/Veteran +120€ Inferenz',
        infers: [{ if: 'level:Lead', effect: '+120€' }, { if: 'level:Veteran', effect: '+120€' }]
      }
    ]
  };

  const openBtn = document.getElementById('tree-open-btn');
  const host = document.getElementById('vc-tree-svg-host');
  const resetBtn = document.getElementById('tree-reset');
  const caption = document.getElementById('tree-caption');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!host) return;

  const nodeViews = new Map();
  const constraintViews = new Map();
  const linkViews = [];
  const selectedValues = new Set();

  const layout = {
    width: 1280,
    marginTop: 58,
    marginBottom: 50,
    colMerkmal: 86,
    colWert: 378,
    colConstraint: 868,
    merkmalHeight: 38,
    valueHeight: 30,
    valueGap: 7,
    merkmalGap: 28,
    constraintWidth: 320,
    constraintHeight: 108,
    constraintGap: 16
  };

  function normalizeKey(input) {
    return input
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  function valueKey(valueId) {
    return `value:${valueId}`;
  }

  function constraintKey(constraintId) {
    return `constraint:${constraintId}`;
  }

  function createSvgElement(name, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      el.setAttribute(key, String(value));
    });
    return el;
  }

  function wrapTextLines(label, maxChars) {
    const words = label.split(' ');
    const lines = [];
    let current = '';

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });

    if (current) lines.push(current);
    return lines;
  }

  function buildLayoutData() {
    const merkmale = [];
    let currentY = layout.marginTop;

    model.merkmale.forEach((merkmal) => {
      const valueCount = merkmal.werte.length;
      const valueBlockHeight =
        valueCount * layout.valueHeight + (valueCount - 1) * layout.valueGap;
      const blockHeight = Math.max(layout.merkmalHeight, valueBlockHeight);
      const merkmalY = currentY + blockHeight / 2;

      const values = merkmal.werte.map((wert, index) => {
        const valueY = currentY + index * (layout.valueHeight + layout.valueGap) + layout.valueHeight / 2;
        const valueId = `${merkmal.id}:${wert}`;
        return {
          id: valueId,
          label: wert,
          merkmalId: merkmal.id,
          merkmalLabel: merkmal.label,
          x: layout.colWert,
          y: valueY,
          width: 258,
          height: layout.valueHeight
        };
      });

      merkmale.push({
        id: merkmal.id,
        label: merkmal.label,
        x: layout.colMerkmal,
        y: merkmalY,
        width: 208,
        height: layout.merkmalHeight,
        values
      });

      currentY += blockHeight + layout.merkmalGap;
    });

    const constraints = model.constraints.map((constraint, index) => ({
      id: constraint.id,
      label: constraint.label,
      x: layout.colConstraint,
      y: layout.marginTop + index * (layout.constraintHeight + layout.constraintGap) + layout.constraintHeight / 2,
      width: layout.constraintWidth,
      height: layout.constraintHeight,
      data: constraint
    }));

    return { merkmale, constraints, height: currentY + layout.marginBottom };
  }

  // FIX 8: Bezier curves with auto-direction detection
  function curvePath(from, to, bend) {
    const dx = to.x - from.x;
    const dir = dx >= 0 ? 1 : -1;
    const b = bend != null ? bend : Math.abs(dx) * 0.4;
    const c1x = from.x + b * dir;
    const c2x = to.x - b * dir;
    return `M ${from.x} ${from.y} C ${c1x} ${from.y} ${c2x} ${to.y} ${to.x} ${to.y}`;
  }

  function buildScene() {
    const data = buildLayoutData();
    const svg = createSvgElement('svg', {
      class: 'vc-tree-svg',
      viewBox: `0 0 ${layout.width} ${data.height}`,
      role: 'img',
      'aria-label': 'Interaktiver Merkmalsbaum mit Constraint-Propagation'
    });

    const linkLayer = createSvgElement('g', { class: 'tree-link-layer' });
    const nodeLayer = createSvgElement('g', { class: 'tree-node-layer' });
    svg.append(linkLayer, nodeLayer);

    data.merkmale.forEach((merkmal) => {
      const merkmalGroup = createSvgElement('g', { class: 'tree-node tree-node-merkmal' });
      const merkmalRect = createSvgElement('rect', {
        class: 'tree-node-rect',
        x: merkmal.x,
        y: merkmal.y - merkmal.height / 2,
        width: merkmal.width,
        height: merkmal.height,
        rx: 8,
        ry: 8
      });
      const merkmalText = createSvgElement('text', {
        class: 'tree-node-label',
        x: merkmal.x + 14,
        y: merkmal.y + 4
      });
      merkmalText.textContent = `Merkmal: ${merkmal.label}`;
      merkmalGroup.append(merkmalRect, merkmalText);
      nodeLayer.append(merkmalGroup);

      merkmal.values.forEach((valueNode) => {
        const group = createSvgElement('g', {
          class: 'tree-node tree-node-value',
          tabindex: 0,
          role: 'button',
          'aria-label': `${valueNode.merkmalLabel} ${valueNode.label} auswählen`
        });

        const rect = createSvgElement('rect', {
          class: 'tree-node-rect',
          x: valueNode.x,
          y: valueNode.y - valueNode.height / 2,
          width: valueNode.width,
          height: valueNode.height,
          rx: 8,
          ry: 8
        });
        const label = createSvgElement('text', {
          class: 'tree-node-label',
          x: valueNode.x + 12,
          y: valueNode.y + 4
        });
        label.textContent = valueNode.label;
        // FIX 1: Suffix right-aligned at fixed position for consistent spacing
        const sub = createSvgElement('text', {
          class: 'tree-node-sub',
          x: valueNode.x + valueNode.width - 10,
          y: valueNode.y + 4,
          'text-anchor': 'end'
        });
        sub.textContent = valueNode.merkmalLabel;
        group.append(rect, label, sub);

        group.addEventListener('click', () => toggleValueSelection(valueNode.id));
        group.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleValueSelection(valueNode.id);
          }
        });

        nodeLayer.append(group);
        nodeViews.set(valueKey(valueNode.id), { data: valueNode, group, rect, label, sub });

        // FIX 5: Structural links always visible (merkmal → values)
        linkViews.push({
          id: `merkmal-${normalizeKey(valueNode.id)}`,
          type: 'struct',
          source: `merkmal:${valueNode.merkmalId}`,
          target: valueKey(valueNode.id),
          path: createSvgElement('path', {
            class: 'tree-link tree-link-struct',
            d: curvePath(
              { x: merkmal.x + merkmal.width, y: valueNode.y },
              { x: valueNode.x, y: valueNode.y },
              52
            )
          })
        });
      });
    });

    data.constraints.forEach((constraintNode) => {
      const group = createSvgElement('g', {
        class: 'tree-constraint-node',
        tabindex: 0,
        role: 'button',
        'aria-label': `${constraintNode.id} anzeigen`
      });

      const rect = createSvgElement('rect', {
        class: 'tree-node-rect',
        x: constraintNode.x,
        y: constraintNode.y - constraintNode.height / 2,
        width: constraintNode.width,
        height: constraintNode.height,
        rx: 12,
        ry: 12
      });
      group.append(rect);

      const textLines = wrapTextLines(constraintNode.label, 34);
      textLines.forEach((line, index) => {
        const t = createSvgElement('text', {
          class: 'tree-node-label',
          x: constraintNode.x + 14,
          y: constraintNode.y - 24 + index * 17
        });
        t.textContent = line;
        group.append(t);
      });

      // FIX 6: Replace inline help text with SVG <title> for browser tooltip
      const title = createSvgElement('title', {});
      title.textContent = constraintNode.label;
      group.prepend(title);

      group.addEventListener('click', () => activateConstraintOnly(constraintNode.id));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activateConstraintOnly(constraintNode.id);
        }
      });

      // FIX 2: Hover preview — show constraint links at low opacity
      group.addEventListener('mouseenter', () => previewConstraint(constraintNode.id));
      group.addEventListener('mouseleave', () => clearPreview());

      nodeLayer.append(group);
      constraintViews.set(constraintKey(constraintNode.id), {
        data: constraintNode,
        group,
        rect
      });
    });

    buildConstraintLinks(data);
    linkViews.forEach((link) => linkLayer.append(link.path));

    host.innerHTML = '';
    host.append(svg);
  }

  function getValuePoint(valueId, side) {
    const view = nodeViews.get(valueKey(valueId));
    if (!view) return null;
    const x = side === 'right' ? view.data.x + view.data.width : view.data.x;
    return { x, y: view.data.y };
  }

  function getConstraintPoint(constraintId, side) {
    const view = constraintViews.get(constraintKey(constraintId));
    if (!view) return null;
    const x = side === 'left' ? view.data.x : view.data.x + view.data.width;
    return { x, y: view.data.y };
  }

  // FIX 4: Only render lines for values explicitly referenced in each constraint
  // FIX 3: Endpoints land on constraint left edge, not center
  // FIX 8: Bezier bend auto-calculated (~40% of horizontal distance)
  function addConstraintLink(constraintId, fromPt, toPt, linkId, type, valueIds) {
    if (!fromPt || !toPt) return;
    linkViews.push({
      id: linkId,
      type,
      constraintId,
      valueIds: valueIds || [],
      path: createSvgElement('path', {
        class: 'tree-link tree-link-constraint',
        d: curvePath(fromPt, toPt)          // bend auto-detected
      })
    });
  }

  function buildConstraintLinks() {
    model.constraints.forEach((constraint) => {
      const cId = constraint.id;

      if (constraint.blocks) {
        constraint.blocks.forEach(([a, b]) => {
          const ptA  = getValuePoint(a, 'right');
          const ptB  = getValuePoint(b, 'right');
          const cL   = getConstraintPoint(cId, 'left');
          addConstraintLink(cId, ptA, cL, `${cId}-${normalizeKey(a)}`, 'blocks', [a]);
          addConstraintLink(cId, ptB, cL, `${cId}-${normalizeKey(b)}`, 'blocks', [b]);
        });
      }

      if (constraint.forces) {
        constraint.forces.forEach((rule) => {
          const ptIf   = getValuePoint(rule.if, 'right');
          const ptThen = getValuePoint(rule.then, 'right');
          const cL     = getConstraintPoint(cId, 'left');
          addConstraintLink(cId, ptIf, cL, `${cId}-${normalizeKey(rule.if)}`, 'forces', [rule.if]);
          addConstraintLink(cId, cL, ptThen, `${cId}-${normalizeKey(rule.then)}-out`, 'forces', [rule.then]);
        });
      }

      if (constraint.infers) {
        constraint.infers.forEach((rule) => {
          const ptIf = getValuePoint(rule.if, 'right');
          const cL   = getConstraintPoint(cId, 'left');
          addConstraintLink(cId, ptIf, cL, `${cId}-${normalizeKey(rule.if)}`, 'infers', [rule.if]);
        });
      }
    });
  }

  function clearVisualState() {
    nodeViews.forEach((view) => {
      view.group.classList.remove('value-selected', 'value-forced', 'value-blocked');
    });
    constraintViews.forEach((view) => {
      view.group.classList.remove('constraint-active', 'constraint-pulse');
    });
    linkViews.forEach((link) => {
      // FIX 2: also clear preview state
      link.path.classList.remove('tree-link-active', 'tree-link-flow', 'tree-link-forbidden', 'tree-link-preview');
    });
  }

  // FIX 2: Hover preview — show constraint links at low opacity without click state
  function previewConstraint(constraintId) {
    linkViews.forEach((link) => {
      if (link.constraintId === constraintId) {
        link.path.classList.add('tree-link-preview');
      }
    });
  }

  function clearPreview() {
    linkViews.forEach((link) => {
      link.path.classList.remove('tree-link-preview');
    });
  }

  function applyModelState() {
    clearVisualState();

    const state = {
      blocked: new Set(),
      forced: new Set(),
      activeConstraintIds: new Set(),
      activeFlowLinks: new Set(),
      activeForbiddenLinks: new Set(),
      messages: []
    };

    selectedValues.forEach((valueId) => {
      const view = nodeViews.get(valueKey(valueId));
      if (view) view.group.classList.add('value-selected');
    });

    // FIX 4: Updated link IDs to match new buildConstraintLinks output
    model.constraints.forEach((constraint) => {
      if (constraint.blocks) {
        constraint.blocks.forEach(([left, right]) => {
          if (selectedValues.has(left)) {
            state.activeConstraintIds.add(constraint.id);
            state.blocked.add(right);
            state.activeFlowLinks.add(`${constraint.id}-${normalizeKey(left)}`);
            state.activeForbiddenLinks.add(`${constraint.id}-${normalizeKey(right)}`);
            state.messages.push(`${left.split(':')[1]} gewählt -> Constraint ${constraint.id} aktiv -> ${right.split(':')[1]} gesperrt`);
          }
          if (selectedValues.has(right)) {
            state.activeConstraintIds.add(constraint.id);
            state.blocked.add(left);
            state.activeFlowLinks.add(`${constraint.id}-${normalizeKey(right)}`);
            state.activeForbiddenLinks.add(`${constraint.id}-${normalizeKey(left)}`);
            state.messages.push(`${right.split(':')[1]} gewählt -> Constraint ${constraint.id} aktiv -> ${left.split(':')[1]} gesperrt`);
          }
        });
      }

      if (constraint.forces) {
        constraint.forces.forEach((rule) => {
          if (!selectedValues.has(rule.if)) return;
          state.activeConstraintIds.add(constraint.id);
          state.forced.add(rule.then);
          state.activeFlowLinks.add(`${constraint.id}-${normalizeKey(rule.if)}`);
          state.activeFlowLinks.add(`${constraint.id}-${normalizeKey(rule.then)}-out`);

          const targetMerkmal = rule.then.split(':')[0];
          const targetMerkmalEntry = model.merkmale.find((m) => m.id === targetMerkmal);
          if (!targetMerkmalEntry) return;

          targetMerkmalEntry.werte.forEach((wert) => {
              const candidate = `${targetMerkmal}:${wert}`;
              if (candidate !== rule.then) state.blocked.add(candidate);
            });

          state.messages.push(`${rule.if.split(':')[1]} gewählt -> ${rule.then.split(':')[1]} wird erzwungen`);
        });
      }

      if (constraint.infers) {
        constraint.infers.forEach((rule) => {
          if (!selectedValues.has(rule.if)) return;
          state.activeConstraintIds.add(constraint.id);
          state.activeFlowLinks.add(`${constraint.id}-${normalizeKey(rule.if)}`);
          state.messages.push(`${rule.if.split(':')[1]} gewählt -> Constraint ${constraint.id} aktiv -> Tagessatz ${rule.effect}`);
        });
      }
    });

    state.forced.forEach((valueId) => {
      const view = nodeViews.get(valueKey(valueId));
      if (view) view.group.classList.add('value-forced');
    });

    state.blocked.forEach((valueId) => {
      const view = nodeViews.get(valueKey(valueId));
      if (view) view.group.classList.add('value-blocked');
    });

    state.activeConstraintIds.forEach((constraintId) => {
      const view = constraintViews.get(constraintKey(constraintId));
      if (!view) return;
      view.group.classList.add('constraint-active');
      if (!prefersReducedMotion) {
        view.group.classList.remove('constraint-pulse');
        window.requestAnimationFrame(() => {
          view.group.classList.add('constraint-pulse');
        });
      }
    });

    linkViews.forEach((link) => {
      if (state.activeFlowLinks.has(link.id)) {
        link.path.classList.add('tree-link-active', 'tree-link-flow');
      }
      if (state.activeForbiddenLinks.has(link.id)) {
        link.path.classList.add('tree-link-active', 'tree-link-forbidden');
      }
    });

    if (!caption) return;

    // FIX 6: Global hint in rest state
    if (!selectedValues.size) {
      caption.textContent = 'Tipp: Klicken Sie auf einen Wert oder Constraint, um Abhängigkeiten zu sehen.';
      return;
    }

    caption.textContent = state.messages[0] || 'Auswahl aktiv.';
  }

  // FIX 2+4: Updated to use new valueIds array on links
  function activateConstraintOnly(constraintId) {
    clearVisualState();
    const constraint = model.constraints.find((entry) => entry.id === constraintId);
    const constraintView = constraintViews.get(constraintKey(constraintId));
    if (!constraint || !constraintView) return;

    constraintView.group.classList.add('constraint-active');
    if (!prefersReducedMotion) {
      constraintView.group.classList.add('constraint-pulse');
    }

    linkViews.forEach((link) => {
      if (link.constraintId === constraintId) {
        link.path.classList.add('tree-link-active');
        (link.valueIds || []).forEach((vId) => {
          const view = nodeViews.get(valueKey(vId));
          if (view) view.group.classList.add('value-selected');
        });
      }
    });

    if (caption) {
      caption.textContent = `${constraint.id}: ${constraint.label}`;
    }
  }

  function toggleValueSelection(valueId) {
    if (selectedValues.has(valueId)) {
      selectedValues.delete(valueId);
    } else {
      selectedValues.add(valueId);
    }
    applyModelState();
  }

  function resetState() {
    selectedValues.clear();
    applyModelState();
  }

  buildScene();
  resetState();

  // OPTIONAL: One-time intro pulse on three value nodes to signal interactivity
  if (!prefersReducedMotion) {
    setTimeout(function () {
      var pulseIds = ['standort:Remote', 'level:Veteran', 'level:Junior'];
      pulseIds.forEach(function (id) {
        var v = nodeViews.get(valueKey(id));
        if (v) v.group.classList.add('value-intro-pulse');
      });
      setTimeout(function () {
        pulseIds.forEach(function (id) {
          var v = nodeViews.get(valueKey(id));
          if (v) v.group.classList.remove('value-intro-pulse');
        });
      }, 1500);
    }, 400);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetState);
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      const isCollapsed = root.classList.contains('tree-collapsed');
      const lang = document.documentElement.lang === 'en' ? 'en' : 'de';
      const openLabel = lang === 'en' ? (openBtn.dataset.openEn || 'Open Feature Tree') : (openBtn.dataset.openDe || 'Merkmalsbaum öffnen');
      const closeLabel = lang === 'en' ? (openBtn.dataset.closeEn || 'Close Feature Tree') : (openBtn.dataset.closeDe || 'Merkmalsbaum schließen');

      if (isCollapsed) {
        root.classList.remove('tree-collapsed');
        root.setAttribute('aria-hidden', 'false');
        openBtn.setAttribute('aria-expanded', 'true');
        openBtn.textContent = closeLabel;
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        applyModelState();
      } else {
        root.classList.add('tree-collapsed');
        root.setAttribute('aria-hidden', 'true');
        openBtn.setAttribute('aria-expanded', 'false');
        openBtn.textContent = openLabel;
      }
    });
  }

  document.addEventListener('resume:lang-change', () => {
    if (!openBtn) return;
    const lang = document.documentElement.lang === 'en' ? 'en' : 'de';
    const openLabel = lang === 'en' ? (openBtn.dataset.openEn || 'Open Feature Tree') : (openBtn.dataset.openDe || 'Merkmalsbaum öffnen');
    const closeLabel = lang === 'en' ? (openBtn.dataset.closeEn || 'Close Feature Tree') : (openBtn.dataset.closeDe || 'Merkmalsbaum schließen');
    const isCollapsed = root.classList.contains('tree-collapsed');
    openBtn.textContent = isCollapsed ? openLabel : closeLabel;
  });
})();
