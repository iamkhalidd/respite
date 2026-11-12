/**
 * Phone photos run 3 to 12 MB. Before uploading, scale them to at most 2000px on the long side
 * and save as WebP: they stay sharp on the site, load fast, and stay under the host's request limit.
 * If the browser can't do it, the original goes up and the server says if it's too big.
 */
export async function shrinkPhoto(file: File, max = 2000, quality = 0.85): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) {
      bmp.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.\w+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

/** Shrinks and sends photos one by one; returns how many made it and the first error. */
export async function sendPhotos(files: File[], send: (form: FormData) => Promise<{ error?: string } | null>, onStep?: (n: number) => void) {
  let added = 0;
  let error: string | undefined;
  for (const [i, f] of files.entries()) {
    onStep?.(i + 1);
    const form = new FormData();
    form.set("photo", await shrinkPhoto(f));
    const r = await send(form);
    if (r?.error) error ??= r.error;
    else added++;
  }
  return { added, error };
}
