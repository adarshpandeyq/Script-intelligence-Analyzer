"""Flask web application for the Script Intelligence Analyzer.

Run:  python app.py        (http://127.0.0.1:5000)
"""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, redirect, render_template, request
from werkzeug.utils import secure_filename

from sia.pipeline import analyze_script
from sia.text_processing import ScriptError, extract_text

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "instance", "analyses.db")
ALLOWED = {"txt", "text", "pdf"}

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB


# --------------------------------------------------------------------------- #
# Storage
# --------------------------------------------------------------------------- #
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                filename TEXT,
                word_count INTEGER,
                scene_count INTEGER,
                character_count INTEGER,
                protagonist TEXT,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL
            )"""
        )


init_db()


def save_analysis(result: dict, filename: str) -> int:
    stats = result["statistics"]
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO analyses (title, filename, word_count, scene_count,
               character_count, protagonist, payload, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                result["title"],
                filename,
                stats["word_count"],
                stats["scene_count"],
                stats["character_count"],
                result.get("protagonist"),
                json.dumps(result),
                datetime.utcnow().isoformat(timespec="seconds"),
            ),
        )
        return int(cur.lastrowid)


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@app.get("/")
def index():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, title, filename, word_count, scene_count, character_count, "
            "protagonist, created_at FROM analyses ORDER BY id DESC LIMIT 20"
        ).fetchall()
    return render_template("index.html", recent=[dict(r) for r in rows])


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "script-intelligence-analyzer"})


@app.post("/api/analyze")
def api_analyze():
    try:
        title = (request.form.get("title") or "").strip()
        filename = None
        if "file" in request.files and request.files["file"].filename:
            upload = request.files["file"]
            filename = secure_filename(upload.filename)
            ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            if ext not in ALLOWED:
                return jsonify({"error": "Only .txt and .pdf files are supported."}), 400
            path = os.path.join(UPLOAD_DIR, f"{datetime.utcnow().timestamp():.0f}_{filename}")
            upload.save(path)
            try:
                raw_text = extract_text(path, filename)
            finally:
                try:
                    os.remove(path)
                except OSError:
                    pass
            if not raw_text.strip():
                raise ScriptError("No text could be extracted from this file.")
            title = title or filename.rsplit(".", 1)[0].replace("_", " ").title()
        else:
            raw_text = request.form.get("text") or (request.get_json(silent=True) or {}).get("text", "")
            if not raw_text.strip():
                return jsonify({"error": "Provide a script file or paste script text."}), 400
            title = title or "Pasted Script"

        result = analyze_script(raw_text, title)
        result["id"] = save_analysis(result, filename or "pasted-text")
        return jsonify(result)
    except ScriptError as exc:
        return jsonify({"error": str(exc)}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover
        app.logger.exception("Analysis failed")
        return jsonify({"error": f"Analysis failed: {exc}"}), 500


@app.get("/api/analyses")
def api_list():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, title, filename, word_count, scene_count, character_count, "
            "protagonist, created_at FROM analyses ORDER BY id DESC LIMIT 50"
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/analyses/<int:analysis_id>")
def api_detail(analysis_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
    if not row:
        return jsonify({"error": "Analysis not found"}), 404
    payload = json.loads(row["payload"])
    payload["id"] = analysis_id
    return jsonify(payload)


@app.get("/api/analyses/<int:analysis_id>/report.md")
def api_report_md(analysis_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT payload FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
    if not row:
        return "Not found", 404
    payload = json.loads(row["payload"])
    from flask import Response

    return Response(
        payload["report"]["markdown"],
        mimetype="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=report-{analysis_id}.md"},
    )


@app.get("/ppt")
def ppt():
    return redirect("/static/Script_Intelligence_Analyzer.pptx")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG") == "1")
