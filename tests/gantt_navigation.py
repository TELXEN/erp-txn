"""Regresión de selección Gantt. Ejecutar con sesión de vista previa inyectada."""
import asyncio
import json
import os
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        cookies = json.loads(os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON") or "[]")
        if cookies:
            await context.add_cookies([{**c, "url": "http://localhost:8080"} for c in cookies])
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [
            os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"],
            os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"],
        ])
        await page.goto("http://localhost:8080/gantt")
        select = page.get_by_label("Proyecto del Gantt")
        await select.locator("option").nth(1).wait_for(state="attached", timeout=30000)
        project_id = await select.locator("option").nth(1).get_attribute("value")
        assert project_id
        await select.select_option(project_id)
        await page.get_by_role("region", name="Calendario Gantt").wait_for()
        await page.get_by_role("link", name="Avance Físico", exact=True).click()
        await page.wait_for_url("**/avance")
        await page.get_by_role("link", name="Diagrama Gantt", exact=True).click()
        await page.wait_for_url("**/gantt")
        await select.locator("option").nth(1).wait_for(state="attached", timeout=30000)
        await page.wait_for_function("([id])=>document.querySelector('[aria-label=\"Proyecto del Gantt\"]').value===id", arg=[project_id])
        assert await select.input_value() == project_id
        await page.reload()
        await select.locator("option").nth(1).wait_for(state="attached", timeout=30000)
        await page.wait_for_function("([id])=>document.querySelector('[aria-label=\"Proyecto del Gantt\"]').value===id", arg=[project_id])
        assert await select.input_value() == project_id
        print("Último proyecto restaurado al volver y recargar: OK")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())