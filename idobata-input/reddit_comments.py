import base64
import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request


def get_oauth_token(client_id, client_secret):
    """Get an OAuth2 access token using username/password flow (script app type)."""
    username = os.environ.get("REDDIT_USERNAME")
    password = os.environ.get("REDDIT_PASSWORD")
    if not username or not password:
        print("Set REDDIT_USERNAME and REDDIT_PASSWORD env vars", file=sys.stderr)
        sys.exit(1)

    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    data = urllib.parse.urlencode({
        "grant_type": "password",
        "username": username,
        "password": password,
    }).encode()
    req = urllib.request.Request(
        "https://www.reddit.com/api/v1/access_token",
        data=data,
        headers={
            "Authorization": f"Basic {credentials}",
            "User-Agent": "hn-reddit-collector/1.0 (personal project)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result["access_token"]


def fetch_json(url, token, extra_headers=None):
    headers = {
        "Authorization": f"bearer {token}",
        "User-Agent": "hn-reddit-collector/1.0 (personal project)",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def collect_comments(data, token, depth=0):
    """Recursively collect comments from Reddit API response."""
    comments = []
    listing = data[1] if len(data) > 1 else data[0]
    stack = list(listing["data"]["children"])
    link_id = None

    while stack:
        child = stack.pop()
        kind = child["kind"]
        if kind == "t1":
            body = child["data"].get("body", "").strip()
            if body:
                comments.append(body)
            replies = child["data"].get("replies")
            if isinstance(replies, dict):
                children = replies.get("data", {}).get("children", [])
                stack.extend(children)
        elif kind == "more":
            child_ids = child["data"].get("children", [])
            if child_ids and link_id is None:
                link_id = listing["data"]["children"][0]["data"].get("link_id", "")
            if child_ids and link_id and depth < 5:
                time.sleep(1)
                import urllib.parse
                post_data = urllib.parse.urlencode({
                    "link_id": link_id,
                    "children": ",".join(child_ids),
                    "sort": "confidence",
                }).encode()
                headers = {
                    "Authorization": f"bearer {token}",
                    "User-Agent": "hn-reddit-collector/1.0 (personal project)",
                }
                req = urllib.request.Request(
                    "https://oauth.reddit.com/api/morechildren",
                    data=post_data,
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req) as resp:
                    more_data = json.loads(resp.read().decode("utf-8"))
                comments.extend(collect_comments(more_data, token, depth + 1))

    return comments


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: python3 reddit_comments.py <reddit_thread_url>\n"
            "\n"
            "Required env vars:\n"
            "  REDDIT_CLIENT_ID     - OAuth client ID (create app at reddit.com/prefs/apps)\n"
            "  REDDIT_CLIENT_SECRET - OAuth client secret\n"
            "  REDDIT_USERNAME      - Reddit username\n"
            "  REDDIT_PASSWORD      - Reddit password",
            file=sys.stderr,
        )
        sys.exit(1)

    client_id = os.environ.get("REDDIT_CLIENT_ID")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
    if not client_id or not client_secret:
        print("Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET env vars", file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1].rstrip("/")
    json_url = url + ".json"

    token = get_oauth_token(client_id, client_secret)
    data = fetch_json(json_url, token)
    comments = collect_comments(data, token)

    writer = csv.writer(sys.stdout)
    writer.writerow(["content", "sourceType"])
    for comment in comments:
        writer.writerow([comment, "reddit"])


if __name__ == "__main__":
    main()
