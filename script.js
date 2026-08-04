(function () {
  "use strict";

  const REPO = "I-C-Flesan/assets-flesan";
  const BRANCH = "main";
  const API_TREE =
    "https://api.github.com/repos/" + REPO + "/git/trees/" + BRANCH + "?recursive=1";

  const IMAGE_EXT = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "webp",
    "bmp",
    "ico",
    "avif",
    "tiff"
  ];

  const EXCLUDED_FILES = [
    "index.html",
    "styles.css",
    "script.js",
    "README.md",
    "README",
    ".gitkeep",
    ".DS_Store"
  ];

  function getBaseUrl() {
    const pathname = window.location.pathname;
    const base = pathname.replace(/[^/]*$/, "");
    return window.location.origin + base;
  }

  function formatSize(bytes) {
    if (bytes === undefined || bytes === null) return "";
    if (bytes < 1024) return bytes + " B";
    const units = ["KB", "MB", "GB"];
    let size = bytes;
    let i = -1;
    do {
      size /= 1024;
      i++;
    } while (size >= 1024 && i < units.length - 1);
    return size.toFixed(1) + " " + units[i];
  }

  function isImage(path) {
    const ext = path.split(".").pop().toLowerCase();
    return IMAGE_EXT.indexOf(ext) !== -1;
  }

  function buildJson(tree) {
    const baseUrl = getBaseUrl();
    const assets = tree
      .filter(function (item) {
        return item.type === "blob" && EXCLUDED_FILES.indexOf(item.path) === -1;
      })
      .map(function (item) {
        const parts = item.path.split("/");
        const name = parts.pop();
        const folder = parts.join("/") || "__root__";
        return {
          name: name,
          folder: folder,
          path: item.path,
          url: baseUrl + item.path,
          size: item.size,
          image: isImage(item.path)
        };
      });

    const folderMap = {};
    assets.forEach(function (asset) {
      if (!folderMap[asset.folder]) folderMap[asset.folder] = [];
      folderMap[asset.folder].push(asset);
    });

    const folders = Object.keys(folderMap)
      .sort(function (a, b) {
        return a.localeCompare(b);
      })
      .map(function (name) {
        return {
          name: name,
          assets: folderMap[name].sort(function (a, b) {
            return a.name.localeCompare(b.name);
          })
        };
      });

    return {
      repo: REPO,
      branch: BRANCH,
      baseUrl: baseUrl,
      totalAssets: assets.length,
      folders: folders
    };
  }

  function folderLabel(folder) {
    return folder === "__root__" ? "Raíz" : folder;
  }

  function createCard(asset) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.search = (asset.name + " " + asset.path).toLowerCase();

    const preview = document.createElement("div");
    preview.className = "card-preview";

    if (asset.image) {
      const img = document.createElement("img");
      img.src = asset.url;
      img.alt = asset.name;
      img.loading = "lazy";
      preview.appendChild(img);
    } else {
      const parts = asset.name.split(".");
      const ext = parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
      const placeholder = document.createElement("span");
      placeholder.className = "file-placeholder";
      placeholder.textContent = ext;
      preview.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const name = document.createElement("h3");
    name.className = "card-name";
    name.title = asset.path;
    name.textContent = asset.name;

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.textContent = [folderLabel(asset.folder), formatSize(asset.size)]
      .filter(Boolean)
      .join(" · ");

    const link = document.createElement("a");
    link.className = "card-link";
    link.href = asset.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = asset.url;
    link.title = asset.url;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.type = "button";
    copyBtn.textContent = "Copiar link";
    copyBtn.addEventListener("click", function () {
      copyToClipboard(asset.url, copyBtn);
    });

    body.appendChild(name);
    body.appendChild(meta);
    body.appendChild(link);
    body.appendChild(copyBtn);

    card.appendChild(preview);
    card.appendChild(body);
    return card;
  }

  function render(json) {
    const content = document.getElementById("content");
    content.innerHTML = "";

    const badge = document.getElementById("count-badge");
    badge.textContent = json.totalAssets + (json.totalAssets === 1 ? " asset" : " assets");

    if (json.folders.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No se encontraron assets en el repositorio.";
      content.appendChild(empty);
      return;
    }

    json.folders.forEach(function (folder) {
      const section = document.createElement("section");
      section.className = "section";

      const title = document.createElement("h2");
      title.className = "section-title";
      title.textContent = folderLabel(folder.name);

      const grid = document.createElement("div");
      grid.className = "grid";
      folder.assets.forEach(function (asset) {
        grid.appendChild(createCard(asset));
      });

      section.appendChild(title);
      section.appendChild(grid);
      content.appendChild(section);
    });
  }

  function copyToClipboard(text, btn) {
    const done = function () {
      const original = btn.textContent;
      btn.textContent = "¡Copiado!";
      btn.classList.add("copied");
      showToast("Link copiado al portapapeles");
      setTimeout(function () {
        btn.textContent = original;
        btn.classList.remove("copied");
      }, 1500);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text, done);
      });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch (e) {
      showToast("No se pudo copiar automáticamente");
    }
    document.body.removeChild(ta);
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2000);
  }

  function setupSearch() {
    const input = document.getElementById("search");
    input.addEventListener("input", function () {
      const q = input.value.trim().toLowerCase();
      const cards = document.querySelectorAll(".card");
      const sections = document.querySelectorAll(".section");
      let visible = 0;

      cards.forEach(function (card) {
        const match = !q || card.dataset.search.indexOf(q) !== -1;
        card.style.display = match ? "" : "none";
        if (match) visible++;
      });

      sections.forEach(function (section) {
        const hasVisible = Array.prototype.some.call(
          section.querySelectorAll(".card"),
          function (c) {
            return c.style.display !== "none";
          }
        );
        section.style.display = hasVisible ? "" : "none";
      });

      const badge = document.getElementById("count-badge");
      badge.textContent = visible + (visible === 1 ? " asset" : " assets");
    });
  }

  function showError(message) {
    const content = document.getElementById("content");
    const err = document.createElement("div");
    err.className = "error";

    const h = document.createElement("h2");
    h.textContent = "No se pudieron cargar los assets";

    const p1 = document.createElement("p");
    p1.textContent = message;

    const p2 = document.createElement("p");
    p2.textContent = "Verifica tu conexión a internet o el límite de la GitHub API.";

    err.appendChild(h);
    err.appendChild(p1);
    err.appendChild(p2);
    content.innerHTML = "";
    content.appendChild(err);
  }

  async function init() {
    try {
      const res = await fetch(API_TREE);
      if (!res.ok) {
        throw new Error("HTTP " + res.status + " al consultar la GitHub API");
      }
      const data = await res.json();
      if (data.truncated) {
        console.warn("El árbol de GitHub API fue truncado.");
      }
      const json = buildJson(data.tree || []);
      render(json);
      setupSearch();
    } catch (err) {
      showError(err.message);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
