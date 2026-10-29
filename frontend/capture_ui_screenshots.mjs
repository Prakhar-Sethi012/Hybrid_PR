import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ASSETS_DIR = path.resolve(__dirname, '..', 'project_assets');

async function captureScreenshots() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  });

  try {
    const page = await browser.newPage();
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for header and main app to load
    await page.waitForSelector('header', { timeout: 10000 });
    console.log('App loaded successfully.');

    // Give time for simulation API to complete initial run
    await new Promise((r) => setTimeout(r, 2000));

    // ----------------------------------------------------
    // STATE 1: Execution Studio (Page Fault + Ghost Victims)
    // ----------------------------------------------------
    console.log('Navigating to Page Fault / Eviction step in Execution Studio...');
    const buttons = await page.$$('button');
    let nextEvictionBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes('Next Eviction')) {
        nextEvictionBtn = btn;
        break;
      }
    }

    if (nextEvictionBtn) {
      // Click Next Eviction twice to get a rich mid-simulation eviction state
      await nextEvictionBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      await nextEvictionBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      console.log('Jumped to an Eviction step with Ghost Victims.');
    } else {
      console.log('Next Eviction button not found, scrubbing slider forward...');
      await page.evaluate(() => {
        const slider = document.querySelector('input[type="range"]');
        if (slider) {
          slider.value = '15';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await new Promise((r) => setTimeout(r, 600));
    }

    const studioPath = path.join(ASSETS_DIR, 'execution_studio_page_fault.png');
    await page.screenshot({ path: studioPath, fullPage: false });
    console.log(`Saved: ${studioPath}`);

    // ----------------------------------------------------
    // STATE 2: Divergence Matrix (Tab 2)
    // ----------------------------------------------------
    console.log('Switching to Divergence Matrix tab...');
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('header nav button'));
      const compareBtn = navButtons.find((b) => b.innerText.includes('Divergence Matrix'));
      if (compareBtn) compareBtn.click();
    });

    // Wait for comparison data & rendering
    await new Promise((r) => setTimeout(r, 2500));

    // Scrub compare slider forward to show divergence
    await page.evaluate(() => {
      const slider = document.querySelector('input[type="range"]');
      if (slider) {
        slider.value = '25';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    const divergencePath = path.join(ASSETS_DIR, 'divergence_matrix_4way.png');
    await page.screenshot({ path: divergencePath, fullPage: false });
    console.log(`Saved: ${divergencePath}`);

    // ----------------------------------------------------
    // STATE 3: Benchmark Analytics (Tab 3)
    // ----------------------------------------------------
    console.log('Switching to Benchmark Analytics tab...');
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('header nav button'));
      const benchBtn = navButtons.find((b) => b.innerText.includes('Benchmark Analytics'));
      if (benchBtn) benchBtn.click();
    });

    // Wait for the benchmark matrix API fetch and Recharts animation
    await new Promise((r) => setTimeout(r, 3000));

    // Ensure the SVG chart has loaded
    await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    const benchmarkPath = path.join(ASSETS_DIR, 'benchmark_analytics_dashboard.png');
    await page.screenshot({ path: benchmarkPath, fullPage: false });
    console.log(`Saved: ${benchmarkPath}`);

    console.log('All UI screenshots successfully captured!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch((err) => {
  console.error(err);
  process.exit(1);
});
