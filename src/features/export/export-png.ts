/**
 * Export the WaferMap canvas as a PNG image.
 */
export function exportWaferMapAsPng(canvas: HTMLCanvasElement, fileName: string) {
  // Create temp canvas with white background
  const temp = document.createElement('canvas');
  temp.width = canvas.width;
  temp.height = canvas.height;
  const ctx = temp.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, temp.width, temp.height);
  ctx.drawImage(canvas, 0, 0);

  temp.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.\w+$/, '') + '_wafermap.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
