import os
import json
import re
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# JSON Fallback storage file
STORAGE_FILE = os.path.join(os.path.dirname(__file__), 'saved_designs.json')

def get_db_connection():
    """Attempt SQL Server SSMS Connection via PyODBC"""
    try:
        import pyodbc
        # Configure your SQL Server instance name here if needed (e.g. localhost\\SQLEXPRESS or .)
        conn_str = (
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=localhost;"
            "DATABASE=HandloomDesignDB;"
            "Trusted_Connection=yes;"
        )
        conn = pyodbc.connect(conn_str, timeout=3)
        return conn
    except Exception as e:
        # DB Connection fallback
        return None

def load_local_designs():
    if os.path.exists(STORAGE_FILE):
        try:
            with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_local_designs(designs):
    with open(STORAGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(designs, f, ensure_ascii=False, indent=2)

# AI / Rule-based Generative Handloom Design Engine
HANDLOOM_STYLES = [
    {
        "id": "mangalagiri",
        "nameEn": "Mangalagiri Cotton/Silk",
        "nameTe": "మంగళగిరి కాటన్ / పట్టు",
        "region": "Guntur, Andhra Pradesh",
        "featuresEn": "Famous for Nizam borders, micro checks, and high thread count warp.",
        "featuresTe": "నిజాం బోర్డర్లు, సూక్ష్మ గడులు మరియు నాణ్యమైన దారపు నేతకు ప్రసిద్ధి.",
        "defaultBody": "#800020",
        "defaultBorder": "#D97706",
        "defaultPallu": "#991B1B",
        "defaultMotif": "Temple Gopuram",
        "borderStyle": "temple"
    },
    {
        "id": "uppada",
        "nameEn": "Uppada Jamdani Silk",
        "nameTe": "ఉప్పాడ జమ్‌దానీ పట్టు",
        "region": "East Godavari, Andhra Pradesh",
        "featuresEn": "Non-mechanical geometric zari insertion, lightweight translucent texture.",
        "featuresTe": "చేనేత మగ్గంపై అల్లిన జరీ మోటిఫ్‌లు, తేలికపాటి పట్టు నేత.",
        "defaultBody": "#0F766E",
        "defaultBorder": "#BE185D",
        "defaultPallu": "#BE185D",
        "defaultMotif": "Peacock (Mayuri)",
        "borderStyle": "zari_stripes"
    },
    {
        "id": "pochampally",
        "nameEn": "Pochampally Ikat",
        "nameTe": "పోచంపల్లి ఇకత్ (టై & డై)",
        "region": "Nalgonda / Yadadri, Telangana",
        "featuresEn": "Tie-and-dye resist weaving with bold geometric diamond patterns.",
        "featuresTe": "రంగులు అద్దిన దారాలతో రూపొందించే సుందరమైన రేఖాగణిత డిజైన్లు.",
        "defaultBody": "#EAB308",
        "defaultBorder": "#5B21B6",
        "defaultPallu": "#5B21B6",
        "defaultMotif": "Geometric Ikat Diamond",
        "borderStyle": "ikat_wave"
    },
    {
        "id": "venkatagiri",
        "nameEn": "Venkatagiri Fine Cotton & Silk",
        "nameTe": "వెంకటగిరి సన్న కాటన్ & పట్టు",
        "region": "Tirupati, Andhra Pradesh",
        "featuresEn": "Fine 100s count cotton with rich all-over gold zari dots (buttis).",
        "featuresTe": "100s నంబరు సన్నని నూలు దారం, జరీ బుటాలు మరియు రాజసం ఉట్టిపడే బోర్డర్.",
        "defaultBody": "#064E3B",
        "defaultBorder": "#B91C1C",
        "defaultPallu": "#B91C1C",
        "defaultMotif": "Mango / Paisley (Kalka)",
        "borderStyle": "double_zari"
    },
    {
        "id": "kanchipuram",
        "nameEn": "Kanchipuram Style Silk",
        "nameTe": "కాంచీపురం టైప్ గ్రాండ్ పట్టు",
        "region": "South Heritage",
        "featuresEn": "Heavy pure silk, contrasting border woven with interlocked shuttle (Korvai).",
        "featuresTe": "కొర్వై పద్ధతిలో అల్లిన బరువైన పట్టు, మెరిసే స్వచ్ఛమైన జరీ.",
        "defaultBody": "#4C1D95",
        "defaultBorder": "#991B1B",
        "defaultPallu": "#991B1B",
        "defaultMotif": "Elephant (Gaja)",
        "borderStyle": "temple_grand"
    }
]

COLOR_PALETTES = {
    "wedding": {"body": "#800020", "border": "#D97706", "pallu": "#991B1B", "zari": "#FBBF24", "name": "Bridal Crimson & Royal Gold"},
    "festive": {"body": "#0F766E", "border": "#BE185D", "pallu": "#BE185D", "zari": "#F59E0B", "name": "Peacock Teal & Magenta"},
    "traditional": {"body": "#064E3B", "border": "#B91C1C", "pallu": "#B91C1C", "zari": "#D97706", "name": "Deep Temple Green & Vermilion"},
    "puja": {"body": "#EAB308", "border": "#5B21B6", "pallu": "#5B21B6", "zari": "#991B1B", "name": "Pitambaram Yellow & Deep Violet"},
    "modern": {"body": "#1E1B4B", "border": "#4338CA", "pallu": "#312E81", "zari": "#E2E8F0", "name": "Indigo Night & Silver Zari"},
    "pastel": {"body": "#F472B6", "border": "#0EA5E9", "pallu": "#0EA5E9", "zari": "#F59E0B", "name": "Rose Quartz & Sky Blue"}
}

MOTIF_CATALOG = [
    {"id": "peacock", "en": "Peacock (Mayuri)", "te": "నెమలి (మయూరి)", "symbol": "Royalty & Grace"},
    {"id": "mango", "en": "Mango / Paisley (Kalka)", "te": "మామిడి పిందే (కల్కా)", "symbol": "Prosperity"},
    {"id": "temple", "en": "Temple Gopuram", "te": "దేవాలయ గోపురం", "symbol": "Divine Protection"},
    {"id": "elephant", "en": "Elephant (Gaja)", "te": "ఏనుగు (గజ)", "symbol": "Strength & Royalty"},
    {"id": "lotus", "en": "Lotus / Floral (Kamala)", "te": "తామర పూవు (కమల) / పూలు", "symbol": "Purity & Floral Harmony"},
    {"id": "ikat", "en": "Geometric Ikat Diamond", "te": "ఇకత్ డైమండ్", "symbol": "Heritage Precision"},
    {"id": "swan", "en": "Swan (Hamsa)", "te": "హంస", "symbol": "Elegance & Discernment"}
]

BODY_PATTERNS = [
    {"id": "floral_vines", "en": "Floral Vines (Lata)", "te": "పూల తీగలు (లత)"},
    {"id": "checks", "en": "Geometric Checks (Kattam)", "te": "గడులు (కట్టం)"},
    {"id": "lattice", "en": "Diamond Lattice (Jaal)", "te": "జాల్ మోటిఫ్ వల"},
    {"id": "diagonal_ikat", "en": "Diagonal Ikat Lines", "te": "రేఖాగణిత శైలి గీతలు"},
    {"id": "scattered_buttis", "en": "Scattered Buttis", "te": "చల్లు బుటాలు"},
    {"id": "stripes", "en": "Fine Zari Stripes (Vanki)", "te": "జరీ గీతలు"},
    {"id": "paisley_lattice", "en": "Paisley Grid Lattice", "te": "మామిడి పిందే జాల్"}
]

BORDER_PATTERNS = [
    {"id": "temple", "en": "Temple Gopuram Spikes", "te": "గోపురం బోర్డర్"},
    {"id": "double_zari", "en": "Double Zari Floral Border", "te": "ద్వంద్వ జరీ బోర్డర్"},
    {"id": "ikat_wave", "en": "Geometric Ikat Waves", "te": "ఇకత్ తరంగాలు"},
    {"id": "zari_stripes", "en": "Modern Zari Stripes", "te": "సన్న జరీ పట్టీ"},
    {"id": "peacock_border", "en": "Peacock Silhouette Border", "te": "నెమలి బోర్డర్"},
    {"id": "chevron_pattern", "en": "Chevron Zig-Zag Border", "te": "జిగ్-జాగ్ బోర్డర్"}
]

PALLU_PATTERNS = [
    {"id": "traditional_stripes", "en": "Traditional Zari Stripes & Fringes", "te": "సాంప్రదాయ పట్టీల కొంగు"},
    {"id": "grand_medallion", "en": "Grand Chakra Medallion Pallu", "te": "భారీ చక్ర పల్లూ"},
    {"id": "decorative_pallu", "en": "Decorative Floral & Motif Panel", "te": "అలంకార పూల కొంగు"},
    {"id": "ikat_block", "en": "Geometric Ikat Color-Blocked Pallu", "te": "ఇకత్ కలర్-బ్లాక్ కొంగు"},
    {"id": "cascade_temple", "en": "Cascading Temple Gopuram Tiers", "te": "గోపురాల అంచల కొంగు"}
]

def generate_variations_from_prompt(user_prompt, language="en-US", seed=0):
    prompt_raw = user_prompt or ''
    prompt_lower = prompt_raw.lower().strip()

    # Color Dictionary with Hex Codes & Descriptive Names
    COLOR_DEFS = [
        (["red", "crimson", "kempu", "ఎరుపు", "కెంపు"], "#DC2626", "Crimson Red"),
        (["blue", "navy", "indigo", "నీలం", "బ్లూ", "రాయల్ బ్లూ"], "#1D4ED8", "Royal Blue"),
        (["teal", "cyan", "పింఛం", "పింఛం పచ్చ"], "#0F766E", "Peacock Teal"),
        (["green", "emerald", "పచ్చ", "ఆకుపచ్చ"], "#047857", "Emerald Green"),
        (["yellow", "pitambaram", "పసుపు", "పీతాంబరం"], "#EAB308", "Pitambaram Yellow"),
        (["gold", "golden", "బంగారు", "బంగారము"], "#D97706", "Rich Gold"),
        (["pink", "rose", "magenta", "గులాబీ", "రాణి గులాబీ"], "#DB2777", "Rose Pink"),
        (["purple", "violet", "vangapuvvu", "వంగపువ్వు", "ఊదా"], "#6B21A8", "Royal Purple"),
        (["orange", "terracotta", "నారింజ", "కాషాయం"], "#C2410C", "Terracotta Orange"),
        (["black", "dark", "నలుపు"], "#18181B", "Charcoal Black"),
        (["white", "cream", "ivory", "తెలుపు", "వెన్న"], "#F8FAFC", "Ivory White"),
        (["silver", "gray", "grey", "వెండి"], "#94A3B8", "Metallic Silver")
    ]

    matched_colors = []
    for keywords, hex_val, color_name in COLOR_DEFS:
        for kw in keywords:
            if kw in prompt_lower:
                if (hex_val, color_name) not in matched_colors:
                    matched_colors.append((hex_val, color_name))
                break

    if len(matched_colors) >= 2:
        body_hex, body_name = matched_colors[0]
        border_hex, border_name = matched_colors[1]
        pallu_hex = border_hex
        palette_label = f"{body_name} Body & {border_name} Border"
    elif len(matched_colors) == 1:
        body_hex, body_name = matched_colors[0]
        if body_name in ["Rich Gold", "Pitambaram Yellow"]:
            border_hex, border_name = "#6B21A8", "Royal Purple"
        elif body_name in ["Royal Blue", "Peacock Teal"]:
            border_hex, border_name = "#D97706", "Rich Gold"
        elif body_name in ["Emerald Green"]:
            border_hex, border_name = "#B91C1C", "Crimson Red"
        elif body_name in ["Crimson Red", "Rose Pink"]:
            border_hex, border_name = "#D97706", "Rich Gold"
        else:
            border_hex, border_name = "#D97706", "Rich Gold"
        pallu_hex = border_hex
        palette_label = f"{body_name} with {border_name} Border"
    else:
        body_hex, body_name = "#800020", "Crimson Red"
        border_hex, border_name = "#D97706", "Rich Gold"
        pallu_hex = "#991B1B"
        palette_label = "Bridal Crimson & Royal Gold"

    zari_hex = "#FBBF24"
    if "silver" in prompt_lower or "వెండి" in prompt_lower:
        zari_hex = "#E2E8F0"

    # Primary Motif Detection
    primary_motif = MOTIF_CATALOG[0] # Peacock default
    if any(k in prompt_lower for k in ['floral', 'flower', 'lotus', 'kamala', 'leaf', 'పూలు', 'తామర', 'ఆకు']):
        primary_motif = MOTIF_CATALOG[4] # Lotus
    elif any(k in prompt_lower for k in ['peacock', 'mayuri', 'నెమలి', 'మయూరి', 'పింఛం']):
        primary_motif = MOTIF_CATALOG[0]
    elif any(k in prompt_lower for k in ['mango', 'paisley', 'kalka', 'మామిడి', 'కల్కా']):
        primary_motif = MOTIF_CATALOG[1]
    elif any(k in prompt_lower for k in ['temple', 'gopuram', 'గోపురం', 'గుడి']):
        primary_motif = MOTIF_CATALOG[2]
    elif any(k in prompt_lower for k in ['elephant', 'gaja', 'ఏనుగు']):
        primary_motif = MOTIF_CATALOG[3]
    elif any(k in prompt_lower for k in ['ikat', 'diamond', 'geometric', 'pattern', 'patterns', 'డైమండ్', 'ఇకత్', 'రేఖాగణిత']):
        primary_motif = MOTIF_CATALOG[5]
    elif any(k in prompt_lower for k in ['swan', 'hamsa', 'హంస']):
        primary_motif = MOTIF_CATALOG[6]

    # Distinct Motif Variations according to user prompt
    if primary_motif['id'] == 'peacock':
        motif_var1 = MOTIF_CATALOG[0] # Peacock
        motif_var2 = MOTIF_CATALOG[0] # Peacock
        motif_var3 = MOTIF_CATALOG[0] # Peacock
    elif primary_motif['id'] == 'lotus':
        motif_var1 = MOTIF_CATALOG[4] # Lotus
        motif_var2 = MOTIF_CATALOG[4] # Lotus
        motif_var3 = MOTIF_CATALOG[4] # Lotus
    elif primary_motif['id'] == 'mango':
        motif_var1 = MOTIF_CATALOG[1] # Mango
        motif_var2 = MOTIF_CATALOG[1] # Mango
        motif_var3 = MOTIF_CATALOG[1] # Mango
    else:
        motif_var1 = primary_motif
        motif_var2 = primary_motif
        motif_var3 = primary_motif

    # Style Detection
    if any(k in prompt_lower for k in ['modern', 'simple', 'lightweight', 'తేలిక', 'మోడర్న్', 'ఉప్పాడ', 'uppada']):
        style_info = HANDLOOM_STYLES[1]
        style_label = "Modern Jamdani Light Style"
    elif any(k in prompt_lower for k in ['pochampally', 'ikat', 'festive', 'పోచంపల్లి', 'ఇకత్']):
        style_info = HANDLOOM_STYLES[2]
        style_label = "Festive Ikat Style"
    elif any(k in prompt_lower for k in ['venkatagiri', 'cotton', 'వెంకటగిరి', 'నూలు']):
        style_info = HANDLOOM_STYLES[3]
        style_label = "Venkatagiri Fine Style"
    elif any(k in prompt_lower for k in ['kanchi', 'kanchipuram', 'bridal', 'wedding', 'heavy', 'పెళ్లి', 'వివాహం', 'కాంచీ']):
        style_info = HANDLOOM_STYLES[4]
        style_label = "Grand Bridal Silk Style"
    else:
        style_info = HANDLOOM_STYLES[0]
        style_label = "Traditional Andhra Handloom"

    # Define 3 distinct variation presets (rotated by seed)
    v_configs = [
        {
            "id": 1,
            "title_en": f"Design 1: Floral Body + Temple Border + Traditional Pallu",
            "title_te": "డిజైన్ 1: పూల తీగల బాడీ + గోపురం బోర్డర్ + సాంప్రదాయ పల్లూ",
            "bodyPattern": "floral_vines",
            "borderStyle": "temple",
            "palluStyle": "traditional_stripes",
            "motif": motif_var1,
            "motifArrangement": "staggered",
            "motifDensity": "Medium",
            "layoutType": "Traditional Korvai Layout",
            "zariShine": zari_hex,
            "desc": "Floral body pattern paired with classic temple gopuram border and traditional banded pallu."
        },
        {
            "id": 2,
            "title_en": f"Design 2: Geometric Body + Zari Border + Patterned Pallu",
            "title_te": "డిజైన్ 2: రేఖాగణిత గడుల బాడీ + జరీ బోర్డర్ + చక్ర పల్లూ",
            "bodyPattern": "checks",
            "borderStyle": "double_zari",
            "palluStyle": "grand_medallion",
            "motif": motif_var2,
            "motifArrangement": "grid",
            "motifDensity": "Dense",
            "layoutType": "Geometric Zari Grid Layout",
            "zariShine": "#F59E0B" if zari_hex == "#FBBF24" else zari_hex,
            "desc": "Kattam checks body pattern with rich double zari border and grand medallion pallu."
        },
        {
            "id": 3,
            "title_en": f"Design 3: Paisley Lattice + Floral Border + Decorative Pallu",
            "title_te": "డిజైన్ 3: ప్యాటర్న్ వల బాడీ + పూల బోర్డర్ + అలంకార పల్లూ",
            "bodyPattern": "lattice",
            "borderStyle": "ikat_wave",
            "palluStyle": "decorative_pallu",
            "motif": motif_var3,
            "motifArrangement": "lattice_nodes",
            "motifDensity": "Sparse",
            "layoutType": "Decorative Heritage Layout",
            "zariShine": zari_hex,
            "desc": "Diamond lattice body pattern with ikat waves border and intricate multi-paneled decorative pallu."
        },
        {
            "id": 4,
            "title_en": f"Design 4: Diagonal Lines + Peacock Border + Cascading Pallu",
            "title_te": "డిజైన్ 4: క్రాస్ గీతల బాడీ + నెమలి బోర్డర్ + గోపురాల పల్లూ",
            "bodyPattern": "diagonal_ikat",
            "borderStyle": "peacock_border",
            "palluStyle": "cascade_temple",
            "motif": motif_var1,
            "motifArrangement": "diagonal",
            "motifDensity": "Medium",
            "layoutType": "Dynamic Diagonal Weave Layout",
            "zariShine": zari_hex,
            "desc": "Diagonal ikat body weave with repeating peacock border silhouettes and cascading temple pallu."
        },
        {
            "id": 5,
            "title_en": f"Design 5: Fine Stripes + Chevron Border + Color-Blocked Pallu",
            "title_te": "డిజైన్ 5: జరీ గీతల బాడీ + జిగ్-జాగ్ బోర్డర్ + బహుళ రంగుల పల్లూ",
            "bodyPattern": "stripes",
            "borderStyle": "chevron_pattern",
            "palluStyle": "ikat_block",
            "motif": motif_var2,
            "motifArrangement": "border_trailing",
            "motifDensity": "Sparse",
            "layoutType": "Modern Jamdani Layout",
            "zariShine": zari_hex,
            "desc": "Parallel zari pin-stripe body with geometric chevron border and bold color-blocked ikat pallu."
        }
    ]

    # Rotate selection based on seed for "Generate Another Design"
    shift = (seed * 2) % len(v_configs)
    selected_configs = [v_configs[(0 + shift) % len(v_configs)],
                        v_configs[(1 + shift) % len(v_configs)],
                        v_configs[(2 + shift) % len(v_configs)]]

    variations = []
    for idx, cfg in enumerate(selected_configs, 1):
        v_body_hex = body_hex
        v_border_hex = border_hex
        v_pallu_hex = pallu_hex

        # Subtle variation in shade if prompt allows, keeping theme intact
        if idx == 2 and border_hex == pallu_hex:
            # slightly deeper pallu shade
            v_pallu_hex = border_hex

        weaver_specs = {
            "warpYarn": "2/120s Mulberry Silk" if "silk" in prompt_lower or "పట్టు" in prompt_lower else "2/100s Mercerized Cotton",
            "weftYarn": "Pure Silk 20/22 Denier" if "silk" in prompt_lower or "పట్టు" in prompt_lower else "80s Combed Cotton",
            "reedPicks": f"{80 + idx*4} Reed / {88 + idx*4} Picks per inch",
            "zariType": f"Tested Metallic Zari ({'Silver' if cfg['zariShine'] == '#E2E8F0' else 'Gold'})",
            "estimatedWeavingTime": f"{6 + idx} Days (Handloom Jacquard)",
            "jacquardCards": f"{240 + idx*40} Hooks Jacquard Card Set"
        }

        mot_en = cfg["motif"]["en"]
        mot_te = cfg["motif"]["te"]

        if 'te' in language:
            summary = f"<b>{cfg['title_te']}</b><br/>🎨 రంగులు: {palette_label} <br/>🪷 మోటిఫ్: {mot_te} ({cfg['motifArrangement']}) <br/>🏛️ బోర్డర్: {cfg['borderStyle'].replace('_', ' ').title()} <br/>📐 బాడీ ప్యాటర్న్: {cfg['bodyPattern'].replace('_', ' ').title()}"
        else:
            summary = f"<b>{cfg['title_en']}</b><br/>🎨 Colors: {palette_label} <br/>🪷 Motif: {mot_en} ({cfg['motifArrangement']}) <br/>🏛️ Border: {cfg['borderStyle'].replace('_', ' ').title()} <br/>📐 Body Pattern: {cfg['bodyPattern'].replace('_', ' ').title()}"

        variations.append({
            "variationId": idx,
            "variationTitle": cfg["title_te"] if 'te' in language else cfg["title_en"],
            "style": style_info,
            "colors": {
                "body": v_body_hex,
                "border": v_border_hex,
                "pallu": v_pallu_hex,
                "zari": cfg["zariShine"],
                "paletteName": palette_label
            },
            "motif": cfg["motif"],
            "bodyPattern": cfg["bodyPattern"],
            "borderStyle": cfg["borderStyle"],
            "palluStyle": cfg["palluStyle"],
            "motifArrangement": cfg["motifArrangement"],
            "motifDensity": cfg["motifDensity"],
            "layoutType": cfg["layoutType"],
            "aiSummary": summary,
            "weaverSpecs": weaver_specs,
            "suggestedTitle": f"{body_name} {mot_en.split()[0]} Saree (Variation {idx})"
        })

    detected_reqs = {
        "color": palette_label,
        "motif": primary_motif["en"],
        "border": f"3 Distinct Designs Generated",
        "style": style_label
    }

    return {
        "success": True,
        "variations": variations,
        "suggestion": variations[0], # For backward compatibility
        "detectedRequirements": detected_reqs,
        "prompt": user_prompt
    }

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/suggest', methods=['POST'])
def suggest_design():
    data = request.get_json() or {}
    user_prompt = data.get('prompt', '').strip()
    user_style = data.get('style', '').strip()
    language = data.get('language', 'en-US')
    seed = data.get('seed', 0)

    if user_style and user_style.lower() not in user_prompt.lower():
        user_prompt = f"{user_style} style saree. {user_prompt}"

    result = generate_variations_from_prompt(user_prompt, language, seed)
    return jsonify(result)



@app.route('/api/designs', methods=['GET'])
def get_designs():
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT DesignID, DesignTitle, SareeStyle, FabricType, BodyColor, BorderColor, PalluColor, ZariColor, MotifType, MotifDensity, BorderStyle, PromptUsed, CreatedAt FROM dbo.Designs ORDER BY CreatedAt DESC")
            rows = cursor.fetchall()
            designs = []
            for row in rows:
                designs.append({
                    "id": row[0],
                    "title": row[1],
                    "sareeStyle": row[2],
                    "fabricType": row[3],
                    "bodyColor": row[4],
                    "borderColor": row[5],
                    "palluColor": row[6],
                    "zariColor": row[7],
                    "motifType": row[8],
                    "motifDensity": row[9],
                    "borderStyle": row[10],
                    "prompt": row[11],
                    "createdAt": str(row[12])
                })
            conn.close()
            return jsonify({"success": True, "source": "sql_server", "designs": designs})
        except Exception as e:
            pass
    
    # Fallback to local JSON file
    local_designs = load_local_designs()
    return jsonify({"success": True, "source": "local_storage", "designs": local_designs})


@app.route('/api/designs', methods=['POST'])
def save_design():
    data = request.get_json() or {}
    title = data.get('title', 'Handloom Saree Design')
    saree_style = data.get('sareeStyle', 'Mangalagiri')
    fabric_type = data.get('fabricType', 'Silk')
    body_color = data.get('bodyColor', '#800020')
    border_color = data.get('borderColor', '#D97706')
    pallu_color = data.get('palluColor', '#991B1B')
    zari_color = data.get('zariColor', '#FBBF24')
    motif_type = data.get('motifType', 'Peacock')
    motif_density = data.get('motifDensity', 'Medium')
    border_style = data.get('borderStyle', 'temple')
    prompt_used = data.get('prompt', '')

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO dbo.Designs (DesignTitle, SareeStyle, FabricType, BodyColor, BorderColor, PalluColor, ZariColor, MotifType, MotifDensity, BorderStyle, PromptUsed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (title, saree_style, fabric_type, body_color, border_color, pallu_color, zari_color, motif_type, motif_density, border_style, prompt_used))
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": "Design saved to SQL Server successfully!"})
        except Exception as e:
            pass

    # Save locally
    local_designs = load_local_designs()
    new_design = {
        "id": int(datetime.datetime.now().timestamp()),
        "title": title,
        "sareeStyle": saree_style,
        "fabricType": fabric_type,
        "bodyColor": body_color,
        "borderColor": border_color,
        "palluColor": pallu_color,
        "zariColor": zari_color,
        "motifType": motif_type,
        "motifDensity": motif_density,
        "borderStyle": border_style,
        "prompt": prompt_used,
        "createdAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    local_designs.insert(0, new_design)
    save_local_designs(local_designs)

    return jsonify({"success": True, "message": "Design saved to local storage!", "design": new_design})


@app.route('/api/motifs', methods=['GET'])
def get_motifs():
    return jsonify({"success": True, "motifs": MOTIF_CATALOG})


@app.route('/api/palettes', methods=['GET'])
def get_palettes():
    return jsonify({"success": True, "palettes": COLOR_PALETTES})

CONTACT_FILE = os.path.join(os.path.dirname(__file__), 'contact_submissions.json')

@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    cluster = data.get('cluster', '').strip()
    purpose = data.get('purpose', '').strip()
    message = data.get('message', '').strip()

    if not name or not email:
        return jsonify({"success": False, "error": "Name and email are required"}), 400

    entry = {
        "id": int(datetime.datetime.now().timestamp() * 1000),
        "name": name,
        "email": email,
        "phone": phone,
        "cluster": cluster,
        "purpose": purpose,
        "message": message,
        "createdAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    try:
        submissions = []
        if os.path.exists(CONTACT_FILE):
            try:
                with open(CONTACT_FILE, 'r', encoding='utf-8') as f:
                    submissions = json.load(f)
            except Exception:
                submissions = []
        submissions.append(entry)
        with open(CONTACT_FILE, 'w', encoding='utf-8') as f:
            json.dump(submissions, f, ensure_ascii=False, indent=2)
    except Exception as e:
        pass

    return jsonify({"success": True, "message": "Thank you! Your message has been received by our Handloom Studio team.", "entry": entry})


@app.route('/api/health', methods=['GET'])
def health():
    db_conn = get_db_connection()
    db_status = "Connected to SQL Server (HandloomDesignDB)" if db_conn else "Running on local JSON mode (SQL Server optional)"
    if db_conn:
        db_conn.close()
    return jsonify({
        "status": "online",
        "app": "Chenetha Design Mitra - Handloom AI Tool",
        "database": db_status
    })

if __name__ == '__main__':
    print("==========================================================")
    print("  CHENETHA DESIGN MITRA - Handloom AI Suggestion Server   ")
    print("  Running on: http://127.0.0.1:5000                       ")
    print("==========================================================")
    app.run(host='0.0.0.0', port=5000, debug=True)
