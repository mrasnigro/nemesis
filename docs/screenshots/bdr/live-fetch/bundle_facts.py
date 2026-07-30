from pathlib import Path
import re, json

js = Path(r"E:\AI module project\imp-platform\imp-platform\docs\screenshots\bdr\live-fetch\live-index-B7vd5ih_.js").read_text(encoding="utf-8", errors="replace")

# minified often uses login:"bdr" nearby
users = []
for m in re.finditer(r'login:"([^"]+)",password:"([^"]+)",role:"([^"]+)",name:"([^"]+)"', js):
    users.append({"login": m.group(1), "password": m.group(2), "role": m.group(3), "name": m.group(4)})

# alternate property order
if not users:
    # search role maps near passwords
    for m in re.finditer(r'\{[^]{0,120}login:"([^"]+)"[^]{0,120}password:"([^"]+)"[^]{0,160}\}', js):
        chunk = m.group(0)
        role = re.search(r'role:"([^"]+)"', chunk)
        name = re.search(r'name:"([^"]+)"', chunk)
        users.append({
            "login": m.group(1),
            "password": m.group(2),
            "role": role.group(1) if role else None,
            "name": name.group(1) if name else None,
            "raw": chunk[:180],
        })

markers = {}
for s in [
    "/dashboard", "/sdr-dashboard", "/sdr-dialer", "/dialer", "/campaigns", "/history",
    "/scheduling", "/scheduled-meetings", "crm_user", "selectedCampaignId",
    "Aguardando ligação", "Procura Automática", "Falando", "endCallModal",
    "Finalizar Atendimento", "Discagem Automática", "5000", "setTimeout",
]:
    markers[s] = js.count(s)

# source paths embedded
srcs = sorted(set(re.findall(r"frontend/src/[A-Za-z0-9_./-]+\.tsx", js)))

out = {"users": users, "markers": markers, "tsx_paths": srcs}
Path(r"E:\AI module project\imp-platform\imp-platform\docs\screenshots\bdr\live-fetch\bundle_facts.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(out, ensure_ascii=False, indent=2)[:4000])
