export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const MAX_PDF_PAGES = 5;

export class ImportFileError extends Error {}

export function validateFiles(files: File[]): void {
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ImportFileError(`"${file.name}" is larger than 10MB.`);
    }
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      throw new ImportFileError(`"${file.name}" isn't a JPG, PNG, or PDF.`);
    }
  }
}

function stripDataUriPrefix(dataUri: string): string {
  const commaIndex = dataUri.indexOf(",");
  return commaIndex === -1 ? dataUri : dataUri.slice(commaIndex + 1);
}

function canvasToBase64Jpeg(canvas: HTMLCanvasElement): string {
  return stripDataUriPrefix(canvas.toDataURL("image/jpeg", 0.9));
}

export async function fileToBase64Jpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImportFileError("Couldn't process the selected image.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvasToBase64Jpeg(canvas);
}

export async function pdfToBase64JpegPages(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);

  const images: string[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImportFileError("Couldn't process the selected PDF.");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    images.push(canvasToBase64Jpeg(canvas));
  }

  return images;
}

export async function filesToBase64Images(files: File[]): Promise<string[]> {
  validateFiles(files);

  const images: string[] = [];
  for (const file of files) {
    if (file.type === "application/pdf") {
      images.push(...(await pdfToBase64JpegPages(file)));
    } else {
      images.push(await fileToBase64Jpeg(file));
    }
  }
  return images;
}
