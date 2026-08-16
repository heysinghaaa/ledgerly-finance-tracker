import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.removeItem("ledgerly-finance-state:anonymous");
    window.localStorage.removeItem("ledgerly-demo-progress");
  });
  await page.reload();
});

test("completes the guided invoice workflow", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Desktop workflow is covered separately from the mobile navigation path.");
  await page.getByRole("button", { name: "Try demo workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Create walkthrough invoice" }).click();
  await expect(page).toHaveURL(/\/invoices\?invoice=/);
  await page.getByRole("combobox", { name: "Invoice status" }).click();
  await page.getByRole("option", { name: "Paid" }).click();
  await page.getByRole("button", { name: "Overview" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("3 / 4")).toBeVisible();
  await page.getByRole("button", { name: "Open invoice to export" }).click();
  await expect(page).toHaveURL(/\/invoices\?invoice=/);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download invoice PDF" }).click();
  await download;
});

test("uses real routes and resets seeded demo data", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Desktop route coverage is sufficient for this state-reset scenario.");
  await page.getByRole("button", { name: "Try demo workspace" }).click();
  await page.getByRole("button", { name: "Clients" }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).last().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("0 / 4")).toBeVisible();
});

test("keeps the mobile workspace free of horizontal overflow", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "This scenario targets the mobile navigation treatment.");
  await page.getByRole("button", { name: "Try demo workspace" }).click();
  await page.getByLabel("Open navigation").click();
  await page.getByRole("button", { name: "Transactions" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("holds the entry and dashboard layout at required responsive widths", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Viewport matrix runs once in Chromium.");
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Good morning/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});
