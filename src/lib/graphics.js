import browser from 'webextension-polyfill';

/**
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/** @param {number} progress - normalized progress value */
export async function gen_progress_icon(progress) {
  const { progressColor, progressOutlineColor } = await browser.storage.local.get([
    'progressColor',
    'progressOutlineColor',
  ]);
  const ratio = clamp(progress * (2 * Math.PI), 0.4, 2 * Math.PI);
  const side = 128;
  const midpoint = side / 2;
  const canvas = new OffscreenCanvas(side, side);
  const ctx = canvas.getContext('2d');

  // progress
  ctx.lineWidth = 10;
  ctx.fillStyle = progressColor || '#ffaaff';
  ctx.beginPath();
  ctx.arc(midpoint, midpoint, midpoint, 1.5 * Math.PI, 1.5 * Math.PI + ratio);
  ctx.lineTo(midpoint, midpoint);
  ctx.fill();

  // outline
  ctx.lineWidth = 8;
  ctx.strokeStyle = progressOutlineColor || 'white';
  ctx.beginPath();
  ctx.arc(midpoint, midpoint, midpoint - ctx.lineWidth / 2, 1.5 * Math.PI, 3.5 * Math.PI);
  ctx.stroke();

  return ctx.getImageData(0, 0, side, side);
}

export function getDefaultIcon() {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABK0lEQVRYR+2XOw6CQBCGl2gCHY1AA16ChnvYGC9gT2WppQ0HsLQz8R4cRAIF4QBEF5wttIAhmQ2LSMIm0/2782Ve2dHYyEcb2T9DAfI8v9Z1vQNbUAFN07wYhrGn6j86FCDLsifnfCnzmG3bDIDPuq4fZO6hAEmS1DKPCK0AEEcWQjmALMQgADIQgwFQIQYFoEAoA7Asi2kaPlagME/QHUessJUBlGXJXNfthKiqCp0TygDSNGVFUYg2RDvYcRzm+37LnzIAytyACM0AE45AFEWUNH81YRi29HMN9IrAnAKpCuwQzynoFYG/TwE2eJrQ047Ar1PwAofkrYgIxyEFrWUH/ZDEcXzzPG+jEILDsnMPgmDbhO1aTtcgXIGpWl7FPy0He1ABiFHtL3sDWUi7Id1oe24AAAAASUVORK5CYII=';
}

export async function gen_checklist_icon() {
  const { progressColor } = await browser.storage.local.get(['progressColor']);

  const side = 128;
  const midpoint = side / 2;
  const thiccness = 20;
  const canvas = new OffscreenCanvas(side, side);
  const ctx = canvas.getContext('2d');

  ctx.lineWidth = 10;
  ctx.strokeStyle = progressColor || '#ffaaff';
  ctx.beginPath();
  ctx.arc(midpoint, midpoint, midpoint - ctx.lineWidth / 2, 1.5 * Math.PI, 3.5 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = progressColor || '#ffaaff';
  ctx.translate(side / 6 + 10, side / 2 - 5);
  ctx.rotate((1 / 4) * Math.PI);
  ctx.fillRect(0, 0, 50, thiccness);

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.translate(side / 4 + 10, side / 2 + 30 - 5);
  ctx.rotate((-1 / 4) * Math.PI);
  ctx.fillRect(0, 0, 80, thiccness);

  return ctx.getImageData(0, 0, side, side);
}

export function resetActionIcon() {
  if (!browser.downloads.setShelfEnabled) {
    // in firefox it'll just reset the icon
    browser.action.setIcon({});
  } else {
    browser.action.setIcon({ path: 'images/icon.png' });
  }
}
