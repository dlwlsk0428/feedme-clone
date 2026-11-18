import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 보노보노 PPT 변환기가 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("URL → Markdown");
  await expect(page.getByText("URL을 마크다운으로")).toBeVisible();
  await expect(page.getByLabel("변환할 URL")).toBeVisible();
});
