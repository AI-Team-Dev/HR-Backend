from fastapi import UploadFile, HTTPException

async def file_to_bytes(file: UploadFile) -> bytes:
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    return content
