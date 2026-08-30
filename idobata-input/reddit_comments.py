import csv
import json
import os
import sys


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
        print("Usage: python3 reddit_comments.py <reddit_json_file>", file=sys.stderr)
        print("\nExample:", file=sys.stderr)
        print("  python3 reddit_comments.py reddit_json/abc123.json", file=sys.stderr)
        sys.exit(1)

    json_path = sys.argv[1]
    csv_path = os.path.splitext(json_path)[0] + ".csv"

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    post = data[0]["data"]["children"][0]["data"]
    title = post.get("title", "")
    selftext = post.get("selftext", "")

    comments = collect_comments(data[1]["data"]["children"])

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["content", "sourceType"])
        if selftext.strip():
            writer.writerow([f"[{title}] {selftext}", "reddit"])
        for comment in comments:
            writer.writerow([comment, "reddit"])

    print(f"Wrote {len(comments)} comments to {csv_path}")


if __name__ == "__main__":
    main()
