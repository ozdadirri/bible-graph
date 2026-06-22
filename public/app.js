const state = {
  tab: "people",
  summaries: { people: [], places: [], events: [], books: [] },
  searchItems: [],
  selected: null,
  graph: null,
  nodes: [],
  links: [],
  expandedNodes: new Set(),
  graphCache: new Map(),
  dragging: null,
  hoveredNode: null,
  // Zoom & pan
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStart: null,
  simulation: { running: false, tick: 0, maxTicks: 120 },
};

const els = {
  stats: document.querySelector("#datasetStats"),
  search: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
  tabs: document.querySelectorAll(".tab"),
  list: document.querySelector("#entityList"),
  type: document.querySelector("#entityType"),
  title: document.querySelector("#entityTitle"),
  description: document.querySelector("#entityDescription"),
  statBox: document.querySelector("#entityStats"),
  canvas: document.querySelector("#graphCanvas"),
  verses: document.querySelector("#verseList"),
  inspectorType: document.querySelector("#inspectorType"),
  inspectorTitle: document.querySelector("#inspectorTitle"),
  inspectorProps: document.querySelector("#inspectorProps"),
  inspectorNeighbors: document.querySelector("#inspectorNeighbors"),
  inspector: document.querySelector(".inspector"),
  verseToggle: document.querySelector("#verseToggle"),
  detailGrid: document.querySelector("#detailGrid"),
  descToggle: document.querySelector("#descToggle"),
  graphFilters: document.querySelector("#graphFilters"),
};

const nodeTypeFilters = { person: true, place: true, event: true, book: true, chapter: true };
const typeColors = { person: "#1f5f8b", place: "#497956", event: "#d8a436", book: "#172033", chapter: "#8d6e45" };
const colors = {
  focus: "#b94b4b", person: "#1f5f8b", place: "#497956", event: "#d8a436",
  book: "#172033", chapter: "#8d6e45", mentioned: "#1f5f8b", writer: "#b94b4b",
  father: "#1f5f8b", mother: "#1f5f8b", children: "#1f5f8b", siblings: "#1f5f8b", partners: "#1f5f8b",
};

function titleCase(v) { return v.slice(0, 1).toUpperCase() + v.slice(1); }
function updateVerseVisibility() { els.detailGrid.classList.toggle("visible", els.verseToggle.checked); }
function tl(label) { return i18n.name(label); }
function tt(key) { return i18n.t(key); }

function formatDesc(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/g, '<em>$1</em>')
    .replace(/\(\s*((?:[1-3]\s)?[A-Z][a-z]+\s\d+[:\d\s;,–-]*)\s*\)/g, '<span class="bible-ref">$1</span>')
    .replace(/\n\n/g, '</p><p class="desc-para">');
}

function refreshUI() {
  // Update static UI text
  document.querySelector("h1").textContent = tt("title");
  els.search.placeholder = tt("search");
  document.querySelector("#mapToggle").textContent = document.querySelector("#mapSection").hidden ? tt("map") : tt("hideMap");
  document.querySelector("#langToggle").textContent = i18n.current === "en" ? "中文" : "EN";
  document.querySelector(".map-header h2").textContent = tt("biblicalPlaces");
  document.querySelector("#mapClose").innerHTML = `&times; ${tt("closeMap")}`;

  // Tabs
  for (const tab of els.tabs) {
    tab.textContent = tt(tab.dataset.tab);
  }

  // Verse toggle label
  document.querySelector(".verse-toggle span").textContent = tt("showVerses");

  // Verse section heading
  const verseHeading = document.querySelector("#detailGrid h3");
  if (verseHeading) verseHeading.textContent = tt("referencedVerses");

  // Inspector heading
  const inspectorConnH3 = document.querySelector(".inspector-section h3");
  if (inspectorConnH3) inspectorConnH3.textContent = tt("connectedNodes");

  // Refresh stats
  if (state.counts) {
    const c = state.counts;
    els.stats.textContent = `${c.verses.toLocaleString()} verses · ${c.people.toLocaleString()} ${tt("people").toLowerCase()} · ${c.places.toLocaleString()} ${tt("places").toLowerCase()} · ${c.events.toLocaleString()} ${tt("events").toLowerCase()}`;
  }

  // Refresh list and details
  renderList();
  if (state.graph) {
    const entity = state.graph.entity;
    els.type.textContent = titleCase(tl(entity.type || "entity"));
    els.title.textContent = tl(entity.label);
    els.descToggle.textContent = els.description.classList.contains("collapsed") ? tt("showMore") : tt("showLess");
  }
}

