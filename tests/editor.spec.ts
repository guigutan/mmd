import { readFile } from 'node:fs/promises';
import { test, expect, type Page, type Download } from '@playwright/test';

const validCode = 'flowchart LR\n    A[中文测试起点] --> B[导出验证终点]';

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('#diagram > svg')).toBeVisible();
  await expect(page.locator('#export-svg')).toBeEnabled();
  await expect(page.locator('#export-png')).toBeEnabled();
}

async function setCode(page: Page, code: string) {
  await page.getByRole('textbox', { name: 'Mermaid 代码编辑器' }).fill(code);
}

async function downloadFile(page: Page, format: 'svg' | 'png'): Promise<Download> {
  const downloading = page.waitForEvent('download');
  await page.locator(`#export-${format}`).click();
  const download = await downloading;
  expect(await download.failure()).toBeNull();
  return download;
}

async function downloadBytes(download: Download): Promise<Buffer> {
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}

async function pixelStats(page: Page, png: Buffer) {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    let nonWhite = 0;
    let lightPixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) transparent++;
      if (data[index + 3] > 0 && (data[index] < 240 || data[index + 1] < 240 || data[index + 2] < 240)) nonWhite++;
      if (data[index + 3] > 0 && data[index] > 150 && data[index + 1] > 150 && data[index + 2] > 150) lightPixels++;
    }
    return { transparent, nonWhite, lightPixels, cornerAlpha: data[3], cornerColor: [...data.subarray(0, 4)] };
  }, png.toString('base64'));
}

test('初始中文图表正常显示，导出按钮可用', async ({ page }) => {
  await ready(page);
  await expect(page).toHaveTitle('Mermaid Lite · 让思路成图');
  await expect(page.locator('#diagram > svg')).toContainText('一个好想法');
  await expect(page.locator('#diagram > svg')).toContainText('PNG 高清图');
  await expect(page.locator('#error-box')).toBeHidden();
  await expect(page.locator('#render-status')).toHaveText('预览已更新');
});

test('编辑实时生效，语法错误禁用导出，修复后恢复', async ({ page }) => {
  await ready(page);
  await setCode(page, validCode);
  await expect(page.locator('#diagram > svg')).toContainText('中文测试起点');
  await expect(page.locator('#export-svg')).toBeEnabled();

  await setCode(page, 'flowchart TD\n A[未闭合节点');
  await expect(page.locator('#error-box')).toBeVisible();
  await expect(page.locator('#render-status')).toHaveText('代码需要调整');
  await expect(page.locator('#export-svg')).toBeDisabled();
  await expect(page.locator('#export-png')).toBeDisabled();

  await setCode(page, 'flowchart TD\n A[已经修复] --> B[重新导出]');
  await expect(page.locator('#diagram > svg')).toContainText('已经修复');
  await expect(page.locator('#error-box')).toBeHidden();
  await expect(page.locator('#export-svg')).toBeEnabled();
  await expect(page.locator('#export-png')).toBeEnabled();

  await setCode(page, '');
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#diagram > svg')).toHaveCount(0);
  await expect(page.locator('#export-svg')).toBeDisabled();
});

for (const [template, expectedText] of [
  ['sequence', '发起请求'],
  ['state', '审核中'],
  ['er', 'created_at'],
] as const) {
  test(`${template} 示例可渲染且保持可导出的 SVG 标签`, async ({ page }) => {
    await ready(page);
    await page.getByLabel('插入示例', { exact: true }).selectOption(template);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: '插入示例', exact: true }).click();
    await expect(page.locator('#diagram > svg')).toContainText(expectedText);
    await expect(page.locator('#error-box')).toBeHidden();
    await expect(page.locator('#export-svg')).toBeEnabled();
    await expect(page.locator('#diagram foreignObject')).toHaveCount(0);
  });
}

test('刷新后恢复代码、名称、主题与导出设置', async ({ page }) => {
  await ready(page);
  await setCode(page, validCode);
  await page.getByLabel('图表名称').fill('持久化测试图');
  await page.getByLabel('图表主题').selectOption('neutral');
  await page.getByLabel('透明背景').check();
  await page.locator('#scale').selectOption('3');
  await expect(page.locator('#save-status')).toHaveText('已保存到此浏览器');
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('mermaid-lite.document.v1') || '{}');
    return [stored.code, stored.filename, stored.theme, stored.transparent, stored.scale];
  })).toEqual([validCode, '持久化测试图', 'neutral', true, '3']);

  await page.reload();
  await expect(page.locator('#diagram > svg')).toContainText('中文测试起点');
  await expect(page.getByLabel('图表名称')).toHaveValue('持久化测试图');
  await expect(page.getByLabel('图表主题')).toHaveValue('neutral');
  await expect(page.getByLabel('透明背景')).toBeChecked();
  await expect(page.locator('#scale')).toHaveValue('3');
  await expect(page.locator('#export-png')).toBeEnabled();
});

