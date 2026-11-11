from pathlib import Path

p = Path("flutter_app/android/app/build.gradle.kts")
if not p.exists():
    p = Path("flutter_app/android/app/build.gradle")
if not p.exists():
    raise SystemExit("Android app Gradle file not found")

lines = p.read_text().splitlines()
found = False
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith("compileSdk"):
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + ("compileSdk = 36" if p.suffix == ".kts" else "compileSdk 36")
        found = True
        break
if not found:
    raise SystemExit("No compileSdk line found in " + str(p))

text = "\n".join(lines) + "\n"
if p.suffix == ".kts":
    if "isCoreLibraryDesugaringEnabled = true" not in text:
        text = text.replace("compileOptions {", "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", 1)
    if "coreLibraryDesugaring(" not in text:
        if "dependencies {" not in text:
            text += '\ndependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")\n}\n'
        else:
            text = text.replace("dependencies {", 'dependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")', 1)
else:
    if "coreLibraryDesugaringEnabled true" not in text:
        text = text.replace("compileOptions {", "compileOptions {\n        coreLibraryDesugaringEnabled true", 1)
    if "coreLibraryDesugaring " not in text:
        if "dependencies {" not in text:
            text += "\ndependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'\n}\n"
        else:
            text = text.replace("dependencies {", "dependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'", 1)

if "36" not in next((x for x in text.splitlines() if x.strip().startswith("compileSdk")), ""):
    raise SystemExit("compileSdk 36 was not applied")
p.write_text(text)
print("Configured compileSdk 36 and core library desugaring in " + str(p))