async function fetchJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Unable to load ${path}`);
  return r.json();
}

function graphPath(item) {
  const type = { person: "person", place: "place", book: "book", chapter: "chapter", event: "event" }[item.type];
  return type ? `/data/graph/${type}/${item.slug}.json` : null;
}

async function fetchFullGraph(node) {
  const path = graphPath(node);
  if (!path) return null;
  try { return await fetchJson(path); } catch (e) { return null; }
}

async function fetchNodeGraph(node) {
  if (state.graphCache.has(node.id)) return state.graphCache.get(node.id);
  const path = graphPath(node);
  if (!path) return null;
  try {
    const graph = await fetchJson(path);
    const data = { nodes: graph.nodes || [], links: graph.links || [] };
    state.graphCache.set(node.id, data);
    return data;
  } catch (e) { return null; }
}

async function preloadChildCounts() {
  for (const node of state.nodes) {
    if (node.childCount !== undefined) continue;
    const data = await fetchNodeGraph(node);
    node.childCount = data ? data.nodes.filter(n => n.id !== node.id).length : 0;
  }
}

// ─── Sidebar ───
function renderList() {
  const items = state.summaries[state.tab] || [];
  els.list.innerHTML = "";
  for (const item of items.slice(0, state.tab === "books" ? 66 : 80)) {
    const button = document.createElement("button");
    button.className = `entity-card${state.selected?.slug === item.slug ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `<strong>${tl(item.label)}</strong><span>${tl(item.subtitle || item.type)} · ${item.count || 0} ${tt("refs")}</span>`;
    button.addEventListener("click", () => selectItem(item));
    els.list.appendChild(button);
  }
}

