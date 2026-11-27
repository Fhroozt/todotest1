(() => {
  const STORAGE_KEY = "att-gora.v1";
  const MAX_TITLE = 200;

  const listLabels = {
    all: "Alla uppgifter",
    active: "Aktiva uppgifter",
    done: "Klara uppgifter",
  };

  const emptyCopy = {
    all: "Inget här ännu. Lägg till din första uppgift.",
    active: "Inga aktiva uppgifter.",
    done: "Inga klara uppgifter.",
  };

  const todayEl = document.querySelector("#today");
  const composer = document.querySelector("#composer");
  const composerInput = document.querySelector("#ny-uppgift");
  const composerError = document.querySelector("#composer-error");
  const countEl = document.querySelector("#count");
  const list = document.querySelector("#list");
  const empty = document.querySelector("#empty");
  const emptyText = document.querySelector("#empty-text");
  const clearBtn = document.querySelector("#clear");
  const hint = document.querySelector("#hint");
  const storageNote = document.querySelector("#storage-note");
  const statusEl = document.querySelector("#status");

  /** @type {{id: string, title: string, completed: boolean}[]} */
  let tasks = [];
  let filter = "all";
  let editingId = null;
  let justAdded = null;
  let blurRenderToken = 0;
  const closedEdits = new Set();

  const pencilSvg = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z"/></svg>`;
  const trashSvg = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L18.5 7"/><path d="M10 11v6M14 11v6"/></svg>`;

  function uid() {
    try {
      if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    } catch {
      /* file:// and older browsers fall through */
    }
    return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function cleanTitle(value) {
    return String(value).replace(/[\r\n]+/g, " ").trim().slice(0, MAX_TITLE);
  }

  function announce(message) {
    statusEl.textContent = "";
    window.setTimeout(() => {
      statusEl.textContent = message;
    }, 30);
  }

  function remainingCount() {
    return tasks.reduce((sum, task) => sum + (task.completed ? 0 : 1), 0);
  }

  function isVisible(task) {
    if (filter === "active") return !task.completed;
    if (filter === "done") return task.completed;
    return true;
  }

  function showStorageNote(show) {
    storageNote.hidden = !show;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;
      const seen = new Set();
      const next = [];
      if (Array.isArray(data.tasks)) {
        for (const item of data.tasks) {
          const task = normalize(item, seen);
          if (task) next.push(task);
        }
      }
      tasks = next;
      if (data.filter === "all" || data.filter === "active" || data.filter === "done") {
        filter = data.filter;
      }
    } catch {
      tasks = [];
      filter = "all";
      showStorageNote(true);
    }
  }

  function normalize(item, seen) {
    if (!item || typeof item !== "object") return null;
    if (typeof item.id !== "string" || item.id.length === 0 || seen.has(item.id)) return null;
    if (typeof item.title !== "string") return null;
    const title = cleanTitle(item.title);
    if (!title) return null;
    seen.add(item.id);
    return { id: item.id, title, completed: item.completed === true };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, filter }));
      showStorageNote(false);
    } catch {
      showStorageNote(true);
    }
  }

  function syncFilterControl() {
    const radio = document.querySelector(`input[name="filter"][value="${filter}"]`);
    if (radio) radio.checked = true;
  }

  function focusByKey(key, select) {
    if (!key) return;
    const el = document.querySelector(`[data-focus-key="${CSS.escape(key)}"]`);
    if (!el) return;
    if (document.activeElement !== el) el.focus();
    if (select && el instanceof HTMLInputElement) el.select();
  }

  function render(options = {}) {
    blurRenderToken += 1;
    const explicit = Object.prototype.hasOwnProperty.call(options, "focusKey");
    const focusKey = explicit
      ? options.focusKey
      : document.activeElement?.getAttribute?.("data-focus-key") || null;

    const visible = tasks.filter(isVisible);
    list.replaceChildren(...visible.map(renderTask));
    list.hidden = visible.length === 0;
    list.setAttribute("aria-label", listLabels[filter] || "Uppgifter");

    countEl.textContent = `${remainingCount()} kvar`;
    clearBtn.disabled = !tasks.some((task) => task.completed);

    const showEmpty = visible.length === 0;
    empty.hidden = !showEmpty;
    if (showEmpty) emptyText.textContent = emptyCopy[filter] || emptyCopy.all;

    hint.hidden = tasks.length === 0;
    justAdded = null;

    if (focusKey) focusByKey(focusKey, options.select === true);
  }

  function renderTask(task) {
    const item = document.createElement("li");
    item.className = "task";
    item.dataset.id = task.id;
    if (task.completed) item.classList.add("is-done");
    if (task.id === justAdded) item.classList.add("is-new");

    if (editingId === task.id) {
      item.classList.add("is-editing");
      item.dataset.mode = "edit";
      item.append(renderEditor(task));
      return item;
    }

    item.dataset.mode = "view";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "check";
    checkbox.checked = task.completed;
    checkbox.dataset.id = task.id;
    checkbox.dataset.focusKey = `check-${task.id}`;
    const titleId = `title-${task.id}`;
    checkbox.setAttribute("aria-labelledby", titleId);

    const title = document.createElement("span");
    title.id = titleId;
    title.className = "title";
    title.textContent = task.title;

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(iconButton("edit", task, "Redigera", pencilSvg), iconButton("delete", task, "Ta bort", trashSvg));

    item.append(checkbox, title, actions);
    return item;
  }

  function iconButton(action, task, label, svg) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action === "delete" ? "icon-btn icon-btn-danger" : "icon-btn";
    button.dataset.action = action;
    button.dataset.id = task.id;
    button.dataset.focusKey = `${action}-${task.id}`;
    button.setAttribute("aria-label", `${label}: ${task.title}`);
    button.innerHTML = svg;
    return button;
  }

  function renderEditor(task) {
    const form = document.createElement("form");
    form.className = "edit-form";
    form.autocomplete = "off";

    const label = document.createElement("label");
    label.className = "sr-only";
    label.htmlFor = `edit-${task.id}`;
    label.textContent = "Redigera uppgift";

    const input = document.createElement("input");
    input.id = `edit-${task.id}`;
    input.className = "task-edit";
    input.type = "text";
    input.value = task.title;
    input.maxLength = MAX_TITLE;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.dataset.id = task.id;
    input.dataset.focusKey = `edit-input-${task.id}`;
    input.setAttribute("aria-label", `Redigera: ${task.title}`);

    const actions = document.createElement("div");
    actions.className = "edit-actions";

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn-primary btn-small";
    save.textContent = "Spara";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost btn-small";
    cancel.dataset.action = "cancel";
    cancel.dataset.id = task.id;
    cancel.textContent = "Avbryt";

    actions.append(save, cancel);
    form.append(label, input, actions);
    return form;
  }

  function showComposerError(show) {
    composerError.hidden = !show;
    composerInput.setAttribute("aria-invalid", show ? "true" : "false");
    if (show) composerInput.setAttribute("aria-describedby", "composer-error");
    else composerInput.removeAttribute("aria-describedby");
  }

  function addTask(title) {
    const task = { id: uid(), title, completed: false };
    tasks.push(task);
    justAdded = task.id;
    save();
    announce("Uppgift tillagd.");
    render({ focusKey: "composer" });
    const added = list.querySelector(`[data-id="${CSS.escape(task.id)}"]`);
    if (added && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      added.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    task.completed = !task.completed;
    save();
    render({ focusKey: `check-${id}` });
  }

  function removeTask(id) {
    const visible = tasks.filter(isVisible);
    const visibleIndex = visible.findIndex((item) => item.id === id);
    const index = tasks.findIndex((item) => item.id === id);
    if (index === -1) return;
    tasks.splice(index, 1);
    if (editingId === id) editingId = null;
    closedEdits.add(id);
    save();
    announce("Uppgift borttagen.");
    const stillVisible = tasks.filter(isVisible);
    const next = stillVisible[visibleIndex] || stillVisible[visibleIndex - 1];
    render({ focusKey: next ? `check-${next.id}` : "composer" });
  }

  function applyTitle(id, value) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return "missing";
    const title = cleanTitle(value);
    if (!title) return "empty";
    if (title === task.title) return "same";
    task.title = title;
    save();
    return "changed";
  }

  function commitEditModel(id, value, cancel) {
    if (closedEdits.has(id)) return false;
    closedEdits.add(id);
    window.setTimeout(() => closedEdits.delete(id), 150);
    if (!cancel) {
      const result = applyTitle(id, value);
      if (result === "empty") announce("Skriv en text, eller ta bort uppgiften.");
      else if (result === "changed") announce("Uppgift ändrad.");
    }
    if (editingId === id) editingId = null;
    return true;
  }

  function finishEdit(id, value, options = {}) {
    commitEditModel(id, value, options.cancel === true);
    if (editingId === id) editingId = null;
    render({ focusKey: options.focusKey || `edit-${id}` });
  }

  function startEdit(id) {
    if (!tasks.some((task) => task.id === id)) return;
    closedEdits.delete(id);
    editingId = id;
    render({ focusKey: `edit-input-${id}`, select: true });
  }

  function clearCompleted() {
    const hadCompleted = tasks.some((task) => task.completed);
    if (!hadCompleted) return;
    tasks = tasks.filter((task) => !task.completed);
    if (editingId && !tasks.some((task) => task.id === editingId)) editingId = null;
    save();
    announce("Klara uppgifter togs bort.");
    render({ focusKey: "clear" });
    if (clearBtn.disabled) composerInput.focus();
  }

  function eventElement(target) {
    if (target instanceof Element) return target;
    return target?.parentElement ?? null;
  }

  function writeDate() {
    todayEl.textContent = new Intl.DateTimeFormat("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  }

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = cleanTitle(composerInput.value);
    if (!title) {
      showComposerError(true);
      composerInput.focus();
      return;
    }
    showComposerError(false);
    composerInput.value = "";
    addTask(title);
  });

  composerInput.addEventListener("input", () => {
    if (cleanTitle(composerInput.value)) showComposerError(false);
  });

  composerInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && composerInput.value) {
      composerInput.value = "";
      showComposerError(false);
    }
  });

  document.querySelectorAll('input[name="filter"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      filter = radio.value;
      save();
      render();
    });
  });

  clearBtn.addEventListener("click", clearCompleted);

  list.addEventListener("mousedown", (event) => {
    const origin = eventElement(event.target);
    if (origin?.closest(".edit-form button")) event.preventDefault();
  });

  list.addEventListener("submit", (event) => {
    const form = eventElement(event.target)?.closest(".edit-form");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector(".task-edit");
    finishEdit(input.dataset.id, input.value);
  });

  list.addEventListener("click", (event) => {
    const button = eventElement(event.target)?.closest("button");
    if (!button || !list.contains(button)) return;
    const id = button.dataset.id;
    if (button.dataset.action === "edit") startEdit(id);
    else if (button.dataset.action === "delete") removeTask(id);
    else if (button.dataset.action === "cancel") finishEdit(id, "", { cancel: true });
  });

  list.addEventListener("dblclick", (event) => {
    const origin = eventElement(event.target);
    if (!origin || origin.closest("button, input")) return;
    const item = origin.closest(".task");
    if (!item || item.dataset.mode === "edit") return;
    startEdit(item.dataset.id);
  });

  list.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.classList.contains("check")) {
      toggleTask(input.dataset.id);
    }
  });

  list.addEventListener("keydown", (event) => {
    if (!event.target.classList?.contains("task-edit")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      finishEdit(event.target.dataset.id, event.target.value, { cancel: true });
    }
  });

  list.addEventListener("focusout", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("task-edit")) return;
    const form = input.closest(".edit-form");
    if (event.relatedTarget && form?.contains(event.relatedTarget)) return;

    const id = input.dataset.id;
    const value = input.value;
    if (closedEdits.has(id)) return;

    const movedOutside = Boolean(event.relatedTarget);
    if (movedOutside) commitEditModel(id, value, false);

    const token = ++blurRenderToken;
    window.setTimeout(() => {
      if (token !== blurRenderToken) return;
      if (!movedOutside) {
        if (input.isConnected && form?.contains(document.activeElement)) return;
        if (closedEdits.has(id)) return;
        commitEditModel(id, value, false);
      }
      render();
    }, 0);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    editingId = null;
    load();
    syncFilterControl();
    render();
  });

  load();
  syncFilterControl();
  writeDate();
  render();
})();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const registerWorker = () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
  };
  if (document.readyState === "complete") registerWorker();
  else window.addEventListener("load", registerWorker);
}

// Installed app windows remember the user's size after the first launch.
// Browsers ignore resizeTo in a normal tab, and may ignore it here too.
(function requestCompactStandaloneWindow() {
  let standalone = false;
  try {
    standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches;
  } catch {
    return;
  }
  if (!standalone) return;

  const key = "att-gora.compact-window";
  try {
    if (localStorage.getItem(key) === "1") return;
  } catch {
    /* storage may be blocked; still try once this load */
  }

  const apply = () => {
    try {
      window.resizeTo(440, 720);
    } catch {
      return;
    }
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* the browser keeps the size if the resize was allowed */
    }
  };

  if (document.readyState === "complete") apply();
  else window.addEventListener("load", apply, { once: true });
})();
