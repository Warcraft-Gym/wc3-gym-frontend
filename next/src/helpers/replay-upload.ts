import { backendUrl, fetchWrapper } from "@/helpers";

// The first bytes of every Warcraft III replay, which the browser checks before it uploads
export const REPLAY_MAGIC = "Warcraft III recorded game";

/** The file goes from the browser straight to the bucket, at a link the backend signs per game. */
export async function uploadReplay(seriesId: number, game: number, file: File) {
  const head = new TextDecoder().decode(await file.slice(0, REPLAY_MAGIC.length).arrayBuffer());
  if (head !== REPLAY_MAGIC) throw new Error(`Game ${game} is not a Warcraft III replay`);
  const { url } = await fetchWrapper.post(`${backendUrl}/player-series/${seriesId}/replays/${game}/upload-url`);
  const put = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="game${game}.w3g"` },
  });
  if (!put.ok) throw new Error(`Game ${game} replay upload failed`);
}
