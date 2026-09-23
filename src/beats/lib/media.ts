/** Same-origin path; Amplify (and the Vite dev/preview proxy) forwards it to collection.linturomusic.com/beats. */
export const BEATS_CDN = import.meta.env.VITE_BEATS_CDN || "/beats-cdn";

/** Map catalog paths (/mpc-library/…) onto the CDN and encode each segment. */
export function mediaUrl(path: string) {
  const rel = path.replace(/^\/mpc-library\//, "");
  return `${BEATS_CDN}/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

export function filename(path: string) {
  return path.split("/").pop() ?? "sample.wav";
}

export const SAMPLE_DRAG_MIME = "application/x-trapfog-sample";

export const ALLOW_DOWNLOAD = false;
