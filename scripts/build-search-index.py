#!/usr/bin/env python3
"""各HTMLの本文から search-index.json を作る。

使い方:
    python3 scripts/build-search-index.py

ページを追加・修正したあとに実行し、できた search-index.json を一緒にコミットする。
"""

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORDER = [
    "index.html",
    "beginner.html",
    "intermediate.html",
    "advanced.html",
    "what.html",
    "first-step.html",
    "safety.html",
    "make-bot.html",
    "routines.html",
    "connectors.html",
    "skills.html",
    "examples.html",
    "faq.html",
]


class MainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.main_depth = 0
        self.in_h1 = False
        self.parts = []
        self.h1 = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        if tag == "main":
            self.main_depth += 1
        if tag == "h1" and self.main_depth:
            self.in_h1 = True

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1
        if tag == "main" and self.main_depth:
            self.main_depth -= 1
        if tag == "h1":
            self.in_h1 = False
        if tag in ("p", "li", "h1", "h2", "h3", "h4", "br") and self.main_depth:
            self.parts.append(" ")

    def handle_data(self, data):
        if self.skip or not self.main_depth:
            return
        self.parts.append(data)
        if self.in_h1:
            self.h1.append(data)


def page_record(path):
    parser = MainText()
    parser.feed(path.read_text(encoding="utf-8"))
    title = re.sub(r"\s+", " ", "".join(parser.h1)).strip()
    text = re.sub(r"\s+", " ", "".join(parser.parts)).strip()
    if not title or not text:
        raise SystemExit(f"本文または見出しがありません: {path.name}")
    return {"title": title, "url": path.name, "text": text}


def main():
    files = {path.name: path for path in ROOT.glob("*.html")}
    ordered = [name for name in ORDER if name in files]
    ordered += sorted(name for name in files if name not in ORDER)
    pages = [page_record(files[name]) for name in ordered]
    destination = ROOT / "search-index.json"
    destination.write_text(
        json.dumps(pages, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(pages)} pages -> {destination.name}")


if __name__ == "__main__":
    main()
