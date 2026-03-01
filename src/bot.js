const puppeteer = require('puppeteer');
const { ethers } = require('ethers');

const GAME_URL = 'https://play.fun/game/f973fbb5-80b3-4ea6-a177-878eea9dbcfd?ref=2hGdPmtWq2xEexCNJgr3oR4zM9i7y6b7cs5fU9aur1N2';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const REFRESH_EVERY_MS = 30 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;

let browser, page;
let startTime = Date.now();
let sessionCount = 0;

function elapsed() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function log(msg) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log('[' + now + '] ' + msg);
}

function launchBrowser() {
  log('Launching browser...');
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-background-timer-throttling',
    ],
  }).then(function(b) {
    browser = b;
    log('Browser ready');
  });
}

function openGame() {
  sessionCount++;
  log('Opening game session #' + sessionCount);

  if (page && !page.isClosed()) {
    page.close().catch(function() {});
  }

  return browser.newPage().then(function(p) {
    page = p;
    return page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
  }).then(function() {
    return page.setViewport({ width: 390, height: 844, isMobile: true });
  }).then(function() {
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const address = wallet.address;
    log('Using wallet: ' + address);
    return page.evaluateOnNewDocument(function(walletAddress) {
      window.ethereum = {
        isMetaMask: true,
        selectedAddress: walletAddress,
        chainId: '0x1',
        networkVersion: '1',
        isConnected: function() { return true; },
        request: function(obj) {
          const method = obj.method;
          const params = obj.params;
          if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
            return Promise.resolve([walletAddress]);
          }
          if (method === 'personal_sign' || method === 'eth_sign') {
            return window._signMessage(params[0]);
          }
          if (method === 'eth_chainId') return Promise.resolve('0x1');
          if (method === 'net_version') return Promise.resolve('1');
          return Promise.resolve(null);
        },
        on: function() {},
        removeListener: function() {},
      };
      window.dispatchEvent(new Event('ethereum#initialized'));
    }, address);
  }).then(function() {
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    return page.exposeFunction('_signMessage', function(message) {
      let msg = message;
      if (typeof message === 'string' && message.startsWith('0x')) {
        msg = ethers.utils.arrayify(message);
      }
      return wallet.signMessage(msg).then(function(sig) {
        log('Message signed');
        return sig;
      }).catch(function(err) {
        log('Sign error: ' + err.message);
        return null;
      });
    });
  }).then(function() {
    return page.setRequestInterception(true);
  }).then(function() {
    page.on('request', function(req) {
      const type = req.resourceType();
      if (type === 'image' || type === 'font' || type === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });
    return page.goto(GAME_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  }).then(function() {
    log('Game page loaded');
    return new Promise(function(r) { setTimeout(r, 4000); });
  }).then(function() {
    return tryLogin();
  }).then(function() {
    startActivitySimulator();
  }).catch(function(err) {
    log('openGame error: ' + err.message);
  });
}

function tryLogin() {
  log('Trying wallet login...');
  return page.evaluate(function() {
    var keywords = ['connect', 'wallet', 'login', 'sign in', 'metamask', 'enter', 'start'];
    var els = document.querySelectorAll('button, [role="button"], a');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var text = (el.innerText || '').toLowerCase();
      if (el.offsetParent !== null && keywords.some(function(k) { return text.includes(k); })) {
        el.click();
        return text;
      }
    }
    return 'no button found';
  }).then(function(result) {
    log('Login click: ' + result);
    return new Promise(function(r) { setTimeout(r, 3000); });
  }).catch(function(err) {
    log('Login error: ' + err.message);
  });
}

var activityTimer = null;
function startActivitySimulator() {
  if (activityTimer) clearInterval(activityTimer);
  activityTimer = setInterval(function() {
    if (!page || page.isClosed()) return;
    page.mouse.move(190 + Math.random() * 10, 400 + Math.random() * 10).catch(function() {});
  }, 10000);
}

function restart() {
  log('Restarting...');
  if (browser && browser.isConnected()) {
    browser.close().catch(function() {});
  }
  return new Promise(function(r) { setTimeout(r, 5000); }).then(function() {
    return launchBrowser();
  }).then(function() {
    return openGame();
  });
}

function main() {
  log('=== Capybara Bot Starting (Wallet Mode) ===');
  if (!PRIVATE_KEY) {
    log('ERROR: PRIVATE_KEY not set!');
    process.exit(1);
  }
  launchBrowser().then(function() {
    return openGame();
  }).then(function() {
    setInterval(function() {
      log('Refreshing page (uptime: ' + elapsed() + ')...');
      page.reload({ waitUntil: 'networkidle2', timeout: 60000 }).then(function() {
        return new Promise(function(r) { setTimeout(r, 4000); });
      }).then(function() {
        return tryLogin();
      }).then(function() {
        log('Refresh done');
      }).catch(function(err) {
        log('Refresh failed: ' + err.message);
        restart().catch(function() {});
      });
    }, REFRESH_EVERY_MS);

    setInterval(function() {
      log('Still running - uptime: ' + elapsed() + ' | sessions: ' + sessionCount);
    }, HEARTBEAT_MS);

    log('Bot is running and earning points!');
  }).catch(function(err) {
    log('Startup error: ' + err.message);
    setTimeout(function() { main(); }, 10000);
  });

  process.on('uncaughtException', function(err) {
    log('Crash: ' + err.message);
    setTimeout(function() { restart().catch(function() {}); }, 5000);
  });
}

main();
