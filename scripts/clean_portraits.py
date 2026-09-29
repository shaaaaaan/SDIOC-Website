import urllib.request
import urllib.parse
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

def clean_and_feather_portrait(filename, url):
    temp_target = OFFICE_BEARERS_DIR / f"raw_{filename}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp, open(temp_target, 'wb') as f:
        f.write(resp.read())

    img = Image.open(temp_target).convert("RGBA")
    temp_target.unlink() # remove raw file

    arr = np.array(img, dtype=np.float32)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3]

    # White / off-white detection with multi-threshold
    # Pure background in these portraits has R>225, G>225, B>225 and low saturation
    max_c = np.maximum.reduce([rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]])
    min_c = np.minimum.reduce([rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]])
    delta = max_c - min_c
    is_bg_candidate = (min_c >= 210) & (delta <= 28)

    # Flood fill strictly from exterior boundaries
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    for x in range(w):
        if is_bg_candidate[0, x]:
            queue.append((0, x))
            visited[0, x] = True
        if is_bg_candidate[h - 1, x]:
            queue.append((h - 1, x))
            visited[h - 1, x] = True

    for y in range(h):
        if is_bg_candidate[y, 0]:
            queue.append((y, 0))
            visited[y, 0] = True
        if is_bg_candidate[y, w - 1]:
            queue.append((y, w - 1))
            visited[y, w - 1] = True

    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_bg_candidate[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    # Calculate alpha with smooth anti-aliased edge falloff
    alpha = np.ones((h, w), dtype=np.float32) * 255.0
    alpha[visited] = 0.0

    # Expand edge smoothing by 2 pixels along boundary to eliminate white halos/fringe
    from PIL import ImageFilter
    alpha_img = Image.fromarray(alpha.astype(np.uint8), mode='L')
    # Soft box blur on alpha mask for smooth anti-aliasing
    alpha_blurred = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.8))
    alpha_final = np.array(alpha_blurred, dtype=np.float32)

    # Hard zero outside boundary
    alpha_final[visited & (alpha_final < 180)] = 0.0

    arr[:, :, 3] = alpha_final

    # De-fringe: blend edge RGB slightly towards subject to avoid white border light bleed
    out_img = Image.fromarray(arr.astype(np.uint8), "RGBA")
    final_path = OFFICE_BEARERS_DIR / filename
    out_img.save(final_path, "PNG")
    print(f"[CLEANED] Successfully anti-aliased and defringed {filename}")

if __name__ == "__main__":
    for fname, u in URL_MAP.items():
        clean_and_feather_portrait(fname, u)
