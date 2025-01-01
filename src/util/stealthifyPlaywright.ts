import { Browser, BrowserContext, Page } from 'playwright';

/**
 * Stealthify a Playwright browser context to simulate a real user.
 * @param browser - The Playwright browser instance.
 * @param options - Optional configuration for viewport, userAgent, etc.
 * @returns A new stealth-enabled browser context.
 */
export async function stealthifyPlaywright(
    browser: Browser,
    options?: {
        viewport?: { width: number; height: number };
        userAgent?: string;
        isMobile?: boolean;
        deviceScaleFactor?: number;
        hasTouch?: boolean;
    }
): Promise<BrowserContext> {
    const defaultOptions = {
        viewport: { width: 1280, height: 720 },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
        isMobile: false,
        deviceScaleFactor: 1,
        hasTouch: false,
    };

    const config = { ...defaultOptions, ...options };

    const context = await browser.newContext({
        viewport: config.viewport,
        userAgent: config.userAgent,
        isMobile: config.isMobile,
        deviceScaleFactor: config.deviceScaleFactor,
        hasTouch: config.hasTouch,
    });

    // Remove navigator.webdriver
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Fake navigator.plugins
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3], // Fake plugin array
        });
    });

    // Fake navigator.languages
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'], // Example: English (US)
        });
    });

    // Fake WebGL vendor/renderer
    await context.addInitScript(() => {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter(parameter);
        };
    });

    return context;
}