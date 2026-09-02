import teamDefaultImg from '@/assets/media/GNL_Team_Default.png';

// One PNG per team id in public/team-logos; a team without a file falls back through the img @error
export function teamImageUrl(teamId) {
  return `${import.meta.env.BASE_URL}team-logos/${teamId}.png`;
}

const MAX_ICON_PX = 150;  // the largest avatar draws a team icon at 80 px

export async function shrinkTeamImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = MAX_ICON_PX / Math.max(bitmap.width, bitmap.height);
  if (scale >= 1) return file;

  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale),
  );
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/png' });
}

export function hideMissingImage(event) {
  event.target.style.display = 'none';
}

export function showDefaultTeamImage(event) {
  const img = event.target;
  if (img.dataset.teamDefault) return;  // the bundled default must not retrigger this
  img.dataset.teamDefault = '1';
  img.src = teamDefaultImg;
}
