from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
from pathlib import Path

# ============================
# Config
# ============================
BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "tornooien.json"
APP_DIR = BASE_DIR  # voor index.html

# ============================
# App
# ============================
app = Flask(__name__, static_folder=str(APP_DIR), static_url_path="")

# 🔥 BELANGRIJK: CORS aanzetten
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=False
)

# ============================
# Helpers
# ============================
def read_data():
    if not DATA_FILE.exists():
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def write_data(data):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ============================
# API
# ============================
@app.get("/api/tournaments")
def get_tournaments():
    return jsonify(read_data())

@app.post("/api/tournaments")
def save_tournaments():
    try:
        data = request.get_json(force=True)
        if not isinstance(data, list):
            return jsonify({"error": "Invalid data"}), 400

        write_data(data)
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================
# Frontend (optioneel)
# ============================
@app.get("/")
def index():
    return send_from_directory(APP_DIR, "index.html")

@app.get("/<path:path>")
def static_proxy(path):
    return send_from_directory(APP_DIR, path)

# ============================
# Run lokaal
# ============================
if __name__ == "__main__":
    app.run(debug=True)