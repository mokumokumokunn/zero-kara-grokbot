(function () {
  var button = document.querySelector(".nav-button");
  var list = document.getElementById("site-nav-list");

  if (button && list) {
    button.addEventListener("click", function () {
      var open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", open ? "false" : "true");
      list.classList.toggle("is-open", !open);
    });
  }

  document.querySelectorAll(".copy-button").forEach(function (copyButton) {
    copyButton.addEventListener("click", function () {
      var box = copyButton.closest(".ask");
      var textNode = box ? box.querySelector(".ask-text") : null;
      var text = textNode ? textNode.textContent.replace(/^\s+|\s+$/g, "") : "";
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        return;
      }
      navigator.clipboard.writeText(text).then(function () {
        copyButton.textContent = "コピーしました";
        window.setTimeout(function () {
          copyButton.textContent = "コピー";
        }, 2000);
      });
    });
  });
})();

(function () {
  var form = document.querySelector(".site-search");
  var input = document.getElementById("site-search");
  var panel = document.getElementById("search-panel");
  var status = document.getElementById("search-status");
  var results = document.getElementById("search-results");
  if (!form || !input || !panel || !status || !results) {
    return;
  }

  var indexPromise = null;
  var requestId = 0;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch("search-index.json").then(function (response) {
        if (!response.ok) {
          throw new Error("index");
        }
        return response.json();
      });
    }
    return indexPromise;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch];
    });
  }

  function hidePanel() {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    status.textContent = "";
    results.textContent = "";
  }

  function showPanel() {
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function highlight(value, needle) {
    var hay = value.toLowerCase();
    var out = "";
    var from = 0;
    while (from < value.length) {
      var at = hay.indexOf(needle, from);
      if (at < 0) {
        out += escapeHtml(value.slice(from));
        break;
      }
      out += escapeHtml(value.slice(from, at));
      out += "<mark>" + escapeHtml(value.slice(at, at + needle.length)) + "</mark>";
      from = at + needle.length;
    }
    return out;
  }

  function snippet(text, needle, skipUntil) {
    var hay = text.toLowerCase();
    var at = hay.indexOf(needle, skipUntil || 0);
    if (at < 0) {
      return "";
    }
    var start = Math.max(0, at - 28);
    var end = Math.min(text.length, at + needle.length + 52);
    var prefix = start > 0 ? "…" : "";
    var suffix = end < text.length ? "…" : "";
    return prefix +
      escapeHtml(text.slice(start, at)) +
      "<mark>" + escapeHtml(text.slice(at, at + needle.length)) + "</mark>" +
      escapeHtml(text.slice(at + needle.length, end)) +
      suffix;
  }

  function render(pages, query) {
    var needle = query.toLowerCase();
    var hits = [];
    pages.forEach(function (page) {
      if (!page || !/^[a-z0-9.-]+\.html$/.test(page.url || "")) {
        return;
      }
      var title = page.title || page.url;
      var text = page.text || "";
      var blob = (title + " " + text).toLowerCase();
      if (blob.indexOf(needle) < 0) {
        return;
      }
      var count = 0;
      var from = 0;
      while (from < blob.length) {
        var found = blob.indexOf(needle, from);
        if (found < 0) {
          break;
        }
        count += 1;
        from = found + needle.length;
      }
      hits.push({
        title: title,
        url: page.url,
        text: text,
        count: count,
        titleHit: title.toLowerCase().indexOf(needle) !== -1
      });
    });
    hits.sort(function (a, b) {
      if (a.titleHit !== b.titleHit) {
        return a.titleHit ? -1 : 1;
      }
      return b.count - a.count;
    });

    results.textContent = "";
    if (!hits.length) {
      status.innerHTML = "見つかりませんでした。<a href=\"faq.html\">よくある質問</a>か、<a href=\"beginner.html\">初級</a>を見てみてください。";
      showPanel();
      return;
    }

    status.textContent = hits.length + "件見つかりました。";
    hits.forEach(function (hit) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = hit.url;
      var body = hit.text;
      var skip = 0;
      if (body.indexOf(hit.title) === 0) {
        skip = hit.title.length;
      }
      var extract = snippet(body, needle, skip);
      if (!extract) {
        extract = snippet(hit.title, needle, 0);
      }
      link.innerHTML = "<span class=\"search-hit\">" + highlight(hit.title, needle) + "</span>" +
        (extract ? "<span class=\"search-snippet\">" + extract + "</span>" : "");
      item.appendChild(link);
      results.appendChild(item);
    });
    showPanel();
  }

  function searchNow() {
    var query = input.value.replace(/^\s+|\s+$/g, "");
    var current = ++requestId;
    if (!query) {
      hidePanel();
      return;
    }
    loadIndex().then(function (pages) {
      if (current !== requestId) {
        return;
      }
      if (!Array.isArray(pages)) {
        throw new Error("index");
      }
      render(pages, query);
    }).catch(function () {
      if (current !== requestId) {
        return;
      }
      results.textContent = "";
      status.innerHTML = "検索の準備ができませんでした。<a href=\"faq.html\">よくある質問</a>を開いてください。";
      showPanel();
    });
  }

  input.addEventListener("input", searchNow);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (panel.hidden) {
      return;
    }
    var first = results.querySelector("a");
    if (first) {
      window.location.href = first.href;
    }
  });

  input.addEventListener("keydown", function (event) {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === "Escape") {
      hidePanel();
      return;
    }
    if (event.key === "ArrowDown") {
      var first = results.querySelector("a");
      if (first && !panel.hidden) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  results.addEventListener("keydown", function (event) {
    var links = Array.prototype.slice.call(results.querySelectorAll("a"));
    var index = links.indexOf(document.activeElement);
    if (event.key === "ArrowDown" && index >= 0 && index < links.length - 1) {
      event.preventDefault();
      links[index + 1].focus();
    } else if (event.key === "ArrowUp" && index >= 0) {
      event.preventDefault();
      if (index === 0) {
        input.focus();
      } else {
        links[index - 1].focus();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      input.focus();
      hidePanel();
    }
  });

  document.addEventListener("click", function (event) {
    if (!form.contains(event.target)) {
      hidePanel();
    }
  });
})();
