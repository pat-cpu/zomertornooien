from __future__ import annotations

import json
import os
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from datetime import datetime
from flask_cors import CORS


APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"
LIVE_FILE = DATA_DIR / "tornooien_live.json"
BASE_FILE = DATA_DIR / "tornooien.json"
ARCHIVE_DIR = DATA_DIR / "archive"


app = Flask(__name__, static_folder=str(APP_DIR), static_url_path="")
CORS(app)
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://pat-cpu.github.io"]
    }
})
def _read_json(path: Path):
    if not path.exists():
        return []
    txt = path.read_text(encoding="utf-8").strip()
    if not txt:
        return []
    return json.loads(txt)

def _write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)

@app.get("/api/tournaments")
def api_get():
    # Live file heeft voorrang; als die nog niet bestaat, start van BASE
    if LIVE_FILE.exists():
        data = _read_json(LIVE_FILE)
    else:
        data = _read_json(BASE_FILE)
        _write_json(LIVE_FILE, data)
    return jsonify(data)

@app.post("/api/tournaments")
def api_post():
    data = request.get_json(silent=True)
    if not isinstance(data, list):
        return jsonify({"ok": False, "error": "Expected a JSON array (list)"}), 400
    _write_json(LIVE_FILE, data)
    return jsonify({"ok": True, "count": len(data)})

    from datetime import datetime

@app.post("/api/archive")
def api_archive():
    payload = request.get_json(silent=True) or {}
    mode = payload.get("mode", "empty")  # "empty" of "base"
    year = str(payload.get("year", "")).strip()  # optioneel

    # 1) lees huidige live
    live = _read_json(LIVE_FILE)

    # 2) schrijf archief (timestamped)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    suffix = f"-{year}" if year else ""
    archive_path = ARCHIVE_DIR / f"tornooien{suffix}-{ts}.json"
    _write_json(archive_path, live)

    # 3) reset live
    if mode == "base":
        base = _read_json(BASE_FILE)
        _write_json(LIVE_FILE, base)
        return jsonify({"ok": True, "archived_to": str(archive_path), "reset": "base", "count": len(base)})
    else:
        _write_json(LIVE_FILE, [])
        return jsonify({"ok": True, "archived_to": str(archive_path), "reset": "empty", "count": 0})


# Frontend serve
@app.get("/")
def index():
    return send_from_directory(str(APP_DIR), "index.html")

@app.get("/<path:path>")
def static_files(path: str):
    return send_from_directory(str(APP_DIR), path)

if __name__ == "__main__":
    # luister op heel je netwerk
    app.run(host="0.0.0.0", port=8000, debug=False)
