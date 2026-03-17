const STORAGE_KEY = "people-memory.contacts.v2";
const CATEGORIES_KEY = "people-memory.categories.v1";
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
  search: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  formCategorySelect: document.querySelector("#formCategorySelect"),
  relationContactId: document.querySelector("#relationContactId"),
  template: document.querySelector("#personCardTemplate"),
  tabLinks: document.querySelectorAll(".tab-link"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  categoryOverview: document.querySelector("#categoryOverview"),
  categoryForm: document.querySelector("#categoryForm"),
  newCategoryInput: document.querySelector("#newCategoryInput"),
  exportButton: document.querySelector("#exportButton"),
  clearButton: document.querySelector("#clearButton"),
};

let contacts = loadContacts();
let categories = loadCategories();
let currentEditId = null;

setup();

function setup() {
  renderCategoryControls();
  render();
  registerServiceWorker();

  elements.addBtn.addEventListener("click", () => openDialog());
  elements.seedButton.addEventListener("click", loadDemoData);
  elements.closeDialog.addEventListener("click", () => elements.dialog.close());
  elements.form.addEventListener("submit", onSave);
  elements.deleteButton.addEventListener("click", onDelete);
  elements.search.addEventListener("input", render);
  elements.categoryFilter.addEventListener("change", render);
  elements.exportButton.addEventListener("click", exportData);
  elements.clearButton.addEventListener("click", clearData);
  elements.categoryForm.addEventListener("submit", onCreateCategory);

  elements.tabLinks.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.target));
  });

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-id]");
    if (editButton) {
      openDialog(editButton.dataset.editId);
    }

    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton) {
      elements.categoryFilter.value = categoryButton.dataset.category;
      switchTab("kontakte");
      render();
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
    if (Array.isArray(parsed) && parsed.length) {
      return Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
    }
  } catch {
    // ignore parsing errors
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
  if (!value) return;
  if (!categories.includes(value)) {
    categories.push(value);
    persistCategories();
    renderCategoryControls();
    render();
  }
  elements.newCategoryInput.value = "";
}

function renderCategoryControls() {
  elements.categoryFilter.innerHTML = [
    '<option value="">Alle Kategorien</option>',
    ...categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`),
  ].join("");

  elements.formCategorySelect.innerHTML = categories
    .map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`)
    .join("");

  refreshRelationOptions();
}

function refreshRelationOptions(currentValue = "") {
  const options = ['<option value="">Keine Verknüpfung</option>'];
  contacts
    .filter((contact) => contact.id !== currentEditId)
    .forEach((contact) => options.push(`<option value="${contact.id}">${escapeHtml(contact.name || "Unbekannt")}</option>`));
  elements.relationContactId.innerHTML = options.join("");
  elements.relationContactId.value = currentValue;
}

function switchTab(tabName) {
  elements.tabLinks.forEach((button) => button.classList.toggle("active", button.dataset.target === tabName));
  elements.tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.tab === tabName));
}

function openDialog(id = null) {
  currentEditId = id;
  const contact = contacts.find((item) => item.id === id);

  elements.form.reset();
  refreshRelationOptions(contact?.relationContactId || "");

  if (contact) {
    elements.title.textContent = "Person bearbeiten";
    elements.deleteButton.classList.remove("hidden");
    for (const [key, value] of Object.entries(contact)) {
      const field = elements.form.elements.namedItem(key);
      if (field) field.value = value;
    }
  } else {
    elements.title.textContent = "Neue Person";
    elements.deleteButton.classList.add("hidden");
  }

  elements.dialog.showModal();
}

function onSave(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(elements.form).entries());

  if (!categories.includes(payload.category)) {
    categories.push(payload.category);
    persistCategories();
    renderCategoryControls();
  }

  if (currentEditId) {
    contacts = contacts.map((contact) => (contact.id === currentEditId ? { ...contact, ...payload } : contact));
  } else {
    contacts.unshift({ id: crypto.randomUUID(), ...payload, createdAt: Date.now() });
  }

  persistContacts();
  elements.dialog.close();
  render();
}

