/**
 * Expose a function to the page if it does not exist
 *
 * NOTE:
 * Rewrite it to 'upsertFunction' after updating Puppeteer to 20.6 or higher
 * using page.removeExposedFunction
 * https://pptr.dev/api/puppeteer.page.removeExposedFunction
 *
 * @param {import(puppeteer).Page} page
 * @param {string} name
 * @param {Function} fn
 */
async function exposeFunctionIfAbsent(page, name, fn) {
    const exist = await page.evaluate((name) => {
        return !!window[name];
    }, name);
    if (exist) {
        return;
    }
    // Try to expose the function, handling the case where the CDP binding
    // already exists (can happen after page navigation)
    try {
        await withTimeout(
            page.exposeFunction(name, fn),
            5000
        );
    } catch (err) {
        if (err.message && err.message.includes('already exists')) {
            // CDP binding exists but page context was cleared (after navigation)
            // Remove the old binding and re-add it with the new function
            try {
                await page.removeExposedFunction(name);
                await page.exposeFunction(name, fn);
            } catch (removeErr) {
                console.warn('[WWebJs] Failed to remove exposed function in Puppeteer');
                // If removal fails, the binding is still usable from the previous expose
                // This can happen in older Puppeteer versions
            }
        } else if (err.message && err.message.includes('Timeout')) {
            console.warn('[WWebJS] Timeout when exposing function in Puppeteer');
        } else {
            throw err;
        }
    }
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
        )
    ]);
}

module.exports = {exposeFunctionIfAbsent};
