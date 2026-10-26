"""Regresión: no perder el registro de clientes/proveedores por cierre accidental."""
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
        for path, nombre in [("proveedores", "proveedor"), ("clientes", "cliente")]:
            await page.goto(f"http://localhost:8080/{path}")
            await page.get_by_role("button", name=f"Registrar {nombre}").click()
            dialog = page.get_by_role("dialog")
            fields = dialog.locator("input")
            await fields.nth(0).fill("12345")
            await fields.nth(1).fill("Registro sin terminar")
            await page.mouse.click(10, 10)
            assert await dialog.is_visible(), "Un clic fuera no debe cerrar el registro"
            assert await fields.nth(0).input_value() == "12345"
            entered_name = await fields.nth(1).input_value()
            confirmations = []

            async def keep_changes(prompt):
                confirmations.append(prompt.message)
                await prompt.dismiss()

            page.on("dialog", keep_changes)
            await page.keyboard.press("Escape")
            assert await dialog.is_visible()
            assert len(confirmations) == 1, "Escape debe confirmar antes de descartar"
            await dialog.get_by_role("button", name="Cancelar", exact=True).click()
            assert await dialog.is_visible()
            assert len(confirmations) == 2
            await dialog.get_by_role("button", name="Cerrar", exact=True).click()
            assert await dialog.is_visible()
            assert len(confirmations) == 3
            assert await fields.nth(1).input_value() == entered_name
            await fields.nth(0).focus()
            page.on("console", lambda msg: print(msg.text) if msg.text.startswith("KEY:") else None)
            await page.evaluate("""document.querySelector('[role=dialog] form').addEventListener('keydown', e => setTimeout(() => console.log('KEY:', e.key, e.defaultPrevented, e.target.tagName), 0))""")
            await fields.nth(0).press("Enter")
            assert await dialog.get_by_text("El RUC debe tener 11 dígitos.", exact=True).count() == 0, "Enter en un campo no debe guardar anticipadamente"
            await dialog.get_by_role("button", name="Guardar", exact=True).click()
            assert await dialog.get_by_text("El RUC debe tener 11 dígitos.", exact=True).is_visible()
            assert await fields.nth(0).input_value() == "12345"
            await dialog.screenshot(path=f"/tmp/browser/proveedores/{path}_protected.png")
            page.remove_listener("dialog", keep_changes)
            page.once("dialog", lambda prompt: prompt.accept())
            await dialog.get_by_role("button", name="Cancelar", exact=True).click()
            assert await page.get_by_role("dialog").count() == 0
            print(f"{nombre}: clic fuera, Escape, Cancelar, cerrar y validación sin pérdida: OK")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())