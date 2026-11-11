from pathlib import Path

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
        if "compileOptions {" not in text:
            raise SystemExit("compileOptions block not found")
        text = text.replace("compileOptions {", "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", 1)
    if "coreLibraryDesugaring(" not in text:
        text += '\ndependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")\n}\n'
else:
    if "coreLibraryDesugaringEnabled true" not in text:
        if "compileOptions {" not in text:
            raise SystemExit("compileOptions block not found")
        text = text.replace("compileOptions {", "compileOptions {\n        coreLibraryDesugaringEnabled true", 1)
    if "coreLibraryDesugaring " not in text:
        text += "\ndependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'\n}\n"

if "desugar_jdk_libs:2.1.4" not in text:
    raise SystemExit("Desugaring dependency was not inserted")
app.write_text(text)

cache = Path.home() / ".pub-cache" / "hosted" / "pub.dev"
patched = 0
if cache.exists():
    for gradle in cache.glob("*/android/build.gradle*"):
        if not gradle.is_file():
            continue
        source = gradle.read_text()
        out = []
        changed = False
        for line in source.splitlines():
            if line.strip().startswith("compileSdk"):
                indent = line[:len(line) - len(line.lstrip())]
                replacement = indent + ("compileSdk = 36" if gradle.suffix == ".kts" else "compileSdk 36")
                changed = changed or line != replacement
                line = replacement
            out.append(line)
        if changed:
            gradle.write_text("\n".join(out) + "\n")
            patched += 1

print("Verified app compileSdk 36, core library desugaring and desugar_jdk_libs 2.1.4.")
print(f"Updated {patched} cached plugin Gradle files.")
