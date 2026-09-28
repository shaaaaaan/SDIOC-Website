import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

# Force UTF-8 on Windows stdout
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
PDFS_DIR = PUBLIC_DIR / "documents" / "resources"
PDFS_DIR.mkdir(parents=True, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def download_file(url, target_path):
    print(f"Downloading: {url}")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as response, open(target_path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"  [OK] Saved {target_path.name} ({target_path.stat().st_size} bytes)")
        return True
    except Exception as e:
        print(f"  [FAIL] {url}: {e}")
        return False

res_json_path = BASE_DIR / "src" / "app" / "data" / "resources.json"
with open(res_json_path, 'r', encoding='utf-8') as f:
    res_data = json.load(f)

categories = res_data.get('data') or res_data.get('categories', [])

for category in categories:
    for item in category.get('items', []):
        doc_url = item.get('url', '')
        if doc_url.startswith('http') and (doc_url.endswith('.pdf') or 'pdf' in doc_url.lower()):
            raw_filename = os.path.basename(urllib.parse.urlparse(doc_url).path)
            filename = urllib.parse.unquote(raw_filename)
            target = PDFS_DIR / filename
            if not target.exists():
                download_file(doc_url, target)
            item['url'] = f"/documents/resources/{urllib.parse.quote(filename)}"

with open(res_json_path, 'w', encoding='utf-8') as f:
    json.dump(res_data, f, indent=2, ensure_ascii=False)
print("Updated resources.json with local PDF paths!")
