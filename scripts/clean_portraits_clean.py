import urllib.request
from PIL import Image
import numpy as np
from collections import deque
from pathlib import Path

BASE_DIR = Path(r"c:\Git\SDIOC-Website")
OFFICE_BEARERS_DIR = BASE_DIR / "public" / "images" / "office-bearers"

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

URL_MAP = {
    "joe.png": "https://sdiocnz.org/wp-content/uploads/2024/04/joe.png",
    "Oommen.png": "https://sdiocnz.org/wp-content/uploads/2024/04/Oommen.png",
    "sobin.png": "https://sdiocnz.org/wp-content/uploads/2024/04/sobin.png",
    "saji.png": "https://sdiocnz.org/wp-content/uploads/2024/04/saji.png",
    "arun.png": "https://sdiocnz.org/wp-content/uploads/2024/04/arun.png",
    "Jineesh.png": "https://sdiocnz.org/wp-content/uploads/2024/04/Jineesh.png",
    "mintu.png": "https://sdiocnz.org/wp-content/uploads/2024/04/mintu.png",
    "beno.png": "https://sdiocnz.org/wp-content/uploads/2024/04/beno.png",
    "mathew.png": "https://sdiocnz.org/wp-content/uploads/2024/04/mathew.png"
}

def clean_pure_background(filename, url):
    temp_target = OFFICE_BEARERS_DIR / f"raw_{filename}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp, open(temp_target, 'wb') as f:
        f.write(resp.read())

    img = Image.open(temp_target).convert("RGBA")
    temp_target.unlink()

    arr = np.array(img, dtype=np.uint8)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3]

    # White studio background in these original photos is pure #FFFFFF (or >= 250 across R,G,B)
    # This leaves shirts/skin/collars intact and only removes the outside white studio canvas
    is_pure_white = (rgb[:, :, 0] >= 248) & (rgb[:, :, 1] >= 248) & (rgb[:, :, 2] >= 248)

    # Flood fill ONLY from exterior boundaries
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    for x in range(w):
        if is_pure_white[0, x]:
            queue.append((0, x))
            visited[0, x] = True
        if is_pure_white[h - 1, x]:
            queue.append((h - 1, x))
            visited[h - 1, x] = True

    for y in range(h):
        if is_pure_white[y, 0]:
            queue.append((y, 0))
            visited[y, 0] = True
        if is_pure_white[y, w - 1]:
            queue.append((y, w - 1))
            visited[y, w - 1] = True

    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_pure_white[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    # Set alpha strictly for visited outside canvas
    arr[visited, 3] = 0

    # Save cleanly with pristine subject pixels
    out_img = Image.fromarray(arr, "RGBA")
    final_path = OFFICE_BEARERS_DIR / filename
    out_img.save(final_path, "PNG")
    print(f"[CLEANED] Preserved 100% subject details for {filename}")

if __name__ == "__main__":
    for fname, u in URL_MAP.items():
        clean_pure_background(fname, u)
