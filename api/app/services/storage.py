import httpx

from ..config import get_settings


def save_photo(name: str, data: bytes, content_type: str) -> str:
    """Saves a room photo and returns the URL to store on the room.

    With BLOB_READ_WRITE_TOKEN set, photos go to Vercel Blob and survive deploys.
    Without it they go to UPLOAD_DIR (by default the website's public/uploads folder).
    """
    s = get_settings()
    if s.blob_read_write_token:
        token = s.blob_read_write_token
        store_id = token.split("_")[3] if token.count("_") >= 3 else ""
        r = httpx.put(
            "https://vercel.com/api/blob/",
            params={"pathname": f"rooms/{name}"},
            content=data,
            headers={
                "authorization": f"Bearer {token}",
                "x-api-version": "13",
                "x-vercel-blob-store-id": store_id,
                "x-vercel-blob-access": "public",
                "x-content-type": content_type,
                "x-add-random-suffix": "0",
            },
            timeout=60,
        )
        r.raise_for_status()
        return r.json()["url"]
    s.upload_dir.mkdir(parents=True, exist_ok=True)
    (s.upload_dir / name).write_bytes(data)
    return f"{s.upload_url_prefix.rstrip('/')}/{name}"
