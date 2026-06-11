"""Health import endpoints: preview, commit, template, report."""
import csv
import json
from io import StringIO, BytesIO
from datetime import datetime
from urllib.parse import quote

from flask import Blueprint, request, jsonify, Response, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..manager.health_import_manager import HealthImportManager, ImportValidationError
from ..manager.member_manager import MemberManager
from ..timeutil import UTC
from ..utils import error
try:
    from openpyxl import Workbook
except ImportError:  # pragma: no cover - optional dependency
    Workbook = None

health_import_bp = Blueprint("health_import", __name__)
_import_mgr = HealthImportManager()
_member_mgr = MemberManager()


@health_import_bp.route("/preview", methods=["POST"])
@jwt_required()
def preview_import():
    user_id = get_jwt_identity()
    file = request.files.get("file")
    mapping_raw = request.form.get("mapping")
    mapping = None
    if mapping_raw:
        try:
            mapping = json.loads(mapping_raw)
        except Exception:
            return jsonify(error("400", "Invalid mapping payload")), 400
    try:
        result = _import_mgr.preview(user_id, file, mapping)
        return jsonify(result), 200
    except ImportValidationError as exc:
        return jsonify(error("400", str(exc))), 400
    except Exception as exc:
        # Log the full exception for debugging
        import traceback
        traceback.print_exc()
        return jsonify(error("500", f"Import preview failed: {str(exc)}")), 500


@health_import_bp.route("/commit", methods=["POST"])
@jwt_required()
def commit_import():
    user_id = get_jwt_identity()
    payload = request.get_json(force=True) or {}
    session_id = payload.get("session_id")
    approved_new_members = payload.get("approved_new_members") or []
    member_mappings = payload.get("member_mappings") or {}
    try:
        result = _import_mgr.commit(user_id, session_id, approved_new_members, member_mappings)
        return jsonify(result), 200
    except ImportValidationError as exc:
        return jsonify(error("400", str(exc))), 400
    except Exception as exc:
        # Log the full exception for debugging
        import traceback
        traceback.print_exc()
        return jsonify(error("500", f"Import commit failed: {str(exc)}")), 500


@health_import_bp.route("/template", methods=["GET"])
@jwt_required()
def download_template():
    fmt = (request.args.get("format") or "excel").lower()
    if fmt not in ("excel", "csv"):
        return jsonify(error("400", "format must be excel or csv")), 400

    headers = ["成员名称", "测量时间", "收缩压", "舒张压", "心率", "标签", "备注"]
    sample_rows = [
        ["Self", "2025-12-19 08:30:00", 120, 80, 72, "晨起;空腹", "早晨测量"],
        ["张三", "2025-12-18 20:00:00", 135, 85, 78, "晚餐后", "感觉有点头晕"],
    ]

    if fmt == "csv":
        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow(headers)
        writer.writerows(sample_rows)
        data = "\ufeff" + buf.getvalue()
        filename_utf8 = "health_records_import_template.csv"
        return Response(
            data,
            mimetype="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename=\"health_records_import_template.csv\"; filename*=UTF-8''{quote(filename_utf8)}"
            },
        )
    # Excel
    if Workbook is None:
        return jsonify(error("500", "openpyxl is required for excel template")), 500
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in sample_rows:
        ws.append(row)
    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)
    filename = "health_records_import_template.xlsx"
    return send_file(
        stream,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@health_import_bp.route("/report", methods=["POST"])
@jwt_required()
def download_report():
    payload = request.get_json(force=True) or {}
    errors_rows = payload.get("errors") or []
    skipped_rows = payload.get("skipped") or []

    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["row", "member_name", "timestamp", "systolic", "diastolic", "heart_rate", "tags", "note", "status", "messages"])
    for r in errors_rows + skipped_rows:
        data = r.get("data", {})
        writer.writerow([
            r.get("row"),
            data.get("member_name"),
            data.get("timestamp"),
            data.get("systolic"),
            data.get("diastolic"),
            data.get("heart_rate"),
            ";".join(data.get("tags") or []),
            data.get("note") or "",
            r.get("status"),
            ";".join(r.get("messages") or []),
        ])
    csv_data = "\ufeff" + buf.getvalue()
    filename_utf8 = f"health_import_report_{datetime.now(UTC).date().isoformat()}.csv"
    return Response(
        csv_data,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename_utf8}\"; filename*=UTF-8''{quote(filename_utf8)}"
        },
    )


@health_import_bp.route("/template", methods=["OPTIONS"])
@health_import_bp.route("/preview", methods=["OPTIONS"])
@health_import_bp.route("/commit", methods=["OPTIONS"])
@health_import_bp.route("/report", methods=["OPTIONS"])
def options_ok():
    return "", 204
