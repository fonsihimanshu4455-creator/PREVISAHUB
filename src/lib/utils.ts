// Shared helpers for theme colours and image uploads.

// "#E97A2E" -> "233 122 46" (the format our CSS variables expect)
export function hexToRgbTriplet(hex: string): string {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  if (Number.isNaN(num) || h.length !== 6) return "0 0 0";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r} ${g} ${b}`;
}

// Read an uploaded image file and return it as a base64 data URL.
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
