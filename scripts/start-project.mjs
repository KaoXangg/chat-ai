import { spawn, execFile } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import dotenv from "../backend/node_modules/dotenv/lib/main.js";

const root = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(root, "backend", ".env"), quiet: true });

// Start Node directly so there are no extra cmd/npm windows or wrapper processes.
export function runProject({ backendPort = Number(process.env.PORT || 5000), frontendPort = 5173, openBrowser = true } = {}) {
  const children = [];
  const controller = new AbortController();
  let stopping = false;
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });

  const stopChild = child => new Promise(resolve => {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) return resolve();
    if (process.platform === "win32") {
      execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, timeout: 5000 }, () => resolve());
    } else {
      child.kill("SIGTERM");
      const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000);
      child.once("close", () => { clearTimeout(timer); resolve(); });
    }
  });

  const shutdown = async code => {
    if (stopping) return;
    stopping = true;
    controller.abort();
    console.log("\n[STOP] Stopping backend and frontend...");
    await Promise.all(children.map(stopChild));
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onInterrupt);
    resolveDone(code);
  };
  const onInterrupt = () => { void shutdown(0); };
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onInterrupt);

  const start = (name, cwd, args) => {
    const child = spawn(process.execPath, args, {
      cwd: path.join(root, cwd),
      env: { ...process.env, PORT: String(backendPort) },
      stdio: ["ignore", "inherit", "inherit"],
      windowsHide: true,
    });
    children.push(child);
    child.once("error", error => {
      if (stopping) return;
      console.error(`[ERROR] Cannot start ${name}: ${error.message}`);
      void shutdown(1);
    });
    child.once("exit", (code, signal) => {
      if (stopping) return;
      console.error(`[ERROR] ${name} stopped unexpectedly (${signal || code}).`);
      void shutdown(1);
    });
  };

  console.log("[START] Backend and frontend share this terminal. Press Ctrl+C to stop both.");
  start("Backend", "backend", ["server.js"]);
  start("Frontend", "frontend", ["node_modules/vite/bin/vite.js", "--host", "localhost", "--port", String(frontendPort), "--strictPort", "--clearScreen", "false"]);

  void (async () => {
    const web = `http://localhost:${frontendPort}`;
    const deadline = Date.now() + 90000;
    console.log("[WAIT] Waiting up to 90 seconds for both servers...");
    while (!stopping && Date.now() < deadline) {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(1500)]);
        const [api, frontend] = await Promise.all([
          fetch(`http://localhost:${backendPort}/api/health`, { signal }),
          fetch(web, { signal }),
        ]);
        const body = await api.json();
        if (stopping) return;
        if (api.ok && body.success && body.data?.status === "ok" && frontend.ok) {
          console.log(`[READY] ${web}`);
          if (openBrowser) {
            const browser = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/c", "start", "", web], { stdio: "ignore", windowsHide: true });
            browser.once("error", () => console.error(`[INFO] Open ${web} in your browser.`));
            browser.unref();
          }
          return;
        }
      } catch { /* Keep waiting while the servers start. */ }
      try { await delay(500, undefined, { signal: controller.signal }); } catch { return; }
    }
    if (!stopping) {
      console.error("[ERROR] Startup timed out. Check the messages above, SQL Server and .env settings.");
      await shutdown(1);
    }
  })().catch(error => {
    if (!stopping) { console.error(`[ERROR] ${error.message}`); void shutdown(1); }
  });

  return done;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await runProject();
}
