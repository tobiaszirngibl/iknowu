const STORAGE_KEY = "people-memory.contacts.v3";
const CATEGORIES_KEY = "people-memory.categories.v2";
const DEFAULT_CATEGORIES = ["Beruf", "Privat", "Freunde", "Familie", "Verein"];

const elements = {
  addBtn: document.querySelector("#addPersonButton"),
  seedButton: document.querySelector("#seedButton"),
  list: document.querySelector("#personList"),
  stats: document.querySelector("#stats"),
  homeCharts: document.querySelector("#homeCharts"),
  birthdayList: document.querySelector("#birthdayList"),
  dialog: document.querySelector("#personDialog"),
  closeDialog: document.querySelector("#closeDialog"),
  form: document.querySelector("#personForm"),
  title: document.querySelector("#dialogTitle"),
  deleteButton: document.querySelector("#deleteButton"),
  addChildButton: document.querySelector("#addChildButton"),
  childrenContainer: document.querySelector("#childrenContainer"),
  childTemplate: document.querySelector("#childTemplate"),
  search: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  formCategorySelect: document.querySelector("#formCategorySelect"),
  relationContactId: document.querySelector("#relationContactId"),
  template: document.querySelector("#personCardTemplate"),
  navButtons: document.querySelectorAll(".nav-btn"),
  tabs: document.querySelectorAll(".tab"),
  categoryOverview: document.querySelector("#categoryOverview"),
  categoryForm: document.querySelector("#categoryForm"),
  newCategoryInput: document.querySelector("#newCategoryInput"),
  exportButton: document.querySelector("#exportButton"),
  clearButton: document.querySelector("#clearButton"),
};

let contacts = loadContacts();
let categories = loadCategories();
let currentEditId = null;

init();

function init() {
  renderCategoryControls();
  render();
  registerServiceWorker();

  elements.addBtn.addEventListener("click", () => openDialog());
  elements.seedButton.addEventListener("click", loadDemoData);
  elements.closeDialog.addEventListener("click", () => elements.dialog.close());
  elements.form.addEventListener("submit", onSave);
  elements.deleteButton.addEventListener("click", onDelete);
  elements.addChildButton.addEventListener("click", () => addChildRow());
  elements.search.addEventListener("input", render);
  elements.categoryFilter.addEventListener("change", render);
  elements.exportButton.addEventListener("click", exportData);
  elements.clearButton.addEventListener("click", clearData);
  elements.categoryForm.addEventListener("submit", onCreateCategory);

  elements.navButtons.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.target)));

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-id]");
    if (editButton) openDialog(editButton.dataset.editId);

    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton) {
      elements.categoryFilter.value = categoryButton.dataset.category;
      switchTab("kontakte");
      render();
    }

    if (event.target.matches("[data-remove-child]")) {
      event.target.closest(".child-row")?.remove();
    }
  });
}

function loadContacts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadCategories() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
    if (Array.isArray(parsed)) return Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
  } catch {
    // ignore
  }
  return [...DEFAULT_CATEGORIES];
}

function persistContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function persistCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

function onCreateCategory(event) {
  event.preventDefault();
  const value = elements.newCategoryInput.value.trim();
  if (!value || categories.includes(value)) return;
  categories.push(value);
  persistCategories();
  renderCategoryControls();
  render();
  elements.newCategoryInput.value = "";
}

