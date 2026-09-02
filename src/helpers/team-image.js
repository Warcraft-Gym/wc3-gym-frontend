import teamDefaultImg from '@/assets/media/GNL_Team_Default.png';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

// A team object carries icon_url, which is the logo in the blob store: using it goes straight to
// the store. An id alone falls back to the backend, which answers a redirect to the same place.
export function teamImageUrl(team) {
  if (team && typeof team === 'object') {
    return team.icon_url ?? `${backendUrl}/teams/${team.id}/image`;
  }
  return `${backendUrl}/teams/${team}/image`;
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
