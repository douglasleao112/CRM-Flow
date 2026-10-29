from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import shutil
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath


EXPECTED_VERSION = "1.0.24"
EXPECTED_NAME = "CRM Flow"
EXTENSION_ID = "fdjgakenobjgefpoembepclojjhlmpil"
REQUIRED_FILES = (
    "manifest.json",
    "editor.html",
    "editor.js",
    "crm-background.js",
    "background.js",
    "engine.js",
    "content.js",
    "instagram/manifest.json",
)
BACKUP_FORMATS = {"whatsflow-full-backup", "mkt-flow-full-backup"}
COUNT_KEYS = (
    "wfFlows",
    "wfScheduledMessages",
    "wfCampaigns",
    "wfContactLists",
    "wfContacts",
    "bots",
    "kanbanColumns",
    "contactList",
    "quickMessages",
    "quickFolders",
)

CONFIG_ROOT = Path(os.environ.get("CRM_FLOW_CONFIG_ROOT", "/config")).resolve()
DESKTOP = CONFIG_ROOT / "Desktop"
DOWNLOADS = CONFIG_ROOT / "Downloads"
ACTIVE = CONFIG_ROOT / "whatsflow-install-20260815" / "whatsapp-flow-extension-v2.3"
PACKAGE = DOWNLOADS / "CRM-Flow-main (1).zip"
STAMP = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
STAGING = CONFIG_ROOT / f"crm-flow-v{EXPECTED_VERSION}-staged-{STAMP}"
EXTRACT_ROOT = CONFIG_ROOT / f"crm-flow-v{EXPECTED_VERSION}-extract-{STAMP}"
CODE_BACKUP = DESKTOP / f"whatsflow-code-backup-pre-crm-flow-v{EXPECTED_VERSION}-{STAMP}"
ROLLBACK = DESKTOP / f"whatsflow-active-pre-swap-crm-flow-v{EXPECTED_VERSION}-{STAMP}"
DATA_BACKUP = DESKTOP / f"crm-flow-data-backup-pre-v{EXPECTED_VERSION}-{STAMP}.json"
STORAGE_BACKUP = DESKTOP / f"crm-flow-chrome-storage-pre-v{EXPECTED_VERSION}-{STAMP}"
REPORT = DESKTOP / f"crm-flow-v{EXPECTED_VERSION}-update-report.json"


def read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def item_count(value: object) -> int | None:
    if isinstance(value, (dict, list, tuple, set, str)):
        return len(value)
    return None


def validate_manifest(folder: Path) -> dict:
    manifest_path = folder / "manifest.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(f"manifest.json missing from {folder}")
    manifest = read_json(manifest_path)
    version = str(manifest.get("version", ""))
    name = str(manifest.get("name", ""))
    if version != EXPECTED_VERSION:
        raise ValueError(f"Unexpected extension version {version!r}; expected {EXPECTED_VERSION!r}")
    if name != EXPECTED_NAME:
        raise ValueError(f"Unexpected extension name {name!r}; expected {EXPECTED_NAME!r}")
    missing = [relative for relative in REQUIRED_FILES if not (folder / relative).is_file()]
    if missing:
        raise FileNotFoundError(f"Required update files are missing: {', '.join(missing)}")
    return manifest


def newest_full_backup() -> Path:
    candidates = [path for path in DOWNLOADS.glob("*backup-completo*.json") if path.is_file()]
    if not candidates:
        raise FileNotFoundError(f"No complete data backup (*backup-completo*.json) found in {DOWNLOADS}")
    return max(candidates, key=lambda path: path.stat().st_mtime)


def validate_and_copy_data_backup() -> dict:
    source = newest_full_backup()
    payload = read_json(source)
    backup_format = str(payload.get("format", ""))
    if backup_format not in BACKUP_FORMATS:
        raise ValueError(f"Unexpected full backup format {backup_format!r} in {source.name}")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ValueError(f"Complete backup has no valid data object: {source}")
    shutil.copy2(source, DATA_BACKUP)
    source_hash = sha256_file(source)
    copied_hash = sha256_file(DATA_BACKUP)
    if source_hash != copied_hash:
        raise IOError("Complete backup hash mismatch after copy")
    counts = {key: item_count(data.get(key)) for key in COUNT_KEYS if key in data}
    return {
        "source": str(source),
        "copy": str(DATA_BACKUP),
        "bytes": DATA_BACKUP.stat().st_size,
        "sha256": copied_hash,
        "format": backup_format,
        "top_level_data_keys": len(data),
        "counts": counts,
    }


def find_chrome_extension_storage() -> Path | None:
    candidates = (
        CONFIG_ROOT / ".config" / "chromium" / "Default" / "Local Extension Settings" / EXTENSION_ID,
        CONFIG_ROOT / ".config" / "google-chrome" / "Default" / "Local Extension Settings" / EXTENSION_ID,
    )
    return next((path for path in candidates if path.is_dir()), None)


def copy_chrome_extension_storage() -> dict:
    source = find_chrome_extension_storage()
    if source is None:
        return {"copied": False, "reason": "Raw extension storage folder was not found."}
    shutil.copytree(source, STORAGE_BACKUP, copy_function=shutil.copy2)
    files = [path for path in STORAGE_BACKUP.rglob("*") if path.is_file()]
    return {
        "copied": True,
        "source": str(source),
        "copy": str(STORAGE_BACKUP),
        "files": len(files),
        "bytes": sum(path.stat().st_size for path in files),
    }


def validate_zip_member(info: zipfile.ZipInfo) -> None:
    member = PurePosixPath(info.filename)
    if member.is_absolute() or ".." in member.parts:
        raise ValueError(f"Unsafe ZIP member path: {info.filename}")
    unix_mode = info.external_attr >> 16
    if unix_mode and stat.S_ISLNK(unix_mode):
        raise ValueError(f"Symbolic links are not allowed in the update package: {info.filename}")


