import { Browser, BrowserContext } from 'playwright';

declare global {
    interface Window {
        chrome: { runtime?: { id?: string } };
    }
}

/**
 * Stealthify a Playwright browser context to bypass bot detection without plugins.
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
        isMobile: false,
        deviceScaleFactor: 2,
        hasTouch: false,
    };

    const config = { ...defaultOptions, ...options };

    const tempContext = await browser.newContext();
    const defaultUserAgent = await getUserAgent(tempContext);
    await tempContext.close();

    const userAgent = config.userAgent || defaultUserAgent.replace("HeadlessChrome", "Chrome");

    const context = await browser.newContext({
        viewport: config.viewport,
        userAgent: userAgent,
        isMobile: config.isMobile,
        deviceScaleFactor: config.deviceScaleFactor,
        hasTouch: config.hasTouch,
    });

    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4],
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });

        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) return 'NVIDIA Corporation'; // Vendor
            if (parameter === 37446) return 'NVIDIA GeForce GTX 1050'; // Renderer
            return getParameter.call(this, parameter);
        };

        window.chrome = { runtime: {} };

        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = (parameters) => {
            if (parameters.name === 'notifications') {
                return Promise.resolve({
                    state: Notification.permission,
                    name: 'notifications',
                    onchange: null,
                    addEventListener: () => {},
                    removeEventListener: () => {},
                    dispatchEvent: () => false,
                } as PermissionStatus);
            }
            return originalQuery(parameters);
        };

        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8,
        });

        Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32',
        });
    });

    return context;
}

/**
 * Fetch a realistic User-Agent from the browser.
 * @param context - The browser context.
 * @returns A user-agent string with 'HeadlessChrome' removed.
 */
async function getUserAgent(context: BrowserContext): Promise<string> {
    const page = await context.newPage();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    await page.close();
    return userAgent.replace("HeadlessChrome", "Chrome");
}