function renderCategoryControls() {
  elements.categoryFilter.innerHTML = [
    '<option value="">Alle Kategorien</option>',
    ...categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`),
  ].join("");

  elements.formCategorySelect.innerHTML = categories
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join("");
}

function switchTab(tabName) {
  elements.navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === tabName));
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
}

function openDialog(id = null) {
  currentEditId = id;
  const contact = contacts.find((c) => c.id === id);

  elements.form.reset();
  elements.childrenContainer.innerHTML = "";
  refreshRelationOptions(contact?.relationContactId || "");

  if (contact) {
    elements.title.textContent = "Kontakt bearbeiten";
    elements.deleteButton.classList.remove("hidden");
    Object.entries(contact).forEach(([key, value]) => {
      const field = elements.form.elements.namedItem(key);
      if (field && key !== "children") field.value = value;
    });
    (contact.children || []).forEach((child) => addChildRow(child));
  } else {
    elements.title.textContent = "Neue Person";
    elements.deleteButton.classList.add("hidden");
    addChildRow();
  }

  elements.dialog.showModal();
}

function addChildRow(initial = { name: "", gender: "" }) {
  const row = elements.childTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector('[data-child="name"]').value = initial.name || "";
  row.querySelector('[data-child="gender"]').value = initial.gender || "";
  elements.childrenContainer.appendChild(row);
}

function getChildrenFromForm() {
  return Array.from(elements.childrenContainer.querySelectorAll(".child-row"))
    .map((row) => ({
      name: row.querySelector('[data-child="name"]').value.trim(),
      gender: row.querySelector('[data-child="gender"]').value,
    }))
    .filter((child) => child.name || child.gender);
}

function refreshRelationOptions(currentValue = "") {
  const options = ['<option value="">Keine Verknüpfung</option>'];
  contacts
    .filter((c) => c.id !== currentEditId)
    .forEach((c) => options.push(`<option value="${c.id}">${escapeHtml(c.name || "Unbekannt")}</option>`));
  elements.relationContactId.innerHTML = options.join("");
  elements.relationContactId.value = currentValue;
}

function onSave(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(elements.form).entries());
  payload.children = getChildrenFromForm();

  if (!categories.includes(payload.category)) {
    categories.push(payload.category);
    persistCategories();
    renderCategoryControls();
  }

  if (currentEditId) {
    contacts = contacts.map((c) => (c.id === currentEditId ? { ...c, ...payload } : c));
  } else {
    contacts.unshift({ id: crypto.randomUUID(), ...payload, createdAt: Date.now() });
  }

  persistContacts();
  elements.dialog.close();
  render();
}

function onDelete() {
  if (!currentEditId) return;
  contacts = contacts.filter((c) => c.id !== currentEditId);
  contacts = contacts.map((c) => (c.relationContactId === currentEditId ? { ...c, relationContactId: "", relationType: "" } : c));
  persistContacts();
  elements.dialog.close();
  render();
}

function clearData() {
  if (!confirm("Wirklich alle Daten löschen?")) return;
  contacts = [];
  categories = [...DEFAULT_CATEGORIES];
  persistContacts();
  persistCategories();
  renderCategoryControls();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ contacts, categories }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "people-memory-export.json";
  link.click();
}

function loadDemoData() {
  if (contacts.length && !confirm("Vorhandene Daten überschreiben?")) return;

  const annaId = crypto.randomUUID();
  const mehmetId = crypto.randomUUID();

  contacts = [
    {
      id: annaId,
      name: "Anna Becker",
      category: "Beruf",
      address: "Köln",
      birthday: "1990-03-14",
      job: "Projektmanagerin",
      source: "Konferenz",
      relationship: "Kundin",
      spouseName: "Markus Becker",
      children: [
        { name: "Emma", gender: "w" },
        { name: "Noah", gender: "m" },
      ],
      privateNotes: "Mag Städtereisen.",
      workNotes: "Interessiert an KI.",
      sportsInterests: "Yoga",
      politicalInterests: "Bildung",
      hobbies: "Fotografie",
      conversationHints: "Barcelona-Reise ansprechen",
      relationContactId: "",
      relationType: "",
      createdAt: Date.now(),
    },
    {
      id: mehmetId,
      name: "Mehmet Yilmaz",
      category: "Freunde",
      address: "Hamburg",
      birthday: "1988-11-05",
      job: "Softwareentwickler",
      source: "Fußballverein",
      relationship: "Freund",
      spouseName: "Aylin Yilmaz",
      children: [],
      privateNotes: "Renoviert Haus.",
      workNotes: "Will Teamlead werden.",
      sportsInterests: "Fußball",
      politicalInterests: "Digitalpolitik",
      hobbies: "Gaming",
      conversationHints: "Spiel am Wochenende",
      relationContactId: annaId,
      relationType: "arbeitet mit",
      createdAt: Date.now() - 1000,
    },
  ];

  persistContacts();
  switchTab("kontakte");
  render();
}

function getFilteredContacts() {
  const query = elements.search.value.trim().toLowerCase();
  const category = elements.categoryFilter.value;

  return contacts.filter((c) => {
    const categoryMatch = !category || c.category === category;
    const childrenText = (c.children || []).map((child) => `${child.name} ${child.gender}`).join(" ");
    const text = `${Object.values(c).join(" ")} ${childrenText}`.toLowerCase();
    return categoryMatch && (!query || text.includes(query));
  });
}

function render() {
  const filtered = getFilteredContacts();
  renderStats(filtered);
  renderCharts();
  renderBirthdays();
  renderCategories();

  elements.list.innerHTML = "";
  if (!filtered.length) {
    elements.list.innerHTML = '<p class="card">Keine Kontakte gefunden.</p>';
    return;
  }

  filtered.forEach((c) => {
    const relation = contacts.find((x) => x.id === c.relationContactId)?.name;
    const childrenInfo = (c.children || []).map((child) => `${child.name} (${child.gender || "?"})`).join(", ");

    const card = elements.template.content.firstElementChild.cloneNode(true);
    card.querySelector(".person-name").textContent = c.name || "Unbekannt";
    card.querySelector(".category-chip").textContent = c.category || "-";
    card.querySelector(".person-meta").textContent = [c.job, c.address, c.birthday].filter(Boolean).join(" • ");
    card.querySelector(".tags").innerHTML = [c.relationship, c.hobbies, c.sportsInterests]
      .filter(Boolean)
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join("");

    const detailRows = [
      ["Ehepartner/in", c.spouseName],
      ["Kinder", childrenInfo],
      ["Privates", c.privateNotes],
      ["Berufliches", c.workNotes],
      ["Politik", c.politicalInterests],
      ["Gespräch", c.conversationHints],
      ["Verknüpfter Kontakt", relation],
      ["Beziehungsart", c.relationType],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`)
      .join("");

    card.querySelector(".details-content").innerHTML = `${detailRows}<button class="btn" data-edit-id="${c.id}">Bearbeiten</button>`;
    elements.list.appendChild(card);
  });
}

