import { test, expect } from "@playwright/test";

async function setupAdmin(page, section) {
  const user = { id: "1", username: "Admin", email: "admin@example.test", role: "admin" };
  const state = { deleted: false, searchSeen: false, releaseSearch: null, slowSearch: false };
  await page.addInitScript((user) => {
    localStorage.setItem("chatai_token", "synthetic-admin-token");
    localStorage.setItem("chatai_user", JSON.stringify(user));
    localStorage.setItem("chatai_lang", "en");
  }, user);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/^.*\/api/, "");
    let data = {};
    if (pathname === "/auth/me") data = { user };
    else if (pathname === "/preferences") data = { uiLanguage: "en", aiLanguage: "auto" };
    else if (pathname === `/admin/${section}`) {
      const search = url.searchParams.get("search") || "";
      if (state.slowSearch && search === "Old") {
        state.searchSeen = true;
        await new Promise((resolve) => { state.releaseSearch = resolve; });
      }
      const pageNumber = Number(url.searchParams.get("page"));
      const pageSize = section === "users" ? 10 : 15;
      const total = search ? 1 : pageSize + (state.deleted ? 0 : 1);
      const items = search ? [{ _id: "9", username: `${search} result`, email: "result@example.test", role: "user", status: "active" }]
        : Array.from({ length: pageNumber === 2 ? (state.deleted ? 0 : 1) : pageSize }, (_, i) => ({
          _id: String(pageNumber === 2 ? 99 : i + 2),
          username: pageNumber === 2 ? "LastUser" : `User${i}`, email: `user${i}@example.test`, role: "user", status: "active",
          title: pageNumber === 2 ? "Last chat" : `Chat${i}`, provider: "groq", model: "test", updatedAt: new Date().toISOString(),
        }));
      data = { [section]: items, total };
    } else if (pathname === `/admin/${section}/99` && route.request().method() === "DELETE") state.deleted = true;
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto(`/admin/${section}`);
  await expect(page.getByRole("button", { name: "Next page", exact: true })).toBeVisible();
  return state;
}

test("admin user search ignores an older response arriving last", async ({ page }) => {
  const state = await setupAdmin(page, "users");
  state.slowSearch = true;
  await page.getByRole("textbox", { name: "Search users", exact: true }).fill("Old");
  await expect.poll(() => state.searchSeen).toBe(true);
  await page.getByRole("textbox", { name: "Search users", exact: true }).fill("New");
  await expect(page.getByText("New result", { exact: true }).filter({ visible: true })).toBeVisible();
  const response = page.waitForResponse((response) => new URL(response.url()).searchParams.get("search") === "Old");
  state.releaseSearch();
  await response;
  await expect(page.getByText("New result", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Old result", { exact: true })).toHaveCount(0);
});

for (const section of ["users", "conversations"]) {
  test(`deleting the last ${section} row returns to a valid page`, async ({ page }) => {
    const state = await setupAdmin(page, section);
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    if (section === "users") await page.getByRole("button", { name: "Delete account LastUser", exact: true }).click();
    else await page.getByRole("button", { name: "Delete conversation", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: section === "users" ? "Delete permanently" : "Delete", exact: true }).click();
    await expect.poll(() => state.deleted).toBe(true);
    await expect(page.getByText(section === "users" ? "User0" : "Chat0", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next page", exact: true })).toHaveCount(0);
  });
}
