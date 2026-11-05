# 🧵 Chenetha Design Mitra (చేనేత డిజైన్ మిత్ర)
## AI-Powered Design Suggestion Tool for Handloom Weavers
**College Community Service Project (CSP) Prototype**

---

### 🌟 Project Overview
**Chenetha Design Mitra** is an AI-assisted web tool built to support traditional handloom weavers (such as those in Mangalagiri, Uppada, Pochampally, Venkatagiri, and Kanchipuram clusters). 

Weavers can express design requirements using **Voice (Telugu or English)** or **Text**, and the system provides:
1. **AI Design Suggestions**: Automatic recommendation of saree styles, color palettes, and traditional motifs (Peacock, Mango/Kalka, Temple Gopuram, Elephant, Lotus, Ikat).
2. **Color & Pattern Customization**: Real-time manipulation of body color, border color, pallu color, zari metal luster, motif density, and border styles.
3. **Dynamic Fabric Preview**: Interactive HTML5 Canvas visualizer rendering Flat Saree layout, 3D Saree Drape simulation, and Thread/Motif Zoom view.
4. **Weaver Specification Card**: Technical jacquard card and yarn specifications (warp/weft counts, reed/picks, estimated weaving days).
5. **Save & Download**: Download high-resolution PNG previews, print Weaver cards, and save designs into **SQL Server (SSMS)** or local storage.

---

### 🚀 Key Features

* **🎙️ Dual-Language Voice/Text Input**: Integrated Web Speech API supporting both **Telugu (`te-IN`)** and **English (`en-US`)**.
* **🤖 AI Generative Synthesis**: Synthesizes color harmonies, motif symbolism, and loom specifications from natural language descriptions.
* **🎨 Interactive Design Studio**: Live color pickers and motif customization with real-time canvas rendering.
* **📜 Weaver Jacquard Card Generator**: Formats yarn counts (e.g., 2/120s Mulberry Silk), reed/picks, and hook counts.
* **💾 SQL Server (SSMS) & Local Storage Bridge**: Seamlessly connects to MS SQL Server (`HandloomDesignDB`) with automatic fallback to client/JSON storage if database is offline.

---

### 🛠️ Technology Stack

* **Frontend**: HTML5, CSS3 (Modern Glassmorphism & Handloom Aesthetic), Vanilla JavaScript (Web Speech API, HTML5 Canvas API).
* **Backend**: Python 3.x + Flask (`app.py`), `flask-cors`.
* **Database**: SQL Server Management Studio (SSMS) / MS SQL Server via `pyodbc` (`schema.sql`).

---

### 📁 Project Structure

```
csp/
├── index.html          # Main Web Application Interface (Bilingual English/Telugu)
├── styles.css          # Handloom Silk & Crimson Design System Stylesheet
├── app.js              # Speech-to-Text, Canvas Visualizer & UI Interactivity
├── app.py              # Flask Backend Server with AI Synthesis & SQL Server API
├── schema.sql          # SQL Server (SSMS) Database Creation & Seed Data Script
├── requirements.txt    # Python dependencies
└── README.md           # Documentation & CSP Project Overview
```

---

### 💻 Setup & Execution Instructions

#### 1. Running the Frontend directly in browser (Client Mode)
You can simply open `index.html` directly in Google Chrome or Microsoft Edge to test all frontend features, voice recognition, canvas visualizer, and local storage.

#### 2. Running with Python Flask Backend
1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the Flask app:
   ```bash
   python app.py
   ```
3. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

#### 3. Connecting to SQL Server (SSMS) [Optional]
1. Open **SQL Server Management Studio (SSMS)**.
2. Run the provided `schema.sql` script to create `HandloomDesignDB` database and tables (`Users`, `Designs`, `Motifs`, `ColorPalettes`).
3. Ensure the ODBC Driver 17 for SQL Server is installed. `app.py` will automatically connect to `localhost/HandloomDesignDB` when Flask is launched!

---

### 🎓 College CSP Presentation Highlights
When demonstrating this prototype:
1. Click the **Telugu button** to show language switching.
2. Click the **Microphone icon** and speak a requirement in Telugu (e.g., *"పెళ్లి కోసం కెంపు రంగు పట్టు చీర మంగళగిరి కాటన్"*).
3. Click **"Generate AI Design Suggestions"** to highlight automatic palette selection, motif mapping, and weaving specifications.
4. Toggle between **"Flat Weave"**, **"Saree Drape View"**, and **"Zoom Motif"** views on the canvas.
5. Click **"Save Design"** and **"Download Image"** to showcase practical utility for weavers.