function renderStats(filtered) {
  const familyCount = contacts.filter((c) => (c.children || []).length || c.spouseName).length;
  const linkedCount = contacts.filter((c) => c.relationContactId).length;
  const blocks = [
    ["Gesamt", contacts.length],
    ["Gefiltert", filtered.length],
    ["Familieninfos", familyCount],
    ["Verknüpft", linkedCount],
  ];

  elements.stats.innerHTML = blocks.map(([l, v]) => `<article class="card stat"><span>${l}</span><strong>${v}</strong></article>`).join("");
}

function renderCharts() {
  const counts = contacts.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});
  const max = Math.max(1, ...Object.values(counts));

  elements.homeCharts.innerHTML = Object.entries(counts)
    .map(([category, count]) => {
      const width = Math.round((count / max) * 100);
      return `<div><p>${escapeHtml(category)} (${count})</p><div class="bar"><div style="width:${width}%"></div></div></div>`;
    })
    .join("") || "<p>Noch keine Daten.</p>";
}

function renderBirthdays() {
  const items = contacts
    .filter((c) => c.birthday)
    .sort((a, b) => nextBirthday(a.birthday) - nextBirthday(b.birthday))
    .slice(0, 5)
    .map((c) => `<li>🎉 <strong>${escapeHtml(c.name)}</strong> – ${escapeHtml(c.birthday)}</li>`)
    .join("");

  elements.birthdayList.innerHTML = items || "<li>Keine Geburtstage hinterlegt.</li>";
}

function nextBirthday(dateString) {
  const today = new Date();
  const [, m, d] = dateString.split("-").map(Number);
  const date = new Date(today.getFullYear(), m - 1, d);
  if (date < today) date.setFullYear(today.getFullYear() + 1);
  return date.getTime();
}

function renderCategories() {
  const counts = contacts.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});

  elements.categoryOverview.innerHTML = categories
    .map((cat) => `<button class="card" data-category="${escapeHtml(cat)}"><strong>${escapeHtml(cat)}</strong><p>${counts[cat] || 0} Kontakte</p></button>`)
    .join("");
}

function escapeHtml(input = "") {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