function renderSearchResults(query) {
  const q = query.trim().toLowerCase();
  if (!q) { els.searchResults.hidden = true; els.searchResults.innerHTML = ""; return; }
  const results = state.searchItems
    .filter(item => {
      const en = `${item.label} ${item.subtitle || ""}`.toLowerCase();
      const zh = `${tl(item.label)} ${tl(item.subtitle || "")}`.toLowerCase();
      return en.includes(q) || zh.includes(q);
    })
    .slice(0, 10);
  els.searchResults.innerHTML = "";
  for (const item of results) {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${tl(item.label)}</strong><span>${titleCase(tl(item.type))}</span>`;
    button.addEventListener("click", () => {
      els.search.value = "";
      els.searchResults.hidden = true;
      state.tab = item.type === "book" ? "books" : item.type === "event" ? "events" : item.type === "place" ? "places" : "people";
      syncTabs(); renderList(); selectItem(item);
    });
    els.searchResults.appendChild(button);
  }
  els.searchResults.hidden = results.length === 0;
}

function syncTabs() {
  for (const tab of els.tabs) tab.classList.toggle("active", tab.dataset.tab === state.tab);
}

// ─── Inspector ───
function renderInspector(node) {
  if (!node) { els.inspector.hidden = true; return; }
  els.inspector.hidden = false;
  els.inspectorType.textContent = titleCase(tl(node.type || "entity"));
  els.inspectorTitle.textContent = tl(node.label);
  els.inspectorProps.innerHTML = "";
  if (node.description) {
    const descWrap = document.createElement("div");
    descWrap.className = "inspector-desc-wrap";
    const descP = document.createElement("p");
    descP.className = "inspector-desc collapsed";
    descP.innerHTML = formatDesc(node.description);
    descWrap.appendChild(descP);
    if (node.description.length > 120) {
      const toggle = document.createElement("button");
      toggle.className = "desc-toggle";
      toggle.textContent = tt("showMore");
      toggle.addEventListener("click", () => {
        descP.classList.toggle("collapsed");
        toggle.textContent = descP.classList.contains("collapsed") ? tt("showMore") : tt("showLess");
      });
      descWrap.appendChild(toggle);
    }
    els.inspectorProps.appendChild(descWrap);
  }
  for (const [key, value] of [[tt("type"), titleCase(tl(node.type))], [tt("group"), titleCase(tl(node.group))], [tt("references"), Math.round(node.score || 1)]]) {
    const row = document.createElement("div");
    row.className = "prop-row";
    row.innerHTML = `<span class="prop-key">${key}</span><span class="prop-value">${value}</span>`;
    els.inspectorProps.appendChild(row);
  }
  els.inspectorNeighbors.innerHTML = "";
  const connected = state.links
    .filter(l => l.source.id === node.id || l.target.id === node.id)
    .map(l => ({ other: l.source.id === node.id ? l.target : l.source, label: l.label }));
  for (const { other, label } of connected) {
    const btn = document.createElement("button");
    btn.className = "neighbor-btn";
    btn.textContent = `${tl(other.label)} (${tl(label)})`;
    btn.addEventListener("click", () => renderInspector(other));
    els.inspectorNeighbors.appendChild(btn);
  }
  if (!els.inspectorNeighbors.children.length) {
    els.inspectorNeighbors.innerHTML = `<p class="note">${tt("noConnected")}</p>`;
  }
}

function renderVerses(verses) {
  els.verses.innerHTML = "";
  for (const verse of (verses || []).slice(0, 20)) {
    const row = document.createElement("div");
    row.className = "verse";
    row.innerHTML = `<b>${verse.ref || "Verse"}</b><p>${verse.text || ""}</p>`;
    els.verses.appendChild(row);
  }
  if (!verses?.length) {
    els.verses.innerHTML = `<p class="note">${tt("noVerse")}</p>`;
  }
}

// ─── Details panel ───
function renderDetails(graph) {
  state.graph = graph;
  const entity = graph.entity;
  els.type.textContent = titleCase(tl(entity.type || "entity"));
  els.title.textContent = tl(entity.label);
  const desc = entity.description || entity.subtitle || "";
  els.description.innerHTML = formatDesc(desc);
  els.description.classList.add("collapsed");
  els.descToggle.textContent = tt("showMore");
  els.descToggle.hidden = desc.length < 200;
  els.statBox.innerHTML = "";
  for (const [key, value] of Object.entries(graph.stats || {})) {
    const stat = document.createElement("div");
    stat.className = "stat";
    stat.innerHTML = `<b>${value}</b><span>${key}</span>`;
    els.statBox.appendChild(stat);
  }
  const heading = document.querySelector("#detailGrid h3");
  if (heading) heading.textContent = tt("referencedVerses");
  renderVerses(graph.verses || []);
  updateVerseVisibility();
  renderInspector(null);
}

async function selectItem(item) {
  state.selected = item;
  renderList();
  const path = graphPath(item);
  if (!path) return;
  try {
    const graph = await fetchJson(path);
    renderDetails(graph);
    initializeGraph(graph, item);
  } catch (error) {
    els.type.textContent = titleCase(tl(item.type));
    els.title.textContent = tl(item.label);
    els.description.textContent = item.description || tt("noData");
    els.statBox.innerHTML = "";
    els.verses.innerHTML = `<p class="note">${tt("noSlice")}</p>`;
  }
}

// ─── Graph logic ───
function initializeGraph(graph, item) {
  const allNodes = graph.nodes || [];
  const allLinks = graph.links || [];
  state.graphCache.set(allNodes.find(n => n.group === "focus")?.id || item.id, { nodes: allNodes, links: allLinks });

  const focusNode = allNodes.find(n => n.group === "focus");
  if (!focusNode) return;

  state.nodes = [{
    ...focusNode, x: 0, y: 0, vx: 0, vy: 0, fixed: true,
    expandedChildIds: [],
    childCount: allNodes.filter(n => n.id !== focusNode.id).length,
  }];
  state.links = [];
  state.expandedNodes.clear();
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  state.simulation.tick = 0;
  state.simulation.running = false;
  startAnimation();
}

async function expandNode(clickedNode) {
  if (state.expandedNodes.has(clickedNode.id)) return;
  const data = await fetchNodeGraph(clickedNode);
  if (!data) return;

  const existingIds = new Set(state.nodes.map(n => n.id));
  const nodesToAdd = data.nodes.filter(n => !existingIds.has(n.id));

  const count = nodesToAdd.length;
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const radius = 120 + count * 5;
    state.nodes.push({
      ...nodesToAdd[i],
      x: clickedNode.x + Math.cos(angle) * radius,
      y: clickedNode.y + Math.sin(angle) * radius,
      vx: 0, vy: 0, fixed: false,
      expandedChildIds: [],
      childCount: undefined,
    });
  }

  const nowVisible = new Set(state.nodes.map(n => n.id));
  for (const link of data.links) {
    if (!nowVisible.has(link.source) || !nowVisible.has(link.target)) continue;
    const src = state.nodes.find(n => n.id === link.source);
    const tgt = state.nodes.find(n => n.id === link.target);
    if (!src || !tgt) continue;
    if (!state.links.some(l => l.source.id === link.source && l.target.id === link.target)) {
      state.links.push({ source: src, target: tgt, label: link.label });
    }
  }

  clickedNode.expandedChildIds = nodesToAdd.map(n => n.id);
  state.expandedNodes.add(clickedNode.id);
  state.simulation.running = true;
  state.simulation.tick = 0;
  preloadChildCounts();
}

function collapseNode(clickedNode) {
  if (!state.expandedNodes.has(clickedNode.id)) return;
  const collect = (nodeId) => {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return [];
    const ids = [...(node.expandedChildIds || [])];
    for (const cid of node.expandedChildIds || []) { ids.push(...collect(cid)); state.expandedNodes.delete(cid); }
    return ids;
  };
  const idsToRemove = new Set(collect(clickedNode.id));
  state.nodes = state.nodes.filter(n => !idsToRemove.has(n.id));
  state.links = state.links.filter(l => !idsToRemove.has(l.source.id) && !idsToRemove.has(l.target.id));
  clickedNode.expandedChildIds = [];
  state.expandedNodes.delete(clickedNode.id);
}

// ─── Physics ───
function simulationStep() {
  const nodes = state.nodes;
  const links = state.links;
  const rect = els.canvas.getBoundingClientRect();
  const boundsX = (rect.width / 2 - 60) / state.zoom;
  const boundsY = (rect.height / 2 - 50) / state.zoom;

  for (const node of nodes) { node.fx = 0; node.fy = 0; }

  // Center gravity (gentle pull toward origin)
  for (const node of nodes) {
    if (node.fixed) continue;
    node.fx -= node.x * 0.003;
    node.fy -= node.y * 0.003;
  }

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const force = 20000 / (dist * dist);
      dx /= dist; dy /= dist;
      if (!a.fixed) { a.fx -= dx * force; a.fy -= dy * force; }
      if (!b.fixed) { b.fx += dx * force; b.fy += dy * force; }
    }
  }

  // Link attraction
  for (const link of links) {
    if (!link.source || !link.target) continue;
    const a = link.source, b = link.target;
    let dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const force = (dist - 130) * 0.015;
    dx /= dist; dy /= dist;
    if (!a.fixed) { a.fx += dx * force; a.fy += dy * force; }
    if (!b.fixed) { b.fx -= dx * force; b.fy -= dy * force; }
  }

  // Bounds
  for (const node of nodes) {
    if (!node.fixed) {
      node.x = Math.max(-boundsX, Math.min(boundsX, node.x));
      node.y = Math.max(-boundsY, Math.min(boundsY, node.y));
    }
  }

  const damping = 0.7;
  for (const node of nodes) {
    if (node.fixed) continue;
    node.vx = (node.vx + node.fx) * damping;
    node.vy = (node.vy + node.fy) * damping;
    node.x += node.vx;
    node.y += node.vy;
  }

  state.simulation.tick++;
  if (state.simulation.tick > state.simulation.maxTicks) state.simulation.running = false;
}

// ─── Rendering ───
function drawGraph() {
  const canvas = els.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const cx = rect.width / 2 + state.panX;
  const cy = rect.height / 2 + state.panY;
  const z = state.zoom;

  // Visible set
  const visibleIds = new Set();
  for (const node of state.nodes) {
    if (node.group === "focus" || nodeTypeFilters[node.type] !== false) visibleIds.add(node.id);
  }

  // Hovered node's connected set for highlighting
  const highlightIds = new Set();
  if (state.hoveredNode && visibleIds.has(state.hoveredNode.id)) {
    highlightIds.add(state.hoveredNode.id);
    for (const l of state.links) {
      if (l.source.id === state.hoveredNode.id) highlightIds.add(l.target.id);
      if (l.target.id === state.hoveredNode.id) highlightIds.add(l.source.id);
    }
  }
  const hasHighlight = highlightIds.size > 0;

  // Links
  for (const link of state.links) {
    if (!link.source || !link.target) continue;
    if (!visibleIds.has(link.source.id) || !visibleIds.has(link.target.id)) continue;
    const sx = link.source.x * z + cx, sy = link.source.y * z + cy;
    const tx = link.target.x * z + cx, ty = link.target.y * z + cy;

    const isHighlighted = hasHighlight && highlightIds.has(link.source.id) && highlightIds.has(link.target.id);
    ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
    ctx.strokeStyle = hasHighlight
      ? (isHighlighted ? "rgba(23, 32, 51, 0.5)" : "rgba(23, 32, 51, 0.08)")
      : "rgba(23, 32, 51, 0.2)";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    // Link label
    if (link.label && z > 0.5) {
      const mx = (sx + tx) / 2, my = (sy + ty) / 2;
      const fontSize = Math.max(8, 10 * z);
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(link.label).width + 6;
      ctx.fillStyle = hasHighlight && !isHighlighted ? "rgba(255, 253, 247, 0.4)" : "rgba(255, 253, 247, 0.88)";
      ctx.beginPath();
      ctx.roundRect(mx - tw / 2, my - fontSize * 0.7, tw, fontSize * 1.4, 3);
      ctx.fill();
      ctx.fillStyle = hasHighlight && !isHighlighted ? "rgba(101, 112, 138, 0.3)" : "#65708a";
      ctx.fillText(tl(link.label), mx, my);
    }
  }

  // Nodes
  for (const node of state.nodes) {
    if (!visibleIds.has(node.id)) continue;

    const r = Math.max(8, Math.min(28, (8 + Math.sqrt(Number(node.score) || 1) * 2.2)) * z);
    node.radius = r / z; // Store unscaled radius for hit testing

    const nx = node.x * z + cx, ny = node.y * z + cy;
    const isDimmed = hasHighlight && !highlightIds.has(node.id);
    const isHovered = state.hoveredNode?.id === node.id;

    // Shadow for hovered
    if (isHovered) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(31, 42, 68, 0.15)";
      ctx.arc(nx, ny, r + 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    const baseColor = colors[node.group] || colors[node.type] || "#65708a";
    ctx.fillStyle = isDimmed ? baseColor + "44" : baseColor;
    ctx.strokeStyle = isDimmed ? "#17203344" : "#172033";
    ctx.lineWidth = (node.group === "focus" ? 3 : 1.5) * z;
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Expanded ring
    if (state.expandedNodes.has(node.id)) {
      ctx.beginPath();
      ctx.strokeStyle = isDimmed ? "#d8a43644" : "#d8a436";
      ctx.lineWidth = 2 * z;
      ctx.setLineDash([4 * z, 3 * z]);
      ctx.arc(nx, ny, r + 4 * z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Label
    if (z > 0.4) {
      const fontSize = Math.max(9, (node.group === "focus" ? 13 : 10) * z);
      ctx.font = `${node.group === "focus" ? 800 : 700} ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isDimmed ? "#17203344" : "#172033";
      const translated = tl(node.label);
      let label = translated.length > 18 ? `${translated.slice(0, 16)}…` : translated;
      if (node.childCount !== undefined && node.childCount > 0) label += ` (${node.childCount})`;

      // Text background for readability
      const tw = ctx.measureText(label).width + 4;
      ctx.fillStyle = "rgba(255, 250, 240, 0.7)";
      ctx.fillRect(nx - tw / 2, ny + r + 3, tw, fontSize + 2);
      ctx.fillStyle = isDimmed ? "#17203344" : "#172033";
      ctx.fillText(label, nx, ny + r + 4);
    }
  }

  // Zoom indicator
  if (z !== 1) {
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#65708a";
    ctx.fillText(`${Math.round(z * 100)}%`, rect.width - 10, rect.height - 8);
  }
}

