import os
import json
import zipfile
import re
import xml.etree.ElementTree as ET
from PIL import Image
import io

pptx_path = r'D:\Downloads\SDIOC Vicennium 2023.pptx'
output_img_dir = os.path.join('public', 'images', 'vicennium')
data_output_path = os.path.join('src', 'app', 'data', 'vicennium-timeline.json')

os.makedirs(output_img_dir, exist_ok=True)
os.makedirs(os.path.dirname(data_output_path), exist_ok=True)

# Template/decoration images to ignore
IGNORE_IMAGES = {'image1.png', 'image40.png', 'image110.png', 'image3.png', 'image4.png', 'image5.png'}

def get_slide_images(z, slide_idx):
    rf = f'ppt/slides/_rels/slide{slide_idx}.xml.rels'
    images = []
    if rf in z.namelist():
        content = z.read(rf).decode('utf-8', errors='ignore')
        matches = re.findall(r'media/(image\d+\.[a-zA-Z0-9]+)', content)
        for m in matches:
            if m not in IGNORE_IMAGES and ('ppt/media/' + m) in z.namelist():
                images.append(m)
    return list(dict.fromkeys(images)) # preserve order, remove dups

def optimize_and_save_image(z, media_filename, dest_filename):
    media_path = 'ppt/media/' + media_filename
    raw_data = z.read(media_path)
    dest_path = os.path.join(output_img_dir, dest_filename)
    
    try:
        img = Image.open(io.BytesIO(raw_data))
        if img.mode in ('RGBA', 'P') and dest_filename.endswith('.jpg'):
            img = img.convert('RGB')
        
        # Max dimension 1400px for web performance & crispness
        max_dim = 1400
        if max(img.width, img.height) > max_dim:
            scale = max_dim / max(img.width, img.height)
            new_size = (int(img.width * scale), int(img.height * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        if dest_filename.endswith('.jpg') or dest_filename.endswith('.jpeg'):
            img.save(dest_path, 'JPEG', quality=84, optimize=True)
        else:
            img.save(dest_path, optimize=True)
        return True
    except Exception as e:
        print(f"Error processing {media_filename}: {e}")
        # fallback write raw
        with open(dest_path, 'wb') as f:
            f.write(raw_data)
        return True

print("Extracting images from PPTX...")

# Mapping of Milestones
milestone_configs = [
    {
        "id": "first-holy-eucharist-2003",
        "year": "2003",
        "title": "First Holy Eucharist in New Zealand",
        "subtitle": "29 March 2003 • St. Albans Church, Balmoral, Auckland",
        "category": "Parish Genesis",
        "description": "On 29 March 2003, history was written as the first Holy Eucharist (Holy Qurbana) of the Malankara Orthodox Syrian Church in New Zealand was celebrated at St. Albans Church in Balmoral, Auckland. Led by Rev. Fr. Dr. M.D. Varghese, a humble gathering of faithful families laid the cornerstone of Orthodox spirituality in Aotearoa.",
        "slides": [1, 3, 4, 5],
        "tags": ["Genesis", "Historic", "First Service", "Balmoral"]
    },
    {
        "id": "irenaios-visit-2003",
        "year": "2003",
        "title": "Episcopal Visit of H.G. Dr. Yakob Mar Irenaios",
        "subtitle": "August & October 2003 • Apostolic Benediction",
        "category": "Episcopal Blessing",
        "description": "In August and October 2003, the young parish was blessed with the first historic episcopal visit of H.G. Dr. Yakob Mar Irenaios Metropolitan. Thirumeni's pastoral guidance, liturgical celebrations, and fatherly presence cemented the spiritual foundation of our church in New Zealand.",
        "slides": [6, 7, 8],
        "tags": ["Metropolitan Visit", "Irenaios Thirumeni", "Liturgy"]
    },
    {
        "id": "revered-vicars-lineage",
        "year": "2003–2023",
        "title": "Chronicle of Revered Parish Vicars",
        "subtitle": "Two Decades of Sacred Shepherding",
        "category": "Pastoral Lineage",
        "description": "Over twenty years, SDIOC has been blessed by the devoted spiritual leadership of our Vicars: Rev. Fr. Dr. M.D. Varghese (2003, 2004), Very Rev. Fr. T.G. John Cor-Episcopa (2003–2004), Rev. Fr. Varghese Philip Idichandy (2004–2007), Rev. Fr. Shinu K. Thomas (2007–2011), Rev. Fr. Biju Mathai Pulickal (2011–2015), Rev. Fr. Anup Joseph Eapen (2015–2019), Rev. Fr. Anu Mathew (2019–2023), and Rev. Fr. Pradeep Ponnachen (From July 2023).",
        "slides": [2],
        "tags": ["Clergy", "Vicars", "Spiritual Shepherds"]
    },
    {
        "id": "parish-foundations-2004",
        "year": "2004",
        "title": "First General Body & Parish Assembly",
        "subtitle": "Formal Constitution of the Parish Body",
        "category": "Parish Assembly",
        "description": "In 2004, the congregation convened its first comprehensive General Body meeting, establishing the structural administration, managing committee, trustees, and operational statutes under the Malankara Orthodox Syrian Church Constitution.",
        "slides": [9],
        "tags": ["General Body", "Constitution", "Parish Assembly"]
    },
    {
        "id": "pentecost-concert-2007",
        "year": "2007",
        "title": "Pentecost Musical Concert & Episcopal Visit",
        "subtitle": "Choral Liturgy & Ecumenical Fellowship",
        "category": "Ecumenical Outreach",
        "description": "In 2007, SDIOC hosted a memorable Pentecost Musical Concert showcasing sacred Orthodox hymns, liturgical chants, and choral arrangements. The occasion was graced by the pastoral visit of H.G. Dr. Yakob Mar Irenaios, drawing together Orthodox and ecumenical brethren across Auckland.",
        "slides": [10, 11],
        "tags": ["Pentecost", "Concert", "Choir", "Irenaios Thirumeni"]
    },
    {
        "id": "church-construction-sanctuary",
        "year": "2009–2012",
        "title": "Sanctuary Acquisition & Church Construction",
        "subtitle": "55 Keeling Road, Henderson • A House of God Raised",
        "category": "Sanctuary Raising",
        "description": "With faith and unwavering sacrificial contributions from every parishioner, SDIOC acquired the property at 55 Keeling Road, Henderson. Through shramadhanam (voluntary labor), prayer vigils, and meticulous craft, an industrial warehouse was miraculously transformed into an Orthodox temple complete with traditional Madbaha (Sanctum Sanctorum), iconostasis, and dome.",
        "slides": [12, 13, 14, 15, 16, 17, 18, 19, 20],
        "tags": ["Construction", "Keeling Road", "Sanctuary", "Madbaha"]
    },
    {
        "id": "catholicos-visit-2015",
        "year": "2015",
        "title": "Apostolic Visit of H.H. Baselios Marthoma Paulose II",
        "subtitle": "November 2015 • Supreme Head of Malankara Orthodox Syrian Church",
        "category": "Supreme Pontiff Visit",
        "description": "In November 2015, the parish received the supreme blessing in its history: the Apostolic Visit of His Holiness Moran Mar Baselios Marthoma Paulose II, Catholicos of the East and Malankara Metropolitan. Bava Thirumeni consecrated the church altar, offered Pontifical Divine Liturgy, met with local civic dignitaries, and blessed the entire Auckland community.",
        "slides": [21, 22, 23, 24, 25, 26],
        "tags": ["Catholicos", "Paulose II Bava", "Pontifical Liturgy", "Historic"]
    },
    {
        "id": "crystal-jubilee-2018",
        "year": "2018",
        "title": "Crystal Jubilee (15 Years) & Episcopal Silver Jubilee",
        "subtitle": "Celebrating 15 Years of Faith & Mar Irenaios' Episcopate",
        "category": "Jubilee Celebration",
        "description": "In 2018, SDIOC marked its Crystal Jubilee (15th Anniversary of the parish) alongside the Silver Jubilee of the Episcopal Ordination of our beloved Diocesan Metropolitan, H.G. Dr. Yakob Mar Irenaios. The milestone was celebrated with grand liturgical gatherings, commemorative releases, and community banquets.",
        "slides": [27, 28, 29, 30, 31],
        "tags": ["Crystal Jubilee", "15 Years", "Silver Jubilee", "Mar Irenaios"]
    },
    {
        "id": "ovbs-memories-legacy",
        "year": "2003–2023",
        "title": "Orthodox Vacation Bible School (OVBS)",
        "subtitle": "Nurturing Generations in Faith & Love",
        "category": "Youth & Children",
        "description": "For over two decades, the Orthodox Vacation Bible School (OVBS) and Sunday School have served as the heartbeat of our church's youth ministry. Every summer, hundreds of children immerse themselves in scripture, sacred hymns, arts, Christian drama, and fellowship.",
        "slides": [32, 33, 34],
        "tags": ["OVBS", "Sunday School", "Children", "Youth"]
    },
    {
        "id": "parish-reminiscences",
        "year": "2003–2023",
        "title": "Parish Life, Fellowship & Reminiscences",
        "subtitle": "Picnics, Feasts, Martha Mariam Samajam & OCYM",
        "category": "Parish Community",
        "description": "A tapestry of communal warmth: annual church picnics at New Zealand regional parks, Harvest Festivals, Onam and Christmas celebrations, Martha Mariam Vanitha Samajam spiritual retreats, and vibrant Orthodox Christian Youth Movement (OCYM) initiatives.",
        "slides": [35, 36, 37, 38, 39, 40],
        "tags": ["Reminiscences", "Picnics", "Samajam", "OCYM", "Fellowship"]
    },
    {
        "id": "parish-feast-2023",
        "year": "2023",
        "title": "Annual Parish Feast (Dukhrana Perunnal 2023)",
        "subtitle": "Feast of St. Dionysius of Vattasseril & St. George",
        "category": "Liturgical Feast",
        "description": "The annual feast of our patron saint, Saint Dionysius of Vattasseril (Malankara Sabha Bhasuran), and Saint George the Martyr. Processions (Rasa) with ceremonial umbrellas, liturgical chants, nercha, and parish devotion.",
        "slides": [41],
        "tags": ["Perunnal", "Patron Saint", "St. Dionysius", "Procession"]
    },
    {
        "id": "vicennium-celebrations-2023",
        "year": "2023",
        "title": "Vicennium Celebrations (20 Years of SDIOC)",
        "subtitle": "2003 – 2023 • Vicennial Grand Jubilee",
        "category": "Vicennium Grand Jubilee",
        "description": "Two decades of grace, pilgrimage, and divine providence! The Vicennial celebrations honored the founding pioneers of 2003, published a historic jubilee souvenir, and looked forward into the next twenty years of Orthodox witness in New Zealand with thanksgiving.",
        "slides": [42, 43, 44],
        "tags": ["Vicennium", "20 Years", "Grand Jubilee", "Celebration"]
    }
]

with zipfile.ZipFile(pptx_path, 'r') as z:
    milestones_data = []
    gallery_photos = []

    for m_cfg in milestone_configs:
        m_images = []
        raw_imgs = []
        for s_idx in m_cfg["slides"]:
            imgs = get_slide_images(z, s_idx)
            raw_imgs.extend(imgs)
        
        # Deduplicate while keeping order
        raw_imgs = list(dict.fromkeys(raw_imgs))
        
        # Take up to 10 best photos per milestone
        count = 0
        for r_img in raw_imgs:
            ext = 'jpg'
            dest_name = f"{m_cfg['id']}-{count+1}.{ext}"
            success = optimize_and_save_image(z, r_img, dest_name)
            if success:
                count += 1
                img_url = f"/images/vicennium/{dest_name}"
                photo_obj = {
                    "id": f"{m_cfg['id']}-p{count}",
                    "url": img_url,
                    "caption": f"{m_cfg['title']} ({m_cfg['year']})",
                    "milestoneId": m_cfg["id"],
                    "year": m_cfg["year"],
                    "category": m_cfg["category"]
                }
                m_images.append(photo_obj)
                gallery_photos.append(photo_obj)
                if count >= 8:
                    break
        
        m_record = {
            "id": m_cfg["id"],
            "year": m_cfg["year"],
            "title": m_cfg["title"],
            "subtitle": m_cfg["subtitle"],
            "category": m_cfg["category"],
            "description": m_cfg["description"],
            "tags": m_cfg["tags"],
            "images": m_images,
            "featuredImage": m_images[0]["url"] if m_images else None
        }
        milestones_data.append(m_record)
        print(f"Milestone '{m_cfg['title']}': extracted {len(m_images)} images.")

    # Write combined JSON
    result = {
        "title": "SDIOC Vicennium (2003–2023) • Twenty Years of Divine Providence",
        "description": "Comprehensive historical archive and milestone gallery extracted from the official Vicennium Presentation of St. Dionysius Indian Orthodox Church, Auckland, New Zealand.",
        "milestones": milestones_data,
        "gallery": gallery_photos
    }

    with open(data_output_path, 'w', encoding='utf-8') as out_f:
        json.dump(result, out_f, indent=2, ensure_ascii=False)

print(f"Extraction complete! Total gallery photos: {len(gallery_photos)}")
print(f"Saved manifest to {data_output_path}")