function onDelete() {
  if (!currentEditId) return;
  contacts = contacts.filter((contact) => contact.id !== currentEditId);
  contacts = contacts.map((contact) =>
    contact.relationContactId === currentEditId ? { ...contact, relationContactId: "", relationType: "" } : contact,
  );
  persistContacts();
  elements.dialog.close();
  render();
}

function clearData() {
  if (!confirm("Wirklich alle Kontakte löschen?")) return;
  contacts = [];
  categories = [...DEFAULT_CATEGORIES];
  persistContacts();
  persistCategories();
  renderCategoryControls();
  render();
}

function exportData() {
  const payload = { contacts, categories, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "people-memory-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

function loadDemoData() {
  if (contacts.length && !confirm("Es gibt bereits Daten. Demo-Daten trotzdem laden?")) return;

  contacts = [
    {
      id: crypto.randomUUID(),
      name: "Anna Becker",
      category: "Beruf",
      address: "Köln",
      birthday: "1990-03-14",
      job: "Projektmanagerin",
      source: "Networking Event",
      relationship: "Kundin",
      spouseName: "Markus Becker",
      childrenNames: "Emma, Noah",
      childrenGenders: "w, m",
      privateNotes: "Mag Städtereisen und guten Kaffee.",
      workNotes: "Interessiert an KI-Automatisierung.",
      sportsInterests: "Yoga, Laufen",
      politicalInterests: "Bildungspolitik",
      hobbies: "Fotografie, Lesen",
      conversationHints: "Frage nach Barcelona-Trip.",
      relationContactId: "",
      relationType: "",
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Mehmet Yilmaz",
      category: "Freunde",
      address: "Hamburg",
      birthday: "1988-11-05",
      job: "Softwareentwickler",
      source: "Fußballverein",
      relationship: "Freund",
      spouseName: "Aylin Yilmaz",
      childrenNames: "",
      childrenGenders: "",
      privateNotes: "Plant Hausrenovierung.",
      workNotes: "Wechselt evtl. in Teamlead-Rolle.",
      sportsInterests: "Fußball, Fitness",
      politicalInterests: "Digitalpolitik",
      hobbies: "Gaming, Grillen",
      conversationHints: "Nächstes Spiel am Wochenende.",
      relationContactId: "",
      relationType: "",
      createdAt: Date.now() - 1000,
    },
  ];

  contacts[1].relationContactId = contacts[0].id;
  contacts[1].relationType = "kennt über gemeinsames Projekt";

  persistContacts();
  switchTab("kontakte");
  render();
}

function getFilteredContacts() {
  const query = elements.search.value.trim().toLowerCase();
  const filterCategory = elements.categoryFilter.value;

  return contacts.filter((contact) => {
    const categoryMatch = !filterCategory || contact.category === filterCategory;
    const fullText = Object.values(contact).join(" ").toLowerCase();
    return categoryMatch && (!query || fullText.includes(query));
  });
}

function render() {
  const filtered = getFilteredContacts();
  renderStats(filtered);
  renderCategories();
  renderHomeCharts();
  renderBirthdays();

  elements.list.innerHTML = "";
  if (!filtered.length) {
    elements.list.innerHTML = '<p class="empty-state card">Noch keine passenden Personen gefunden.</p>';
    return;
  }

  filtered.forEach((contact) => {
    const node = elements.template.content.firstElementChild.cloneNode(true);
    const relationName = getContactNameById(contact.relationContactId);

    node.querySelector(".person-name").textContent = contact.name || "Unbekannt";
    node.querySelector(".category-chip").textContent = contact.category || "-";
    node.querySelector(".person-meta").textContent = [contact.job, contact.address, contact.birthday].filter(Boolean).join(" • ");

    const tags = [contact.hobbies, contact.sportsInterests, contact.relationship].filter(Boolean).slice(0, 3);
    node.querySelector(".tag-list").innerHTML = tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("");

    const details = [
      ["👫 Ehepartner/in", contact.spouseName],
      ["👧 Kinder Namen", contact.childrenNames],
      ["⚧ Geschlechter Kinder", contact.childrenGenders],
      ["🏡 Privates", contact.privateNotes],
      ["💼 Berufliches", contact.workNotes],
      ["🏃 Sport", contact.sportsInterests],
      ["🗳️ Politik", contact.politicalInterests],
      ["🤝 Woher kennt ihr euch", contact.source],
      ["💬 Gesprächsnotizen", contact.conversationHints],
      ["🔗 Verknüpfter Kontakt", relationName],
      ["🔎 Art der Beziehung", contact.relationType],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`)
      .join("");

    node.querySelector(".details-content").innerHTML = `${details}<button class="btn" data-edit-id="${contact.id}">Bearbeiten</button>`;
    elements.list.appendChild(node);
  });
}

function getContactNameById(id) {
  if (!id) return "";
  return contacts.find((contact) => contact.id === id)?.name || "(nicht gefunden)";
}

function renderStats(filteredContacts) {
  const total = contacts.length;
  const withFamilyData = contacts.filter((c) => c.childrenNames || c.spouseName).length;
  const linkedContacts = contacts.filter((c) => c.relationContactId).length;

  const cards = [
    ["Gesamt", total],
    ["Gefiltert", filteredContacts.length],
    ["Familieninfos", withFamilyData],
    ["Verknüpft", linkedContacts],
  ];

  elements.stats.innerHTML = cards
    .map(([label, value]) => `<article class="stat-card card"><span>${escapeHtml(label)}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderHomeCharts() {
  const byCategory = getCategoryCounts();
  const maxValue = Math.max(1, ...Object.values(byCategory));

  if (!Object.keys(byCategory).length) {
    elements.homeCharts.innerHTML = '<p class="empty-state">Noch keine Daten für Diagramme.</p>';
    return;
  }

  elements.homeCharts.innerHTML = Object.entries(byCategory)
    .map(([category, count]) => {
      const percent = Math.round((count / maxValue) * 100);
      return `
        <div class="chart-row">
          <span>${escapeHtml(category)} (${count})</span>
          <div class="bar"><div style="width:${percent}%"></div></div>
        </div>
      `;
    })
    .join("");
}

function renderBirthdays() {
  const upcoming = contacts
    .filter((c) => c.birthday)
    .sort((a, b) => nextBirthdayTimestamp(a.birthday) - nextBirthdayTimestamp(b.birthday))
    .slice(0, 5);

  if (!upcoming.length) {
    elements.birthdayList.innerHTML = "<li>Keine Geburtstage eingetragen.</li>";
    return;
  }

  elements.birthdayList.innerHTML = upcoming
    .map((contact) => `<li>🎉 <strong>${escapeHtml(contact.name)}</strong> – ${escapeHtml(contact.birthday)}</li>`)
    .join("");
}

function nextBirthdayTimestamp(dateString) {
  const today = new Date();
  const [year, month, day] = dateString.split("-").map(Number);
  const next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return next.getTime();
}

function renderCategories() {
  const byCategory = getCategoryCounts();
  const rows = categories.map((category) => [category, byCategory[category] || 0]);

  elements.categoryOverview.innerHTML = rows
    .map(
      ([category, count]) =>
        `<button class="category-tile" data-category="${escapeHtml(category)}"><strong>${escapeHtml(category)}</strong><br /><span>${count} Kontakt(e)</span></button>`,
    )
    .join("");
}

function getCategoryCounts() {
  return contacts.reduce((acc, contact) => {
    const key = contact.category || "Ohne Kategorie";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
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
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service Worker konnte nicht registriert werden", error);
    });
  }
}
