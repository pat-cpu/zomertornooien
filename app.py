from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from datetime import datetime
from flask_cors import CORS

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"
DB_FILE = DATA_DIR / "pc_tornooien.sqlite3"
BASE_FILE = DATA_DIR / "tornooien.json"
ARCHIVE_DIR = DATA_DIR / "archive"

app = Flask(__name__, static_folder=str(APP_DIR), static_url_path="")
CORS(app)


def get_conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS tournaments (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    conn.commit()
    cur.close()
    conn.close()


def _all():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT data FROM tournaments")
    rows = cur.fetchall()

    result = [json.loads(r[0]) for r in rows]

    cur.close()
    conn.close()
    return result


def _replace_all(items):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("DELETE FROM tournaments")

    now = datetime.now().isoformat()

    for i, item in enumerate(items):
        item_id = str(item.get("id") or f"id-{i}")
        cur.execute(
            "INSERT INTO tournaments (id, data, updated_at) VALUES (?, ?, ?)",
            (item_id, json.dumps(item), now)
        )

    conn.commit()
    cur.close()
    conn.close()


@app.get("/api/tournaments")
def get_all():
    return jsonify(_all())


@app.post("/api/tournaments")
def save_all():
    data = request.get_json()

    if not isinstance(data, list):
        return jsonify({"error": "invalid"}), 400

    _replace_all(data)
    return jsonify({"ok": True})


@app.get("/")
def index():
    return send_from_directory(str(APP_DIR), "index.html")


@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(str(APP_DIR), path)


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=8000)