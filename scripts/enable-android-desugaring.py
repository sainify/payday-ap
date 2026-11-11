from pathlib import Path

def set_compile_sdk(path: Path, required: bool = False) -> bool:
    text = path.read_text()
    lines = text.splitlines()
    changed = False
    for i, line in enumerate(lines):
        if line.strip().startswith("compileSdk"):
            indent = line[:len(line) - len(line.lstrip())]
            replacement = indent + ("compileSdk = 36" if path.suffix == ".kts" else "compileSdk 36")
            if line != replacement:
                lines[i] = replacement
                changed = True
            break
    else:
        if required:
            raise SystemExit(f"No compileSdk declaration found in {path}")
        return False
    if changed:
        path.write_text("\n".join(lines) + "\n")
    return changed

app_dir = Path("flutter_app/android/app")
app = app_dir / "build.gradle.kts"
if not app.exists():
    app = app_dir / "build.gradle"
if not app.exists():
    raise SystemExit("Android app Gradle file not found")
set_compile_sdk(app, required=True)
text = app.read_text()
if app.suffix == ".kts":
    if "isCoreLibraryDesugaringEnabled = true" not in text:
        text = text.replace("compileOptions {", "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", 1)
    if "coreLibraryDesugaring(" not in text:
        text = text.replace("dependencies {", 'dependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")', 1)
else:
    if "coreLibraryDesugaringEnabled true" not in text:
        text = text.replace("compileOptions {", "compileOptions {\n        coreLibraryDesugaringEnabled true", 1)
    if "coreLibraryDesugaring " not in text:
        text = text.replace("dependencies {", "dependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'", 1)
app.write_text(text)

# Remove the failed lifecycle hook from the root Gradle file.
root = Path("flutter_app/android/build.gradle.kts")
if root.exists():
    content = root.read_text()
    marker = "// Align Android library plugins"
    if marker in content:
        content = content.split(marker, 1)[0].rstrip() + "\n"
        root.write_text(content)

# Patch each Flutter plugin Android library project after pub get.
cache = Path.home() / ".pub-cache" / "hosted" / "pub.dev"
patched = []
if cache.exists():
    for plugin_gradle in cache.glob("*/android/build.gradle*"):
        if plugin_gradle.is_file() and set_compile_sdk(plugin_gradle):
            patched.append(str(plugin_gradle))
if not patched:
    raise SystemExit("No cached Flutter plugin Android Gradle compileSdk declarations were patched")
print(f"Configured app compileSdk 36 and patched {len(patched)} Flutter plugin Android modules.")
