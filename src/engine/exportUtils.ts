import { StudioParams } from '../types/studio';
import { buildSvgMarkup, GeometryFrame } from './bubbleEngine';

export function downloadSvgFile(
  frame: GeometryFrame,
  params: StudioParams,
  includeTexture = false
): void {
  const svgString = buildSvgMarkup(frame, params, { includeTexture });
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `serigraph-asset-${params.seed}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copySvgToClipboard(
  frame: GeometryFrame,
  params: StudioParams
): Promise<boolean> {
  const svgString = buildSvgMarkup(frame, params, { includeTexture: false });
  try {
    await navigator.clipboard.writeText(svgString);
    return true;
  } catch {
    return false;
  }
}

export async function downloadPngFile(
  frame: GeometryFrame,
  params: StudioParams,
  scale = 2
): Promise<void> {
  const { width, height } = frame;
  const exportW = Math.round(width * scale);
  const exportH = Math.round(height * scale);

  // Build crisp vector SVG without heavy SVG filters first, then composite tactile grain natively on Canvas
  const svgMarkup = buildSvgMarkup(frame, params, { includeTexture: false });
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Optional ultra-subtle ink edge soften when inkBleed > 0.2
    if (params.inkBleed > 0.25) {
      ctx.save();
      ctx.filter = `blur(${(params.inkBleed * 0.45 * scale).toFixed(2)}px)`;
      ctx.drawImage(img, 0, 0, exportW, exportH);
      ctx.restore();
    }
    ctx.drawImage(img, 0, 0, exportW, exportH);

    // Composite authentic serigraphy matte paper grain directly onto pixels
    if (params.grainIntensity > 0.02) {
      const noiseCanvas = document.createElement('canvas');
      noiseCanvas.width = 256;
      noiseCanvas.height = 256;
      const nCtx = noiseCanvas.getContext('2d');
      if (nCtx) {
        const imgData = nCtx.createImageData(256, 256);
        const data = imgData.data;
        const alpha = Math.round(params.grainIntensity * 34);
        // Deterministic fast PRNG for consistent export grain
        let s = params.seed || 1337;
        for (let i = 0; i < data.length; i += 4) {
          s = (s * 1664525 + 1013904223) >>> 0;
          const v = (s >>> 24) & 0xff;
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = alpha;
        }
        nCtx.putImageData(imgData, 0, 0);

        const pattern = ctx.createPattern(noiseCanvas, 'repeat');
        if (pattern) {
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, exportW, exportH);
          ctx.restore();
        }
      }
    }

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `serigraph-asset-${params.seed}-${exportW}x${exportH}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
