"""
Generate SCHEMA.md from the live SQLAlchemy models.

Usage:
    cd backend
    ../backend/venv/bin/python scripts/generate_schema_doc.py [output_path]

Defaults to writing ../SCHEMA.md (i.e. <repo-root>/SCHEMA.md).
"""
from __future__ import annotations

import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import inspect
from sqlalchemy.types import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    Integer,
    BigInteger,
    Numeric,
    String,
    Text,
    Time,
)

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
for name in ('.env', '../.env'):
    p = (BACKEND_DIR / name).resolve()
    if p.exists():
        load_dotenv(p)
        break

sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from app.core.types import EncryptedString, EncryptedDate  # noqa: E402


def _column_type(col) -> str:
    t = col.type
    if isinstance(t, EncryptedString):
        return f"EncryptedString({t.length})" if t.length else 'EncryptedString'
    if isinstance(t, EncryptedDate):
        return 'EncryptedDate'
    if isinstance(t, BigInteger):
        return 'BIGINT'
    if isinstance(t, Integer):
        return 'INTEGER'
    if isinstance(t, Numeric):
        return f'NUMERIC({t.precision}, {t.scale})' if t.scale is not None else f'NUMERIC({t.precision})'
    if isinstance(t, Float):
        return 'FLOAT'
    if isinstance(t, Boolean):
        return 'BOOLEAN'
    if isinstance(t, DateTime):
        tz = ' (tz)' if getattr(t, 'timezone', False) else ''
        return f'DATETIME{tz}'
    if isinstance(t, Date):
        return 'DATE'
    if isinstance(t, Time):
        return 'TIME'
    if isinstance(t, String):
        return f'VARCHAR({t.length})' if t.length else 'VARCHAR'
    if isinstance(t, Text):
        return 'TEXT'
    if isinstance(t, Enum):
        return f'ENUM({", ".join(repr(v) for v in (t.enums or ()))})'
    return type(t).__name__


def _server_default(col) -> str | None:
    sd = col.server_default
    if sd is None:
        return None
    text = str(sd.arg) if hasattr(sd, 'arg') else str(sd)
    return text.strip('"').strip("'")


def _fk_target(col) -> str | None:
    fks = list(col.foreign_keys)
    if not fks:
        return None
    parts = []
    for fk in fks:
        ondelete = fk.ondelete
        onupdate = fk.onupdate
        opts = []
        if ondelete:
            opts.append(f'ON DELETE {ondelete}')
        if onupdate:
            opts.append(f'ON UPDATE {onupdate}')
        suffix = f" {' '.join(opts)}" if opts else ''
        parts.append(f'{fk.column.table.name}.{fk.column.name}{suffix}')
    return ', '.join(parts)


def _render_table(name: str, table, doc_class: type | None = None) -> str:
    cols = list(table.columns)
    pk = [c.name for c in cols if c.primary_key]
    uq = [c.name for c in cols if c.unique and not c.primary_key]
    idx = [c.name for c in cols if c.index and not c.primary_key and not c.unique]
    has_check = bool(getattr(table, 'constraints', None))
    check_lines = []
    for cons in getattr(table, 'constraints', ()):
        sql = getattr(cons, 'sqltext', None)
        if sql is not None and hasattr(sql, 'compile'):
            try:
                check_lines.append(f'`{str(sql.compile(compile_kwargs={"literal_binds": True}))}`')
            except Exception:
                pass

    lines: list[str] = []
    lines.append(f'### `{name}`')
    lines.append('')
    if pk:
        lines.append(f'**Primary key:** `{", ".join(pk)}`')
    if uq:
        lines.append(f'**Unique columns:** `{", ".join(uq)}`')
    if idx:
        lines.append(f'**Indexed columns:** `{", ".join(idx)}`')
    if check_lines:
        lines.append('**Check constraints:**')
        for c in check_lines:
            lines.append(f'- {c}')
    fk_cols = [c for c in cols if c.foreign_keys]
    if fk_cols:
        lines.append('')
        lines.append('**Foreign keys:**')
        for c in fk_cols:
            lines.append(f'- `{c.name}` → {_fk_target(c)}')
    lines.append('')
    lines.append('| Column | Type | Null | Default | Notes |')
    lines.append('|---|---|---|---|---|')
    for c in cols:
        notes: list[str] = []
        if c.primary_key:
            notes.append('PK')
        if c.unique and not c.primary_key:
            notes.append('UNIQUE')
        if c.index and not c.primary_key and not c.unique:
            notes.append('INDEX')
        if c.foreign_keys:
            notes.append('FK')
        sd = _server_default(c)
        default = sd if sd is not None else ''
        type_str = _column_type(c)
        null_str = 'YES' if c.nullable else 'NO'
        lines.append(f'| `{c.name}` | {type_str} | {null_str} | {default} | {" ".join(notes)} |')
    lines.append('')
    return '\n'.join(lines)


