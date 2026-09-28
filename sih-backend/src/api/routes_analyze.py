"""
Traffic Upload & Analysis REST API Routes (SIH26153)
Endpoints:
- POST /api/analyze/upload - Upload .pcap, .pcapng, or .csv capture file (<200MB)
- GET /api/analyze/{job_id}/status - Check processing status & missing features notice
- GET /api/analyze/{job_id}/report - Retrieve completed analysis report payload
"""

import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends
from typing import Dict, Any
from .auth import verify_token
from ..ingestion.traffic_analyzer import (
    process_uploaded_file,
    get_job_status,
    get_job_report,
    JOB_STORE,
)

router = APIRouter(prefix="/api/analyze", tags=["analyze"], dependencies=[Depends(verify_token)])

TEMP_UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "temp_uploads"))
os.makedirs(TEMP_UPLOADS_DIR, exist_ok=True)

MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB Cap
ALLOWED_EXTENSIONS = {".pcap", ".pcapng", ".csv"}


def _sanitize_upload_filename(filename: str | None) -> str:
    """Keep uploaded files inside their job directory on every supported OS."""
    normalized_filename = (filename or "uploaded_capture.csv").replace("\\", "/")
    return os.path.basename(normalized_filename) or "uploaded_capture.csv"


@router.post("/upload", response_model=Dict[str, Any])
async def upload_traffic_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Accept ad-hoc traffic upload (.pcap, .pcapng, .csv) and initiate background processing.
    """
    filename = _sanitize_upload_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: .pcap, .pcapng, .csv"
        )

    # Scoped job ID and temporary directory
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    job_dir = os.path.join(TEMP_UPLOADS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    temp_filepath = os.path.join(job_dir, filename)

    # Save uploaded stream to disk and verify size
    file_size = 0
    with open(temp_filepath, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB Chunks
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE_BYTES:
                buffer.close()
                shutil.rmtree(job_dir, ignore_errors=True)
                raise HTTPException(
                    status_code=400,
                    detail=f"File size exceeds 200MB cap ({round(file_size / (1024*1024), 1)} MB). Please upload a smaller capture file."
                )
            buffer.write(chunk)

    # Initialize job state
    JOB_STORE[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress_message": "File uploaded successfully. Job enqueued for analysis.",
        "filename": filename,
        "file_size_bytes": file_size,
        "missing_features": [],
        "missing_features_notice": None,
        "error": None,
    }

    # Enqueue background task (non-blocking)
    background_tasks.add_task(process_uploaded_file, job_id, temp_filepath, filename, file_size)

    return {
        "job_id": job_id,
        "status": "queued",
        "filename": filename,
        "file_size_bytes": file_size,
        "message": "Upload successful. Analysis started in background."
    }


@router.get("/{job_id}/status", response_model=Dict[str, Any])
def check_job_status(job_id: str):
    """
    Poll processing status (queued, extracting_features, running_inference, done, failed).
    """
    return get_job_status(job_id)


@router.get("/{job_id}/report", response_model=Dict[str, Any])
def get_analysis_report(job_id: str):
    """
    Get completed analysis report (verdict + full state_update matching Live Monitor format).
    """
    report = get_job_report(job_id)
    if not report:
        status_info = get_job_status(job_id)
        if status_info.get("status") == "failed":
            raise HTTPException(status_code=500, detail=status_info.get("error", "Analysis failed"))
        raise HTTPException(
            status_code=404,
            detail=f"Report not ready. Current job status: {status_info.get('status', 'unknown')}"
        )
    return report
