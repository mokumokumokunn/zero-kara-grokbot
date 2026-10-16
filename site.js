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
