"""Live BDR crawl: login as bdr/bdr and capture routes + UI text."""
from pathlib import Path
import json, time, re

out_dir = Path(r"E:\AI module project\imp-platform\imp-platform\docs\screenshots\bdr\live-fetch")
out_dir.mkdir(parents=True, exist_ok=True)

from playwright.sync_api import sync_playwright

BASE = "https://acelereseucrescimento.com.br"
shots = out_dir / "shots"
shots.mkdir(exist_ok=True)

results = {"pages": [], "nav": [], "errors": []}

def text_sample(page, limit=2500):
    try:
        return page.inner_text("body")[:limit]
    except Exception as e:
        return f"<err {e}>"

with sync_playwright() as p:
    # Prefer system Chrome to avoid waiting for bundled chromium download
    browser = None
    for channel in ("chrome", "msedge", None):
        try:
            if channel:
                browser = p.chromium.launch(headless=True, channel=channel)
            else:
                browser = p.chromium.launch(headless=True)
            results["browser"] = channel or "chromium"
            break
        except Exception as e:
            results["errors"].append(f"launch {channel}: {e}")
    if not browser:
        raise SystemExit("Could not launch browser")

    context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="pt-BR")
    page = context.new_page()
    page.set_default_timeout(45000)

    # Login
    page.goto(BASE + "/", wait_until="networkidle")
    page.screenshot(path=str(shots / "01-login.png"), full_page=True)
    results["pages"].append({"path": "/", "title": page.title(), "url": page.url, "sample": text_sample(page)})

    # fill credentials - Portuguese labels
    # try multiple selectors
    filled = False
    for sel in ['input[type="text"]', 'input[name="username"]', 'input[placeholder*="usu"]', 'input']:
        try:
            inputs = page.locator("input")
            count = inputs.count()
            if count >= 2:
                inputs.nth(0).fill("bdr")
                inputs.nth(1).fill("bdr")
                filled = True
                break
        except Exception:
            continue
    results["nav"].append({"action": "fill credentials", "ok": filled})

    # click login
    clicked = False
    for name in ["Entrar no Sistema", "Entrar"]:
        btn = page.get_by_role("button", name=re.compile(name, re.I))
        if btn.count():
            btn.first.click()
            clicked = True
            break
    if not clicked:
        page.locator("button").first.click()
        clicked = True
    page.wait_for_timeout(2000)
    results["nav"].append({"action": "login click", "url": page.url})

    page.screenshot(path=str(shots / "02-after-login.png"), full_page=True)
    results["pages"].append({"path": "after-login", "url": page.url, "sample": text_sample(page)})

    # Visit key routes (client-side; may need auth in localStorage already)
    routes = [
        "/dashboard",
        "/sdr-dashboard",
        "/sdr-dialer?mode=automatic",
        "/sdr-dialer?mode=manual",
        "/dialer",
        "/campaigns",
        "/history",
        "/scheduling",
        "/scheduled-meetings",
    ]

    for i, route in enumerate(routes, start=3):
        page.goto(BASE + route, wait_until="networkidle")
        page.wait_for_timeout(1200)
        name = f"{i:02d}-{route.strip('/').replace('/', '_').replace('?', '_') or 'root'}.png"
        # sanitize filename
        name = re.sub(r"[^a-zA-Z0-9._-]+", "_", name)
        page.screenshot(path=str(shots / name), full_page=True)
        body = text_sample(page)
        results["pages"].append({
            "path": route,
            "url": page.url,
            "title": page.title(),
            "has_login": "Entrar no Sistema" in body or "Usuário" in body and "Senha" in body and "CRM IMP" in body and "Digite seu" in body,
            "sample": body,
        })
        results["nav"].append({"goto": route, "landed": page.url})

    # On dashboard: try status + auto dial if present
    page.goto(BASE + "/dashboard", wait_until="networkidle")
    page.wait_for_timeout(1000)
    for label in ["Em atendimento"]:
        loc = page.get_by_text(label, exact=True)
        if loc.count():
            try:
                loc.first.click()
                results["nav"].append({"click": label, "ok": True})
                page.wait_for_timeout(500)
            except Exception as e:
                results["nav"].append({"click": label, "ok": False, "err": str(e)})
    page.screenshot(path=str(shots / "20-dashboard-atendimento.png"), full_page=True)

    # Click Discagem Automática if enabled
    auto = page.get_by_text("Discagem Automática")
    if auto.count():
        try:
            auto.first.click()
            page.wait_for_timeout(3500)
            page.screenshot(path=str(shots / "21-auto-dial.png"), full_page=True)
            results["nav"].append({"click": "Discagem Automática", "url": page.url, "sample": text_sample(page)})
        except Exception as e:
            results["nav"].append({"click": "Discagem Automática", "err": str(e)})

    # localStorage session
    try:
        storage = page.evaluate("() => ({crm_user: localStorage.getItem('crm_user'), selectedCampaignId: localStorage.getItem('selectedCampaignId')})")
        results["localStorage"] = storage
    except Exception as e:
        results["errors"].append(f"storage {e}")

    browser.close()

(out_dir / "live_crawl.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: results[k] for k in ["browser", "nav", "localStorage", "errors"]}, ensure_ascii=False, indent=2))
print("pages:", len(results["pages"]))
for p in results["pages"]:
    print("-", p.get("path"), "=>", p.get("url"), "login_form=" + str(p.get("has_login")))
