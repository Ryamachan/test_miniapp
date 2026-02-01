import liff from "@line/liff";

const LIFF_ID: string | undefined = import.meta.env.VITE_LIFF_ID;

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
  // DOM
  const userIdEl = mustGet<HTMLSpanElement>("#userId");
  const posEl = mustGet<HTMLSpanElement>("#pos");
  const videoEl = mustGet<HTMLVideoElement>("#video");

  // まずここが出れば「JSは動いてる」
  setText("#dbg_inClient", "booting...");

  // envチェック
  if (!LIFF_ID) {
    userIdEl.textContent = "VITE_LIFF_ID が未設定です（Vercelの環境変数を確認）";
    setText("#dbg_inClient", "env missing");
    return;
  }

  // --- LIFF init ---
  await liff.init({ liffId: LIFF_ID });

  setText("#dbg_inClient", String(liff.isInClient()));
  setText("#dbg_loggedIn", String(liff.isLoggedIn()));

  // 未ログインならログインへ
  if (!liff.isLoggedIn()) {
    userIdEl.textContent = "loginへリダイレクト中...";
    liff.login();
    return;
  }

  // --- userId取得（2経路）---
  const idToken = liff.getDecodedIDToken(); // openid scopeが必要
  const userIdFromToken = idToken?.sub;

  let userIdFromProfile: string | undefined;
  try {
    const profile = await liff.getProfile(); // profile scope推奨
    userIdFromProfile = profile.userId;
  } catch (e) {
    setText("#dbg_profileErr", e instanceof Error ? e.message : String(e));
  }

  setText("#dbg_tokenSub", userIdFromToken ?? "null");
  setText("#dbg_profileUserId", userIdFromProfile ?? "null");

  userIdEl.textContent = userIdFromToken ?? userIdFromProfile ?? "取得できません";

  // --- 動画イベント ---
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
