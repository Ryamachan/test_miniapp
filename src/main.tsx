import liff from "@line/liff";

const LIFF_ID: string = import.meta.env.VITE_LIFF_ID;

function mustGet<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el as T;
}

function setText(selector: string, text: string) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

async function main(): Promise<void> {
  const userIdEl = mustGet<HTMLSpanElement>("#userId");
  const posEl = mustGet<HTMLSpanElement>("#pos");
  const videoEl = mustGet<HTMLVideoElement>("#video");

  // --- LIFF init ---
  await liff.init({ liffId: LIFF_ID });

  // デバッグ表示（まずここで「LINE内か」「ログイン済みか」を確定）
  setText("#dbg_inClient", String(liff.isInClient()));
  setText("#dbg_loggedIn", String(liff.isLoggedIn()));

  if (!liff.isLoggedIn()) {
    // LINE外で開いてる/初回など。まずログインさせる
    liff.login();
    return;
  }

  // --- userId取得（2経路で試す）---
  const idToken = liff.getDecodedIDToken(); // openid scope必須
  const userIdFromToken = idToken?.sub;

  let userIdFromProfile: string | undefined;
  try {
    const profile = await liff.getProfile(); // profile scope推奨
    userIdFromProfile = profile.userId;
  } catch (e) {
    // getProfileが失敗するケースもあるので握りつぶさず表示
    setText("#dbg_profileErr", e instanceof Error ? e.message : String(e));
  }

  setText("#dbg_tokenSub", userIdFromToken ?? "null");
  setText("#dbg_profileUserId", userIdFromProfile ?? "null");

  // 最終的に表示する userId
  userIdEl.textContent = userIdFromToken ?? userIdFromProfile ?? "取得できません";

  // --- 動画イベントのデバッグ ---
  const KEY = "video_progress_seconds";

  videoEl.addEventListener("loadedmetadata", () => {
    setText("#dbg_loadedmetadata", "fired");
    const saved = Number(localStorage.getItem(KEY) || "0");
    if (!Number.isNaN(saved) && saved > 0 && saved < videoEl.duration) {
      videoEl.currentTime = saved;
    }
  });

  videoEl.addEventListener("timeupdate", () => {
    const sec = Math.floor(videoEl.currentTime);
    posEl.textContent = String(sec);
    localStorage.setItem(KEY, String(sec));
    setText("#dbg_timeupdate", "fired");
  });

  videoEl.addEventListener("error", () => {
    setText("#dbg_videoErr", "video error fired (URL/CORS/format?)");
  });

  videoEl.addEventListener("playing", () => setText("#dbg_playing", "playing"));
  videoEl.addEventListener("pause", () => setText("#dbg_playing", "paused"));
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  setText("#userId", `初期化エラー: ${msg}`);
  console.error(err);
});