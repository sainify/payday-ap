from pathlib import Path
import re

app_dir = Path("flutter_app/android/app")
app = app_dir / "build.gradle.kts"
kotlin = app.exists()
if not kotlin:
    app = app_dir / "build.gradle"
if not app.exists():
    raise SystemExit("Android app Gradle file not found")

text = app.read_text()
lines = text.splitlines()
for i, line in enumerate(lines):
    if line.strip().startswith("compileSdk"):
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + ("compileSdk = 36" if kotlin else "compileSdk 36")
        break
else:
    raise SystemExit("compileSdk declaration not found")
text = "\n".join(lines) + "\n"

if kotlin:
    if "isCoreLibraryDesugaringEnabled = true" not in text:
        text = re.sub(r"(compileOptions\\s*\\{)", r"\\1\\n        isCoreLibraryDesugaringEnabled = true", text, count=1)
    if not re.search(r"coreLibraryDesugaring\\s*\\(", text):
        text += '\n\ndependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")\n}\n'
else:
    if "coreLibraryDesugaringEnabled true" not in text:
        text = re.sub(r"(compileOptions\\s*\\{)", r"\\1\\n        coreLibraryDesugaringEnabled true", text, count=1)
    if not re.search(r"coreLibraryDesugaring\\s+['\"]", text):
        text += "\n\ndependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'\n}\n"

if "desugar_jdk_libs:2.1.4" not in text:
    raise SystemExit("Desugaring dependency insertion verification failed")
app.write_text(text)

# Patch cached Flutter Android plugins' compileSdk directly, avoiding Gradle lifecycle hooks.
cache = Path.home() / ".pub-cache" / "hosted" / "pub.dev"
patched = 0
if cache.exists():
    for gradle in cache.glob("*/android/build.gradle*"):
        if not gradle.is_file():
            continue
        src = gradle.read_text()
        out = []
        changed = False
        for line in src.splitlines():
            if line.strip().startswith("compileSdk"):
                indent = line[:len(line) - len(line.lstrip())]
                repl = indent + ("compileSdk = 36" if gradle.suffix == ".kts" else "compileSdk 36")
                changed |= line != repl
                line = repl
            out.append(line)
        if changed:
            gradle.write_text("\n".join(out) + "\n")
            patched += 1

print(f"Verified app compileSdk 36 + desugar_jdk_libs 2.1.4; patched {patched} plugin Gradle files.")
