from PIL import Image
import numpy as np
from collections import deque
from pathlib import Path

OFFICE_BEARERS_DIR = Path(r"c:\Git\SDIOC-Website\public\images\office-bearers")

def flood_fill_transparency(img_path, threshold=242):
    img = Image.open(img_path).convert("RGBA")
    arr = np.array(img)
    h, w, _ = arr.shape

    # Boolean mask of light/white pixels (R,G,B all > threshold)
    rgb = arr[:, :, :3]
    is_white = (rgb[:, :, 0] >= threshold) & (rgb[:, :, 1] >= threshold) & (rgb[:, :, 2] >= threshold)

    # 4-connected Flood Fill from boundary edges to only remove outside background, preserving white collars/shirts inside
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # Add outer perimeter points that are light/white
    for x in range(w):
        if is_white[0, x]:
            queue.append((0, x))
            visited[0, x] = True
        if is_white[h - 1, x]:
            queue.append((h - 1, x))
            visited[h - 1, x] = True

    for y in range(h):
        if is_white[y, 0]:
            queue.append((y, 0))
            visited[y, 0] = True
        if is_white[y, w - 1]:
            queue.append((y, w - 1))
            visited[y, w - 1] = True

    # BFS traversal
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_white[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    # Apply alpha: smooth anti-aliased edge
    # Full transparent for visited background
    arr[visited, 3] = 0

    # Save cleanly
    result_img = Image.fromarray(arr, "RGBA")
    result_img.save(img_path, "PNG")
    print(f"[OK] Processed transparency for {img_path.name}")

if __name__ == "__main__":
    for png_file in OFFICE_BEARERS_DIR.glob("*.png"):
        flood_fill_transparency(png_file)
