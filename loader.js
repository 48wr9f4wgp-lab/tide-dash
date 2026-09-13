// TIDE DASH Loader v1.0
// Scriptable側にはこのローダーだけ残す。
// 本体はGitHubの main.js を毎回確認し、取得失敗時は前回成功版へフォールバックする。

const LOADER = {
  remoteURL: "https://raw.githubusercontent.com/48wr9f4wgp-lab/tide-dash/main/main.js",
  cacheFile: "TIDE_DASH_REMOTE_MAIN.js",
  metaFile: "TIDE_DASH_REMOTE_META.json",
  requestTimeoutSec: 12,
  checkIntervalMinutes: 0,
};

const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), LOADER.cacheFile);
const metaPath = fm.joinPath(fm.documentsDirectory(), LOADER.metaFile);

function readMeta() {
  try {
    if (!fm.fileExists(metaPath)) return {};
    return JSON.parse(fm.readString(metaPath));
  } catch (_) {
    return {};
  }
}

function writeMeta(meta) {
  try {
    fm.writeString(metaPath, JSON.stringify(meta));
  } catch (_) {}
}

function validRemoteCode(code) {
  return (
    typeof code === "string" &&
    code.length > 500 &&
    code.includes("TIDE DASH") &&
    code.includes("Script.complete")
  );
}

async function fetchLatest() {
  const req = new Request(
    LOADER.remoteURL +
    (LOADER.remoteURL.includes("?") ? "&" : "?") +
    "t=" + Date.now()
  );
  req.timeoutInterval = LOADER.requestTimeoutSec;
  req.headers = { "Cache-Control": "no-cache" };

  const code = await req.loadString();

  if (!validRemoteCode(code)) {
    throw new Error("取得した本体コードの検証に失敗");
  }

  fm.writeString(cachePath, code);
  writeMeta({
    updatedAt: new Date().toISOString(),
    source: LOADER.remoteURL
  });

  return code;
}

async function loadCode() {
  const meta = readMeta();
  const last = meta.updatedAt ? new Date(meta.updatedAt).getTime() : 0;
  const intervalMs = LOADER.checkIntervalMinutes * 60 * 1000;
  const shouldCheck =
    LOADER.checkIntervalMinutes === 0 ||
    !last ||
    Date.now() - last >= intervalMs;

  if (shouldCheck) {
    try {
      return await fetchLatest();
    } catch (e) {
      if (fm.fileExists(cachePath)) {
        return fm.readString(cachePath);
      }
      throw new Error("TIDE DASH本体を取得できません: " + e);
    }
  }

  if (fm.fileExists(cachePath)) {
    return fm.readString(cachePath);
  }

  return await fetchLatest();
}

async function runRemote(code) {
  const AsyncFunction =
    Object.getPrototypeOf(async function () {}).constructor;

  const execute = new AsyncFunction(code);
  await execute();
}

try {
  const code = await loadCode();
  await runRemote(code);
} catch (e) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#061824");
  w.setPadding(14, 14, 14, 14);

  const title = w.addText("TIDE DASH");
  title.font = Font.boldSystemFont(18);
  title.textColor = Color.white();

  w.addSpacer(8);

  const msg = w.addText("自動更新に失敗");
  msg.font = Font.boldSystemFont(13);
  msg.textColor = new Color("#FFBD55");

  w.addSpacer(4);

  const detail = w.addText(String(e));
  detail.font = Font.systemFont(9);
  detail.textColor = new Color("#9AB5C7");
  detail.lineLimit = 4;

  if (config.runsInWidget) {
    Script.setWidget(w);
  } else {
    await w.presentMedium();
  }

  Script.complete();
}