test('旧标签页离开时不会覆盖另一标签页已保存的新草稿', async ({ page, context }) => {
  await ready(page);
  await setCode(page, validCode);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mermaid-lite.document.v1') || '{}').code)).toBe(validCode);

  const staleTab = await context.newPage();
  await ready(staleTab);
  await expect(staleTab.locator('#diagram > svg')).toContainText('中文测试起点');
  const updatedCode = 'flowchart LR\n A[新标签页修改后保留的草稿] --> B[不能被旧页面覆盖]';
  await setCode(page, updatedCode);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mermaid-lite.document.v1') || '{}').code)).toBe(updatedCode);

  await staleTab.goto('about:blank');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mermaid-lite.document.v1') || '{}').code)).toBe(updatedCode);
  await page.reload();
  await expect(page.locator('#diagram > svg')).toContainText('不能被旧页面覆盖');
});

test('实际下载 SVG 与 PNG，尺寸、中文和透明背景均正确', async ({ page }) => {
  await ready(page);
  await setCode(page, validCode);
  await expect(page.locator('#diagram > svg')).toContainText('中文测试起点');
  await page.getByLabel('图表名称').fill('中文导出测试');

  const dimensions = await page.locator('#diagram > svg').evaluate((node) => {
    const box = (node as SVGSVGElement).viewBox.baseVal;
    return { width: box.width, height: box.height };
  });
  const svgDownload = await downloadFile(page, 'svg');
  expect(svgDownload.suggestedFilename()).toBe('中文导出测试.svg');
  const source = (await downloadBytes(svgDownload)).toString('utf8');
  expect(source).toContain('中文测试起点');
  expect(source).toContain('导出验证终点');
  expect(source).toContain('viewBox=');
  expect(source).not.toContain('foreignObject');
  const svgValidity = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, 'image/svg+xml');
    return {
      parseErrors: document.querySelectorAll('parsererror').length,
      root: document.documentElement.localName,
      width: Number(document.documentElement.getAttribute('width')),
      height: Number(document.documentElement.getAttribute('height')),
    };
  }, source);
  expect(svgValidity).toEqual({ parseErrors: 0, root: 'svg', ...dimensions });

  const pngDownload = await downloadFile(page, 'png');
  expect(pngDownload.suggestedFilename()).toBe('中文导出测试.png');
  const png = await downloadBytes(pngDownload);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.readUInt32BE(16)).toBe(Math.ceil(dimensions.width * 2));
  expect(png.readUInt32BE(20)).toBe(Math.ceil(dimensions.height * 2));
  const whitePixels = await pixelStats(page, png);
  expect(whitePixels.cornerAlpha).toBe(255);
  expect(whitePixels.transparent).toBe(0);
  expect(whitePixels.nonWhite).toBeGreaterThan(100);

  await page.getByLabel('透明背景').check();
  await page.locator('#scale').selectOption('3');
  const transparentPng = await downloadBytes(await downloadFile(page, 'png'));
  expect(transparentPng.readUInt32BE(16)).toBe(Math.ceil(dimensions.width * 3));
  expect(transparentPng.readUInt32BE(20)).toBe(Math.ceil(dimensions.height * 3));
  const transparentPixels = await pixelStats(page, transparentPng);
  expect(transparentPixels.cornerAlpha).toBe(0);
  expect(transparentPixels.transparent).toBeGreaterThan(100);
  expect(transparentPixels.nonWhite).toBeGreaterThan(100);
});

test('深色主题导出保留深色背景和可见标签', async ({ page }) => {
  await ready(page);
  await setCode(page, validCode);
  await page.getByLabel('图表主题').selectOption('dark');
  await page.locator('#scale').selectOption('1');
  await expect(page.locator('.preview-body')).toHaveClass(/dark-diagram/);
  await expect(page.locator('#export-png')).toBeEnabled();
  const width = await page.locator('#diagram > svg').evaluate(node => (node as SVGSVGElement).viewBox.baseVal.width);
  const png = await downloadBytes(await downloadFile(page, 'png'));
  expect(png.readUInt32BE(16)).toBe(Math.ceil(width));
  const pixels = await pixelStats(page, png);
  expect(pixels.cornerColor).toEqual([32, 35, 43, 255]);
  expect(pixels.transparent).toBe(0);
  expect(pixels.lightPixels).toBeGreaterThan(100);
});

test('移动端可操作且页面不横向溢出', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.getByRole('textbox', { name: 'Mermaid 代码编辑器' })).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(layout.document).toBeLessThanOrEqual(layout.viewport);
  expect(layout.body).toBeLessThanOrEqual(layout.viewport);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('#export-png')).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
  expect(pageErrors).toEqual([]);
});

 test('紧凑布局为四比六，新页签显示当前图表', async ({ page, context }, testInfo) => {
  await ready(page);
  await expect(page.locator('.document-bar')).toHaveCount(0);
  const editor = await page.locator('.editor-panel').boundingBox();
  const preview = await page.locator('.preview-panel').boundingBox();
  expect(editor!.width / preview!.width).toBeCloseTo(2 / 3, 2);
  const opened = context.waitForEvent('page');
  await page.getByRole('button', { name: '新页签预览', exact: true }).click();
  const popup = await opened;
  await popup.waitForLoadState();
  await expect(popup.locator('svg')).toContainText('一个好想法');
  await page.screenshot({path: testInfo.outputPath('compact-desktop.png'), fullPage:true});
  await popup.close();
 });
