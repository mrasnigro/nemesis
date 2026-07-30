from pathlib import Path
import re, json

js = Path(r"E:\AI module project\imp-platform\imp-platform\docs\screenshots\bdr\live-fetch\live-index-B7vd5ih_.js").read_text(encoding="utf-8", errors="replace")
html = Path(r"E:\AI module project\imp-platform\imp-platform\docs\screenshots\bdr\live-fetch\live-index.html").read_text(encoding="utf-8", errors="replace")

# route strings
cands = sorted(set(re.findall(r'["\'](/[a-zA-Z0-9\-/?=_]+)["\']', js)))
keep = [c for c in cands if re.match(r'^/[a-z]', c) and len(c) < 60]
# filter noise
noise = {"/assets", "/src", "/node_modules"}
routes = [c for c in keep if not any(c.startswith(n) for n in noise)]
print("ROUTES")
for r in routes:
    if any(k in r for k in ["dash", "dial", "camp", "hist", "sched", "sdr", "login", "health", "admin", "meet"]):
        print(r)

# labels
for label in [
    "Discagem Automática",
    "Ligação Manual",
    "Aguardando ligação",
    "Procura Automática",
    "Falando",
    "Finalizar Atendimento",
    "Em atendimento",
    "Desconectado",
    "Termômetro",
    "Termometro",
    "endCallModal",
]:
    print(f"LABEL {label!r}: {js.count(label) + html.count(label)}")

# users map
for m in re.finditer(r'login:"([^"]+)",password:"([^"]+)",role:"([^"]+)",name:"([^"]+)"', js):
    print("USER", m.groups())

# campaign names
for name in ["Campanha Padrão", "Prospecção Fria", "Follow-up"]:
    print(f"CAMP {name}: {js.count(name)}")

out = {
    "asset": "index-B7vd5ih_.js",
    "css": "index-BR17lsp1.css",
    "route_candidates": [r for r in routes if any(k in r for k in ["dash","dial","camp","hist","sched","sdr","meet"])],
}
Path(r"E:\AI module project\imp-platform\imp-platform\docs\screenshots\bdr\live-fetch\extract.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
print("wrote extract.json")
