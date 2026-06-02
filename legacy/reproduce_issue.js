
const { expect } = require('expect');

// Helper to wait for element
const waitForElement = async (selector, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const el = document.querySelector(selector);
        if (el) return el;
        await new Promise(r => setTimeout(r, 100));
    }
    return null;
};

// Main test function
async function runTest() {
    console.log("Starting reproduction test...");

    // 1. Initial Load
    console.log("Checking initial load...");
    const selector = await waitForElement('button[class*="flex items-center justify-between gap-2"]');
    if (selector) {
        console.log("PASS: Project selector visible on initial load.");
        const text = selector.innerText;
        console.log("Selected Project:", text);
    } else {
        console.log("FAIL: Project selector NOT visible on initial load.");
    }

    // 2. Refresh
    console.log("Refreshing page...");
    location.reload();

    // Wait for reload
    await new Promise(r => setTimeout(r, 2000));

    console.log("Checking after refresh...");
    const selectorAfter = await waitForElement('button[class*="flex items-center justify-between gap-2"]');
    if (selectorAfter) {
        console.log("PASS: Project selector visible after refresh.");
        const text = selectorAfter.innerText;
        console.log("Selected Project:", text);
    } else {
        console.log("FAIL: Project selector NOT visible after refresh.");
    }

    // 3. Find Delete Button
    console.log("Searching for Delete/Archive buttons...");
    const archiveBtns = document.querySelectorAll('button[title="Archive Project"]');
    console.log(`Found ${archiveBtns.length} Archive buttons.`);

    // 4. Look for any button with "Delete" text
    const buttons = Array.from(document.querySelectorAll('button'));
    const deleteBtn = buttons.find(b => b.innerText.toLowerCase().includes('delete'));
    if (deleteBtn) {
        console.log("Found a Delete button:", deleteBtn);
    } else {
        console.log("No button with text 'Delete' found.");
    }
}

runTest();