let animating = false;
function startAnimation() {
  if (animating) return;
  animating = true;
  animate();
}
function animate() {
  if (state.simulation.running) simulationStep();
  drawGraph();
  requestAnimationFrame(animate);
}

// ─── Canvas coordinate helpers ───
function canvasPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left - rect.width / 2 - state.panX) / state.zoom;
  const y = (event.clientY - rect.top - rect.height / 2 - state.panY) / state.zoom;
  return { x, y };
}

function findNodeAt(point) {
  let hit = null, best = Infinity;
  for (const node of state.nodes) {
    const d = Math.hypot(point.x - node.x, point.y - node.y);
    if (d <= (node.radius || 15) + 8 && d < best) { hit = node; best = d; }
  }
  return hit;
}

// ─── Init ───
async function init() {
  const [index, people, places, events, books] = await Promise.all([
    fetchJson("/data/index.json"),
    fetchJson("/data/people-summary.json"),
    fetchJson("/data/places-summary.json"),
    fetchJson("/data/events-summary.json"),
    fetchJson("/data/books-summary.json"),
  ]);
  state.summaries.people = people;
  state.summaries.places = places;
  state.summaries.events = events;
  state.summaries.books = books;
  state.searchItems = [...people, ...places, ...events, ...books];
  state.counts = index.counts;
  function updateStats() {
    const c = state.counts;
    els.stats.textContent = `${c.verses.toLocaleString()} verses · ${c.people.toLocaleString()} ${tt("people").toLowerCase()} · ${c.places.toLocaleString()} ${tt("places").toLowerCase()} · ${c.events.toLocaleString()} ${tt("events").toLowerCase()}`;
  }
  updateStats();

  for (const tab of els.tabs) {
    tab.addEventListener("click", () => { state.tab = tab.dataset.tab; syncTabs(); renderList(); });
  }
  els.search.addEventListener("input", (e) => renderSearchResults(e.target.value));
  els.verseToggle.addEventListener("change", updateVerseVisibility);

  // Graph filter checkboxes
  els.graphFilters.innerHTML = "";
  for (const type of Object.keys(nodeTypeFilters)) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    cb.addEventListener("change", () => { nodeTypeFilters[type] = cb.checked; });
    const dot = document.createElement("span");
    dot.className = "filter-dot";
    dot.style.background = typeColors[type] || "#65708a";
    label.appendChild(cb);
    label.appendChild(dot);
    label.appendChild(document.createTextNode(titleCase(type)));
    els.graphFilters.appendChild(label);
  }

  els.descToggle.addEventListener("click", () => {
    if (els.description.classList.contains("collapsed")) {
      els.description.classList.remove("collapsed");
      els.descToggle.textContent = tt("showLess");
    } else {
      els.description.classList.add("collapsed");
      els.descToggle.textContent = tt("showMore");
    }
  });

  // Fullscreen toggle
  const graphPanel = document.querySelector("#graphPanel");
  const fsBtn = document.querySelector("#graphFullscreen");
  fsBtn.addEventListener("click", () => {
    graphPanel.classList.toggle("fullscreen");
    fsBtn.textContent = graphPanel.classList.contains("fullscreen") ? "✕" : "⛶";
    drawGraph();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && graphPanel.classList.contains("fullscreen")) {
      graphPanel.classList.remove("fullscreen");
      fsBtn.textContent = "⛶";
      drawGraph();
    }
  });

  // Language toggle
  document.querySelector("#langToggle").addEventListener("click", () => {
    i18n.toggle();
    refreshUI();
  });

  // ─── Canvas interactions ───
  let dragStart = null;
  let wasDragged = false;

  // Zoom with mouse wheel
  els.canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    state.zoom = Math.max(0.3, Math.min(3, state.zoom * delta));
  }, { passive: false });

  // Touch pinch zoom
  let lastTouchDist = 0;
  els.canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });

  els.canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / lastTouchDist;
      state.zoom = Math.max(0.3, Math.min(3, state.zoom * scale));
      lastTouchDist = dist;
    }
  }, { passive: false });

  els.canvas.addEventListener("pointerdown", (e) => {
    const p = canvasPoint(e);
    const node = findNodeAt(p);
    if (node) {
      state.dragging = node;
      dragStart = { x: p.x, y: p.y };
      wasDragged = false;
      node.fixed = true;
    } else {
      // Pan mode
      state.isPanning = true;
      state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    }
  });

  els.canvas.addEventListener("pointermove", (e) => {
    const p = canvasPoint(e);
    if (state.dragging) {
      els.canvas.style.cursor = "grabbing";
      state.dragging.x = p.x;
      state.dragging.y = p.y;
      if (dragStart) {
        const d = Math.hypot(p.x - dragStart.x, p.y - dragStart.y);
        if (d > 5) wasDragged = true;
      }
    } else if (state.isPanning && state.panStart) {
      els.canvas.style.cursor = "move";
      state.panX = e.clientX - state.panStart.x;
      state.panY = e.clientY - state.panStart.y;
    } else {
      const node = findNodeAt(p);
      state.hoveredNode = node;
      els.canvas.style.cursor = node ? "grab" : "default";
    }
  });

  els.canvas.addEventListener("pointerup", () => {
    if (state.dragging) {
      if (state.dragging.group !== "focus" || state.nodes.indexOf(state.dragging) !== 0) {
        state.dragging.fixed = false;
      }
      state.dragging = null;
      dragStart = null;
    }
    state.isPanning = false;
    state.panStart = null;
  });

  els.canvas.addEventListener("pointerleave", () => {
    state.hoveredNode = null;
  });

  // Double click to expand/collapse
  els.canvas.addEventListener("dblclick", async (e) => {
    e.preventDefault();
    if (wasDragged) return;
    const p = canvasPoint(e);
    const node = findNodeAt(p);
    if (!node) return;
    if (state.expandedNodes.has(node.id)) {
      collapseNode(node);
    } else {
      await expandNode(node);
    }
  });

  // Single click for inspector + shared verses
  els.canvas.addEventListener("click", async (e) => {
    if (wasDragged) { wasDragged = false; return; }
    if (state.isPanning) return;
    const p = canvasPoint(e);
    const node = findNodeAt(p);
    if (!node) {
      renderInspector(null);
      if (state.graph) {
        const heading = document.querySelector("#detailGrid h3");
        if (heading) heading.textContent = tt("referencedVerses");
        renderVerses(state.graph.verses || []);
      }
      return;
    }
    renderInspector(node);
    // Show verses for the clicked node
    if (node.group !== "focus") {
      const clickedGraph = await fetchFullGraph(node);
      const heading = document.querySelector("#detailGrid h3");
      if (heading) heading.textContent = `${tt("referencedVerses")} — ${tl(node.label)}`;
      renderVerses(clickedGraph?.verses || []);
      if (!els.verseToggle.checked) els.detailGrid.classList.add("visible");
    }
  });

  window.addEventListener("resize", () => drawGraph());

  // ─── Map ───
  let map = null;
  const mapSection = document.querySelector("#mapSection");
  const mapToggle = document.querySelector("#mapToggle");
  const mapClose = document.querySelector("#mapClose");

  mapToggle.addEventListener("click", () => {
    if (!mapSection.hidden) {
      mapSection.hidden = true;
      mapToggle.textContent = "Map";
      return;
    }
    mapSection.hidden = false;
    mapToggle.textContent = tt("hideMap");
    if (!map) {
      map = L.map("map").setView([31.5, 35.5], 7);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; <a href='https://carto.com/'>CARTO</a> &copy; <a href='https://www.openstreetmap.org/copyright'>OSM</a>",
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      for (const place of places) {
        if (!place.lat || !place.lon || place.lat === 0) continue;
        const r = Math.max(4, Math.min(14, Math.sqrt(place.count || 1) * 1.5));
        const marker = L.circleMarker([place.lat, place.lon], {
          radius: r,
          color: "#1e2942",
          weight: 1.5,
          fillColor: "#497956",
          fillOpacity: 0.75,
        }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:Inter,sans-serif">` +
          `<b style="font-size:14px">${place.label}</b><br>` +
          `<span style="color:#65708a;font-size:12px">${place.subtitle || "Place"}</span><br>` +
          `<span style="font-size:12px">${place.count || 0} references</span>` +
          `${place.description ? `<p class="map-popup-desc collapsed" style="font-size:11px;color:#444;margin:6px 0 0">${formatDesc(place.description)}</p>${place.description.length > 150 ? `<button class="desc-toggle" onclick="this.previousElementSibling.classList.toggle('collapsed');this.textContent=this.previousElementSibling.classList.contains('collapsed')?'${tt("showMore")}':'${tt("showLess")}'">${tt("showMore")}</button>` : ""}` : ""}` +
          `</div>`
        );
        marker.on("click", () => selectItem(place));
      }
    }
    setTimeout(() => map.invalidateSize(), 100);
  });

  mapClose.addEventListener("click", () => {
    mapSection.hidden = true;
    mapToggle.textContent = tt("map");
  });

  syncTabs();
  renderList();
  updateVerseVisibility();
  const initial = people.find(i => i.slug === "moses_2108") || people[0];
  await selectItem(initial);
}

init().catch((error) => {
  els.stats.textContent = error.message;
  console.error(error);
});
