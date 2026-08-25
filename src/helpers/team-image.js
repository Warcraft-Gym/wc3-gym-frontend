import teamDefaultImg from '@/assets/media/GNL_Team_Default.png';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

// The backend serves team icons as a public GET with Cache-Control and ETag
export function teamImageUrl(teamId) {
  return `${backendUrl}/teams/${teamId}/image`;
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
