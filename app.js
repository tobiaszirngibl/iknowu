const STORAGE_KEY = "people-memory.contacts.v1";

const elements = {
  addBtn: document.querySelector("#addPersonButton"),
  seedButton: document.querySelector("#seedButton"),
  list: document.querySelector("#personList"),
  stats: document.querySelector("#stats"),
  dialog: document.querySelector("#personDialog"),
  closeDialog: document.querySelector("#closeDialog"),
  form: document.querySelector("#personForm"),
  title: document.querySelector("#dialogTitle"),
  deleteButton: document.querySelector("#deleteButton"),
  search: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  template: document.querySelector("#personCardTemplate"),
  tabLinks: document.querySelectorAll(".tab-link"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  categoryOverview: document.querySelector("#categoryOverview"),
  exportButton: document.querySelector("#exportButton"),
  clearButton: document.querySelector("#clearButton"),
};

let contacts = loadContacts();
let currentEditId = null;

render();
registerServiceWorker();

// interactions

elements.addBtn.addEventListener("click", () => openDialog());
elements.seedButton.addEventListener("click", loadDemoData);
elements.closeDialog.addEventListener("click", () => elements.dialog.close());
elements.form.addEventListener("submit", onSave);
elements.deleteButton.addEventListener("click", onDelete);
elements.search.addEventListener("input", render);
elements.categoryFilter.addEventListener("change", render);
elements.exportButton.addEventListener("click", exportData);
elements.clearButton.addEventListener("click", clearData);

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

function loadDemoData() {
  if (contacts.length && !confirm("Es gibt bereits Daten. Demo-Daten trotzdem laden?")) {
    return;
  }

  contacts = [
    {
      id: crypto.randomUUID(),
      name: "Anna Becker",
      category: "Beruf",
      address: "Köln",
      birthday: "1990-03-14",
      job: "Projektmanagerin",
      relationship: "Kundin",
      source: "Networking Event 2024",
      privateNotes: "Mag Städtereisen und guten Kaffee.",
      workNotes: "Interessiert an KI-Automatisierung.",
      sportsInterests: "Yoga, Laufen",
      politicalInterests: "Bildungspolitik",
      hobbies: "Fotografie, Lesen",
      family: "2 Kinder",
      conversationHints: "Frage nach dem letzten Barcelona-Trip.",
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Mehmet Yilmaz",
      category: "Freunde",
      address: "Hamburg",
      birthday: "1988-11-05",
      job: "Softwareentwickler",
      relationship: "Freund",
      source: "Fußballverein",
      privateNotes: "Plant Hausrenovierung.",
      workNotes: "Wechselt evtl. in Teamlead-Rolle.",
      sportsInterests: "Fußball, Fitness",
      politicalInterests: "Digitalpolitik",
      hobbies: "Gaming, Grillen",
      family: "Verheiratet",
      conversationHints: "Nächstes Spiel am Wochenende.",
      createdAt: Date.now() - 1000,
    },
  ];

  persistContacts();
  switchTab("kontakte");
  render();
}

function switchTab(tabName) {
  elements.tabLinks.forEach((button) => button.classList.toggle("active", button.dataset.target === tabName));
  elements.tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.tab === tabName));
}

function loadContacts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function openDialog(id = null) {
  currentEditId = id;
  const contact = contacts.find((item) => item.id === id);

  elements.form.reset();
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
  persistContacts();
  elements.dialog.close();
  render();
}

function clearData() {
  if (!confirm("Wirklich alle Kontakte löschen?")) return;
  contacts = [];
  persistContacts();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "people-memory-export.json";
  link.click();
  URL.revokeObjectURL(url);
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

  elements.list.innerHTML = "";
  if (!filtered.length) {
    elements.list.innerHTML = '<p class="empty-state card">Noch keine passenden Personen gefunden.</p>';
    return;
  }

  filtered.forEach((contact) => {
    const node = elements.template.content.firstElementChild.cloneNode(true);
    node.querySelector(".person-name").textContent = contact.name || "Unbekannt";
    node.querySelector(".category-chip").textContent = contact.category || "-";
    node.querySelector(".person-meta").textContent = [contact.job, contact.address, contact.birthday].filter(Boolean).join(" • ");

    const tags = [contact.hobbies, contact.sportsInterests, contact.relationship].filter(Boolean).slice(0, 3);
    node.querySelector(".tag-list").innerHTML = tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("");

    const detailsHtml = [
      ["Privates", contact.privateNotes],
      ["Berufliches", contact.workNotes],
      ["Politik", contact.politicalInterests],
      ["Familie", contact.family],
      ["Woher kennt ihr euch", contact.source],
      ["Gesprächsnotizen", contact.conversationHints],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`)
      .join("");

    node.querySelector(".details-content").innerHTML = `${detailsHtml}<button class="btn" data-edit-id="${contact.id}">Bearbeiten</button>`;
    elements.list.appendChild(node);
  });
}

function renderStats(filteredContacts) {
  const total = contacts.length;
  const byCategory = getCategoryCounts();
  const cards = [["Gesamt", total], ["Gefiltert", filteredContacts.length], ...Object.entries(byCategory).slice(0, 2)];

  elements.stats.innerHTML = cards
    .map(([label, value]) => `<article class="stat-card card"><span>${escapeHtml(label)}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderCategories() {
  const byCategory = getCategoryCounts();
  const rows = Object.entries(byCategory);
  if (!rows.length) {
    elements.categoryOverview.innerHTML = '<p class="empty-state">Noch keine Kategorien vorhanden.</p>';
    return;
  }

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
