import puppeteer, { Browser } from "puppeteer";

let globalBrowserPromise: Promise<Browser> | null = null;

export async function getSharedBrowser(): Promise<Browser> {
  if (!globalBrowserPromise) {
    globalBrowserPromise = puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    }).catch((err) => {
      globalBrowserPromise = null;
      throw err;
    });
  }
  return globalBrowserPromise;
}

// Graceful cleanup on process exit
if (typeof process !== "undefined") {
  process.on("exit", async () => {
    if (globalBrowserPromise) {
      const browser = await globalBrowserPromise;
      await browser.close().catch(() => {});
    }
  });
}
