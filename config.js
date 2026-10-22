/* JHIOS // INFINITE EXCHANGE — site config. One place to change deploy settings. */
window.JHIOS_CONFIG = {
  /* Base URL prepended to every track's audio_url in tracks.json.
     Currently no self-hosted files: playback uses YouTube until a track has audio_url.
     Cloudflare R2 later: e.g. "https://audio.infiniteexchange.online/" — one-line switch. */
  AUDIO_BASE: "/audio/",
  TRACKS_URL: "/tracks.json",
  /* Netlify Function (netlify/functions/listeners.mjs). Falls back to labelled demo data if unavailable. */
  LISTENERS_URL: "/listeners.json",
  LISTEN_PING_URL: "/api/listen",
  /* A play is only counted after this many seconds of actual playback. */
  COUNT_AFTER_S: 30,
  LANES: ["SCR3WFAC3", "Luce Aether", "JHIOS Soundtracks", "Sanctum", "Unsorted"],
  COMMISSION_FORM: "https://tally.so/r/Y5bYgv",
  /* Tip link (welcome screen + player queue menu). Swap here for a JHIOS Ko-fi later. */
  KOFI_URL: "https://ko-fi.com/greatyarmouthperjurygyp",
  KOFI_LABEL: "Support Great Yarmouth Perjury (GYP) on Ko-fi"
};
