import os
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
OFFICE_BEARERS_DIR = PUBLIC_DIR / "images" / "office-bearers"
MINISTRIES_DIR = PUBLIC_DIR / "images" / "ministries"
HIERARCHY_DIR = PUBLIC_DIR / "images" / "hierarchy"
PDFS_DIR = PUBLIC_DIR / "documents" / "resources"

for d in [OFFICE_BEARERS_DIR, MINISTRIES_DIR, HIERARCHY_DIR, PDFS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def download_file(url, target_path):
    print(f"Downloading: {url} -> {target_path}")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response, open(target_path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"  [OK] Saved {target_path.name} ({target_path.stat().st_size} bytes)")
        return True
    except Exception as e:
        print(f"  [FAIL] {url}: {e}")
        return False

# 1. Download Office Bearers Images
ob_json_path = BASE_DIR / "src" / "app" / "data" / "office-bearers.json"
with open(ob_json_path, 'r', encoding='utf-8') as f:
    ob_data = json.load(f)

for year_group in ob_data.get('data', []):
    for person in year_group.get('people', []):
        img_url = person.get('image', '')
        if img_url.startswith('http'):
            filename = os.path.basename(urllib.parse.urlparse(img_url).path)
            target = OFFICE_BEARERS_DIR / filename
            if not target.exists():
                download_file(img_url, target)
            person['image'] = f"/images/office-bearers/{filename}"

with open(ob_json_path, 'w', encoding='utf-8') as f:
    json.dump(ob_data, f, indent=2)
print("Updated office-bearers.json")

# 2. Download Ministries Images
min_json_path = BASE_DIR / "src" / "app" / "data" / "ministries2.json"
with open(min_json_path, 'r', encoding='utf-8') as f:
    min_data = json.load(f)

for min_item in min_data.get('ministries', []):
    img_url = min_item.get('image', '')
    if img_url.startswith('http'):
        filename = os.path.basename(urllib.parse.urlparse(img_url).path)
        target = MINISTRIES_DIR / filename
        if not target.exists():
            download_file(img_url, target)
        min_item['image'] = f"/images/ministries/{filename}"

with open(min_json_path, 'w', encoding='utf-8') as f:
    json.dump(min_data, f, indent=2)
print("Updated ministries2.json")

# 3. Download Hierarchy Images from home.html
hierarchy_downloads = [
    ("https://smiocbristol.org/wp-content/uploads/2021/07/VattaserilThirumeni-1.png", HIERARCHY_DIR / "vattaseril-thirumeni.png", "/images/hierarchy/vattaseril-thirumeni.png"),
    ("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7hVHifpXTp0gOscBWfNTNNgT3CvAqLmUyyg&s", HIERARCHY_DIR / "catholicos-mathews-iii.jpg", "/images/hierarchy/catholicos-mathews-iii.jpg"),
    ("https://i.ytimg.com/vi/lVs0MAxOl9o/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCc6NnpxeThW5Q_joyCCJrfXerQJg", HIERARCHY_DIR / "dioscoros-thirumeni.jpg", "/images/hierarchy/dioscoros-thirumeni.jpg")
]

for url, target, local_path in hierarchy_downloads:
    if not target.exists():
        download_file(url, target)

# Update home.html with local paths
home_html_path = BASE_DIR / "src" / "app" / "pages" / "home" / "home.html"
with open(home_html_path, 'r', encoding='utf-8') as f:
    home_content = f.read()

for url, _, local_path in hierarchy_downloads:
    home_content = home_content.replace(url, local_path)

with open(home_html_path, 'w', encoding='utf-8') as f:
    f.write(home_content)
print("Updated home.html hierarchy images")

# 4. Download Resource PDFs
res_json_path = BASE_DIR / "src" / "app" / "data" / "resources.json"
with open(res_json_path, 'r', encoding='utf-8') as f:
    res_data = json.load(f)

for category in res_data.get('categories', []):
    for item in category.get('items', []):
        doc_url = item.get('url', '')
        if doc_url.startswith('http') and (doc_url.endswith('.pdf') or 'pdf' in doc_url.lower()):
            raw_filename = os.path.basename(urllib.parse.urlparse(doc_url).path)
            # unquote url encoded name
            filename = urllib.parse.unquote(raw_filename)
            target = PDFS_DIR / filename
            if not target.exists():
                download_file(doc_url, target)
            item['url'] = f"/documents/resources/{urllib.parse.quote(filename)}"

with open(res_json_path, 'w', encoding='utf-8') as f:
    json.dump(res_data, f, indent=2, ensure_ascii=False)
print("Updated resources.json")
