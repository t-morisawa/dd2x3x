import csv
import sys
import html
import re
import urllib.request
from html.parser import HTMLParser


class HNCommentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.comments = []
        self.in_commtext = False
        self.current_text = []
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        cls = attrs_dict.get("class") or ""
        if tag == "div" and "commtext" in cls:
            self.in_commtext = True
            self.current_text = []
            self.depth = 0
        elif self.in_commtext:
            self.depth += 1

    def handle_endtag(self, tag):
        if self.in_commtext:
            if tag == "div" and self.depth == 0:
                text = "".join(self.current_text).strip()
                text = html.unescape(text)
                text = re.sub(r"<[^>]+>", "", text)
                text = re.sub(r"\s+", " ", text).strip()
                if text:
                    self.comments.append(text)
                self.in_commtext = False
            elif tag == "div":
                self.depth -= 1

    def handle_data(self, data):
        if self.in_commtext:
            self.current_text.append(data)


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "https://news.ycombinator.com/item?id=49076057"

    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()

    page = None
    for enc in ("utf-8", "latin-1"):
        try:
            page = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if page is None:
        print("Failed to decode page", file=sys.stderr)
        sys.exit(1)

    parser = HNCommentParser()
    parser.feed(page)

    writer = csv.writer(sys.stdout)
    writer.writerow(["content", "sourceType"])
    for comment in parser.comments:
        writer.writerow([comment, "hckrnews"])


if __name__ == "__main__":
    main()
