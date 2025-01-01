import { Browser, BrowserContext } from 'playwright';

/**
 * Stealthify a Playwright browser context to simulate a real user with minimal overrides.
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

    // Fetch the User-Agent dynamically if not provided
    const tempContext = await browser.newContext();
    const defaultUserAgent = await getUserAgent(tempContext);
    await tempContext.close();

    const context = await browser.newContext({
        viewport: config.viewport,
        userAgent: config.userAgent || defaultUserAgent,
        isMobile: config.isMobile,
        deviceScaleFactor: config.deviceScaleFactor,
        hasTouch: config.hasTouch,
    });

    // Remove navigator.webdriver if it exists
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });

    // Ensure navigator.plugins is non-empty if needed
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'plugins', {
            get: () => Array(3).fill({}),
        });
    });

    // Set realistic navigator.languages if needed
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'languages', {
            get: () => navigator.languages || ['en-US', 'en'],
        });
    });

    // Adjust WebGL rendering only if necessary
    await context.addInitScript(() => {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            // Return unmodified values unless overriding is required
            if ((parameter === 3744) && !getParameter(37445)) {
                return 'GPU Vendor';
            }
            if ((parameter === 37446) && !getParameter(37446)) {
                return 'GPU Renderer';
            }
            return getParameter.call(this, parameter);
        };
    });

    return context;
}

/**
 * Fetch the browser's default User-Agent from a temporary page.
 * @param context - The browser context.
 * @returns The default User-Agent string.
 */
async function getUserAgent(context: BrowserContext): Promise<string> {
    const page = await context.newPage();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    await page.close();
    return userAgent.replace('HeadlessChrome', 'Chrome');
}