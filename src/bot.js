const puppeteer = require('puppeteer');

const GAME_URL = 'https://play.fun/game/f973fbb5-80b3-4ea6-a177-878eea9dbcfd?ref=2hGdPmtWq2xEexCNJgr3oR4zM9i7y6b7cs5fU9aur1N2';
const REFRESH_EVERY_MS  = 30 * 60 * 1000;
const HEARTBEAT_MS      = 60 * 1000;

let browser, page;
let startTime = Date.now();
let sessionCount = 0;

function elapsed() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function log(msg) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${now}] ${msg}`);
}

async function launchBrowser() {
  log('Launching headless browser...');
  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });
  log('Browser ready');
}

async function openGame() {
  sessionCount++;
  log(`Opening game (session #${sessionCount})...`);

  if (page && !page.isClosed()) {
    try { await page.close(); } catch (_) {}
  }

  page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  );
  await page.setViewport({ width: 390, height: 844, isMobile: true });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['image', 'font', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.goto(GAME_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    log('Game page loaded');
  } catch (err) {
    log(`Page load warning: ${err.message}`);
  }

  startActivitySimulator();
}

let activityTimer = null;
function startActivitySimulator() {
  if (activityTimer) clearInterval(activityTimer);
  activityTimer = setInterval(async () => {
    if (!page || page.isClosed()) return;
    try {
      await page.mouse.move(
        190 + Math.random() * 10,
        400 + Math.random() * 10
      );
      await page.evaluate(() => { void document.title; });
    } catch (_) {}
  }, 10000);
}

async function restart() {
  log('Restarting session...');
  try {
    if (browser && browser.isConnected()) await browser.close();
  } catch (_) {}
  await new Promise(r => setTimeout(r, 5000));
  await launchBrowser();
  await openGame();
}

async function main() {
  log('Capybara Bot Starting...');

  await launchBrowser();
  await openGame();

  setInterval(async () => {
    log(`Refreshing page (uptime: ${elapsed()})...`);
    try {
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
      log('Refresh complete');
    } catch (err) {
      log(`Refresh failed, restarting: ${err.message}`);
      await restart();
    }
  }, REFRESH_EVERY_MS);

  setInterval(() => {
    log(`Still running - uptime: ${elapsed()} | sessions: ${sessionCount}`);
  }, HEARTBEAT_MS);

  process.on('uncaughtException', async (err) => {
    log(`Error: ${err.message} - recovering...`);
    try { await restart(); } catch (_) {}
  });

  process.on('unhandledRejection', async (reason) => {
    log(`Rejection: ${reason} - recovering...`);
    try { await restart(); } catch (_) {}
  });

  log('Bot is running. Game is open and earning points!');
}

main();
