import csv
import json
import os
import sys
import urllib.request

COOKIE_FILE = os.path.join(os.path.dirname(__file__), ".reddit_cookie")


def load_cookie():
    path = os.environ.get("REDDIT_COOKIE_FILE", COOKIE_FILE)
    if os.path.isfile(path):
        with open(path) as f:
            return f.read().strip()
    return os.environ.get("REDDIT_COOKIE", "")


def fetch_json(url):
    cookie = load_cookie()
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:152.0) Gecko/20100101 Firefox/152.0",
        "Accept": "application/json",
    }
    if cookie:
        headers["Cookie"] = cookie.encode("ascii", errors="ignore").decode("ascii")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def collect_comments(children):
    comments = []
    for child in children:
        kind = child["kind"]
        if kind == "t1":
            body = child["data"].get("body", "").strip()
            if body:
                comments.append(body)
            replies = child["data"].get("replies")
            if isinstance(replies, dict):
                nested = replies.get("data", {}).get("children", [])
                comments.extend(collect_comments(nested))
    return comments


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 reddit_comments.py <reddit_thread_url>", file=sys.stderr)
        print("\nExample:", file=sys.stderr)
        print("  python3 reddit_comments.py https://www.reddit.com/r/ExperiencedDevs/comments/1w1q7gt", file=sys.stderr)
        print("\nReddit requires a session cookie. Put it in:", file=sys.stderr)
        print(f"  {COOKIE_FILE}", file=sys.stderr)
        print("  (single line: the full Cookie header value from browser DevTools)", file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1].rstrip("/")
    json_url = url + ".json"

    data = fetch_json(json_url)

    post = data[0]["data"]["children"][0]["data"]
    title = post.get("title", "")
    selftext = post.get("selftext", "")

    comments_children = data[1]["data"]["children"]
    comments = collect_comments(comments_children)

    writer = csv.writer(sys.stdout)
    writer.writerow(["content", "sourceType"])
    if selftext.strip():
        writer.writerow([f"[{title}] {selftext}", "reddit"])
    for comment in comments:
        writer.writerow([comment, "reddit"])


if __name__ == "__main__":
    main()