def main(argv: list[str]) -> int:
    out_path = Path(argv[1]) if len(argv) > 1 else REPO_ROOT / 'SCHEMA.md'

    app = create_app()
    with app.app_context():
        from app import db
        inspector = inspect(db.engine)
        table_names = sorted(inspector.get_table_names())
        table_names = [t for t in table_names if t != 'alembic_version']

        from app.models import (
            User, PaymentMethod, Service, DiscountCode, Vehicle,
            Appointment, ServiceHistory, Assignment, Notification,
            Employee, EmployeeDocument, EmployeeTimeLog, TimeOffRequest, IssueReport,
            ServicePartner, AuditLog, SystemMetric, ActivityTracker,
            Company, FleetVehicle, FleetExpense, InvoiceLineItem, Invoice,
            Payment,
        )
        from app.services.payments.models import WebhookEvent
        from app.services.workflow.models import VehicleChecklist, WorkRecord
        from app import TokenBlocklist
        models = {
            cls.__tablename__: cls for cls in (
                User, PaymentMethod, Service, DiscountCode, Vehicle,
                Appointment, ServiceHistory, Assignment, Notification,
                Employee, EmployeeDocument, EmployeeTimeLog, TimeOffRequest, IssueReport,
                ServicePartner, AuditLog, SystemMetric, ActivityTracker,
                Company, FleetVehicle, FleetExpense, InvoiceLineItem, Invoice,
                Payment, WebhookEvent,
                VehicleChecklist, WorkRecord, TokenBlocklist,
            )
        }

        by_group: dict[str, list[str]] = {}
        for tbl in table_names:
            cls = models.get(tbl)
            if cls is not None:
                mod = cls.__module__
                parts = mod.split('.')
                if 'services' in parts:
                    i = parts.index('services')
                    group = parts[i + 1] if i + 1 < len(parts) else 'other'
                else:
                    group = parts[-1]
            else:
                group = 'other'
            by_group.setdefault(group, []).append(tbl)

        order = [
            'auth', 'catalog', 'vehicles', 'appointments', 'employees',
            'partners', 'admin', 'fleets', 'payments', 'notifications', 'workflow',
            'app', 'other',
        ]
        sorted_groups = [g for g in order if g in by_group] + [g for g in sorted(by_group) if g not in order]

        out: list[str] = []
        out.append('# Database Schema')
        out.append('')
        out.append('> **Source of truth:** this document is auto-generated from the SQLAlchemy models in `backend/app/services/*/models.py` and `backend/app/models.py`. Do not edit by hand — re-run the generator:')
        out.append('>')
        out.append('> ```bash')
        out.append('> cd backend && ../backend/venv/bin/python scripts/generate_schema_doc.py')
        out.append('> ```')
        out.append('')
        out.append(f'Last generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')
        out.append('')
        out.append(f'Total tables: **{len(table_names)}**')
        out.append('')
        out.append('## Contents')
        out.append('')
        for group in sorted_groups:
            tbls = by_group[group]
            if not tbls:
                continue
            out.append(f'- [{group.title()}](#{group})')
            for t in sorted(tbls):
                out.append(f'  - [`{t}`](#{t.lower()})')
        out.append('')

        for group in sorted_groups:
            tbls = by_group[group]
            if not tbls:
                continue
            out.append('---')
            out.append('')
            out.append(f'## {group.title()}')
            out.append('')
            for tbl in sorted(tbls):
                cls = models.get(tbl)
                table = (cls.__table__ if cls is not None else db.metadata.tables.get(tbl))
                if table is None:
                    continue
                out.append(_render_table(tbl, table, doc_class=cls))

        if not by_group.get('other'):
            out[:] = [l for l in out if not l.lstrip().startswith('- [Other') and l.strip() != '## Other']

        out_path.write_text('\n'.join(out))
        if not by_group.get('other'):
            text = out_path.read_text()
            text = re.sub(r'\n- \[Other\]\(#other\)\n', '\n', text)
            text = re.sub(r'\n---\n+\n## Other\s*\Z', '', text)
            out_path.write_text(text)
        print(f'wrote {out_path} ({out_path.stat().st_size} bytes, {len(table_names)} tables)')
        return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
