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

# Add desugaring switch using literal Gradle block matching.
if kotlin:
    if "isCoreLibraryDesugaringEnabled = true" not in text:
        if "compileOptions {" not in text:
            raise SystemExit("compileOptions block not found")
        text = text.replace("compileOptions {", "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", 1)
    if "coreLibraryDesugaring(" not in text:
        dep = '\ndependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")\n}\n'
        text += dep
else:
    if "coreLibraryDesugaringEnabled true" not in text:
        if "compileOptions {" not in text:
            raise SystemExit("compileOptions block not found")
        text = text.replace("compileOptions {", "compileOptions {\n        coreLibraryDesugaringEnabled true", 1)
    if "coreLibraryDesugaring " not in text:
        text += "\ndependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'\n}\n"

if "desugar_jdk_libs:2.1.4" not in text:
    raise SystemExit("Desugaring library dependency was not added")
if kotlin and "isCoreLibraryDesugaringEnabled = true" not in text:
    raise SystemExit("Desugaring is not enabled in compileOptions")
if not kotlin and "coreLibraryDesugaringEnabled true" not in text:
    raise SystemExit("Desugaring is not enabled in compileOptions")
app.write_text(text)

# Set compileSdk 36 on cached Android plugin projects (for example file_picker).
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
                replacement = indent + ("compileSdk = 36" if gradle.suffix == ".kts" else "compileSdk 36")
                changed = changed or line != replacement
                line = replacement
            out.append(line)
        if changed:
            gradle.write_text("\n".join(out) + "\n")
            patched += 1

print("Verified Android app compileSdk 36, coreLibraryDesugaring enabled, and desugar_jdk_libs 2.1.4.")
print(f"Updated {patched} cached Flutter plugin Gradle files to compileSdk 36.")