def extract_package() -> dict:
    with zipfile.ZipFile(PACKAGE) as archive:
        for info in archive.infolist():
            validate_zip_member(info)
        manifests = sorted(
            (PurePosixPath(info.filename) for info in archive.infolist()
             if not info.is_dir() and PurePosixPath(info.filename).name == "manifest.json"),
            key=lambda path: len(path.parts),
        )
        if not manifests:
            raise ValueError("No manifest.json was found in the update package")
        package_manifest_path = manifests[0]
        if len(package_manifest_path.parts) > 2:
            raise ValueError(f"The main manifest is nested too deeply: {package_manifest_path.as_posix()}")
        package_manifest = json.loads(archive.read(package_manifest_path.as_posix()).decode("utf-8"))
        if str(package_manifest.get("version", "")) != EXPECTED_VERSION:
            raise ValueError(
                f"Unexpected package version {package_manifest.get('version')!r}; expected {EXPECTED_VERSION!r}"
            )
        if str(package_manifest.get("name", "")) != EXPECTED_NAME:
            raise ValueError(f"Unexpected package name {package_manifest.get('name')!r}; expected {EXPECTED_NAME!r}")
        EXTRACT_ROOT.mkdir(parents=True)
        archive.extractall(EXTRACT_ROOT)
    source_root = EXTRACT_ROOT.joinpath(*package_manifest_path.parent.parts)
    shutil.copytree(source_root, STAGING, copy_function=shutil.copy2)
    validate_manifest(STAGING)
    return {
        "manifest_in_zip": package_manifest_path.as_posix(),
        "package_bytes": PACKAGE.stat().st_size,
        "package_sha256": sha256_file(PACKAGE),
    }


def write_report(status: str, **details: object) -> None:
    DESKTOP.mkdir(parents=True, exist_ok=True)
    payload = {
        "status": status,
        "updated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "expected_name": EXPECTED_NAME,
        "expected_version": EXPECTED_VERSION,
        "extension_id": EXTENSION_ID,
        "active_folder": str(ACTIVE),
        "package": str(PACKAGE),
        "code_backup_folder": str(CODE_BACKUP),
        "rollback_folder": str(ROLLBACK),
        "data_backup": str(DATA_BACKUP),
        "storage_backup": str(STORAGE_BACKUP),
        **details,
    }
    REPORT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def notify(title: str, message: str, error: bool = False) -> None:
    try:
        import tkinter.messagebox as messagebox
        if error:
            messagebox.showerror(title, message)
        else:
            messagebox.showinfo(title, message)
    except Exception:
        print(f"{title}: {message}", file=sys.stderr if error else sys.stdout)


def clean_temporary_paths() -> None:
    for path in (STAGING, EXTRACT_ROOT):
        if path.exists():
            shutil.rmtree(path)


def main() -> int:
    data_summary: dict = {}
    storage_summary: dict = {}
    package_summary: dict = {}
    swapped = False
    try:
        if not ACTIVE.is_dir():
            raise FileNotFoundError(f"Active extension folder not found: {ACTIVE}")
        if not PACKAGE.is_file():
            raise FileNotFoundError(f"Update package not found: {PACKAGE}")
        old_manifest = read_json(ACTIVE / "manifest.json")
        old_name = str(old_manifest.get("name", ""))
        old_version = str(old_manifest.get("version", ""))
        data_summary = validate_and_copy_data_backup()
        storage_summary = copy_chrome_extension_storage()
        shutil.copytree(ACTIVE, CODE_BACKUP, copy_function=shutil.copy2)
        package_summary = extract_package()
        ACTIVE.rename(ROLLBACK)
        swapped = True
        try:
            STAGING.rename(ACTIVE)
        except Exception:
            if not ACTIVE.exists() and ROLLBACK.exists():
                ROLLBACK.rename(ACTIVE)
                swapped = False
            raise
        active_manifest = validate_manifest(ACTIVE)
        clean_temporary_paths()
        write_report(
            "success",
            previous_name=old_name,
            previous_version=old_version,
            active_name=str(active_manifest.get("name", "")),
            active_version=str(active_manifest.get("version", "")),
            data_backup_summary=data_summary,
            chrome_storage_backup_summary=storage_summary,
            package_summary=package_summary,
            message="Files updated at the existing path; browser profile and extension storage were preserved.",
        )
        notify(
            "CRM Flow atualizado",
            f"Arquivos atualizados para CRM Flow {EXPECTED_VERSION}.\n\n"
            f"Backup dos dados: {DATA_BACKUP.name}\n"
            f"Backup do codigo: {CODE_BACKUP.name}\n\n"
            "Agora recarregue a extensao no Chromium.",
        )
        return 0
    except Exception as exc:
        rollback_note = "not needed"
        try:
            if swapped and ROLLBACK.exists():
                failed_new = DESKTOP / f"crm-flow-failed-active-v{EXPECTED_VERSION}-{STAMP}"
                if ACTIVE.exists():
                    ACTIVE.rename(failed_new)
                ROLLBACK.rename(ACTIVE)
                rollback_note = f"previous version restored; failed files kept at {failed_new}"
        except Exception as rollback_exc:
            rollback_note = f"automatic rollback also failed: {rollback_exc}"
        try:
            clean_temporary_paths()
        except Exception:
            pass
        write_report(
            "failed",
            error_type=type(exc).__name__,
            error=str(exc),
            rollback=rollback_note,
            data_backup_summary=data_summary,
            chrome_storage_backup_summary=storage_summary,
            package_summary=package_summary,
        )
        notify("Atualizacao cancelada", f"Erro: {exc}\n\nRollback: {rollback_note}", error=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

