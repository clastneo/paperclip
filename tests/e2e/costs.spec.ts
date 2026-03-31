import { expect, test, type Page } from "@playwright/test";

const COMPANY_NAME = `Costs-E2E-${Date.now()}`;
const AGENT_NAME = "CEO";
const TASK_TITLE = "Verify costs page renders";

const ONBOARDING_COMPANY_HEADING = "회사 이름 정하기";
const ONBOARDING_AGENT_HEADING = "첫 번째 에이전트 만들기";
const ONBOARDING_TASK_HEADING = "작업 하나 맡기기";
const ONBOARDING_LAUNCH_HEADING = "실행 준비 완료";
const NEXT_BUTTON = "다음";
const OPEN_ISSUE_BUTTON = "이슈 만들고 열기";

const COSTS_HEADING = "\ube44\uc6a9";
const INFERENCE_SPEND_LABEL = "\ucd94\ub860 \uc0ac\uc6a9\uc561";
const FINANCE_EVENTS_LABEL = "\uc7ac\ubb34 \uc774\ubca4\ud2b8";

async function completeOnboarding(page: Page) {
  await page.goto("/");

  const wizardHeading = page.locator("h3", { hasText: ONBOARDING_COMPANY_HEADING });
  await expect(wizardHeading).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Acme Corp"]').fill(COMPANY_NAME);
  await page.getByRole("button", { name: NEXT_BUTTON }).click();

  await expect(
    page.locator("h3", { hasText: ONBOARDING_AGENT_HEADING })
  ).toBeVisible({ timeout: 10_000 });

  const agentNameInput = page.locator('input[placeholder="CEO"]');
  await expect(agentNameInput).toHaveValue(AGENT_NAME);
  await page.getByRole("button", { name: NEXT_BUTTON }).click();

  await expect(
    page.locator("h3", { hasText: ONBOARDING_TASK_HEADING })
  ).toBeVisible({ timeout: 10_000 });

  await page
    .locator('input[placeholder="예: 경쟁사 가격 조사"]')
    .fill(TASK_TITLE);
  await page.getByRole("button", { name: NEXT_BUTTON }).click();

  await expect(
    page.locator("h3", { hasText: ONBOARDING_LAUNCH_HEADING })
  ).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: OPEN_ISSUE_BUTTON }).click();
  await expect(page).toHaveURL(/\/issues\//, { timeout: 10_000 });
}

test.describe("Costs page", () => {
  test("renders after onboarding without a Vite parse overlay", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await completeOnboarding(page);

    const companyPrefix = new URL(page.url()).pathname.split("/")[1];
    await page.goto(`/${companyPrefix}/costs`);

    const mainContent = page.locator("#main-content");

    await expect(page).toHaveURL(new RegExp(`/${companyPrefix}/costs$`), {
      timeout: 10_000,
    });
    await expect(
      mainContent.getByRole("heading", { level: 1, name: COSTS_HEADING })
    ).toBeVisible({ timeout: 15_000 });
    await expect(mainContent.getByText(INFERENCE_SPEND_LABEL, { exact: true })).toBeVisible();
    await expect(mainContent.getByText(FINANCE_EVENTS_LABEL, { exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Unexpected token");
    expect(pageErrors).toEqual([]);
  });
});
