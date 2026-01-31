import { ChartRefMap } from '../types';
import { ChartImageMap } from './exportPdf';

/**
 * Capture chart images from Chart.js canvas elements.
 * Uses canvas.toDataURL() to get base64 PNG data for each chart.
 * Missing or unavailable charts are silently skipped.
 */
export function captureChartImages(chartRefs: ChartRefMap): ChartImageMap {
  const images: ChartImageMap = {};

  for (const [key, canvas] of Object.entries(chartRefs)) {
    if (!canvas) continue;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl && dataUrl !== 'data:,') {
        images[key] = dataUrl;
      }
    } catch {
      // Canvas may be tainted or unavailable — skip silently
    }
  }

  return images;
}
