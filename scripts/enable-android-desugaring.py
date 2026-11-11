from pathlib import Path

base = Path("flutter_app/android/app")
path = base / "build.gradle.kts"
kotlin = path.exists()
if not kotlin:
    path = base / "build.gradle"
if not path.exists():
    raise SystemExit("Android app Gradle file not found")

text = path.read_text()
if kotlin:
    if "isCoreLibraryDesugaringEnabled = true" not in text:
        text = text.replace("compileOptions {", "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", 1)
    if "coreLibraryDesugaring(" not in text:
        if "dependencies {" in text:
            text = text.replace("dependencies {", 'dependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")', 1)
        else:
            text += '\ndependencies { coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4") }\n'
else:
    if "coreLibraryDesugaringEnabled true" not in text:
        text = text.replace("compileOptions {", "compileOptions {\n        coreLibraryDesugaringEnabled true", 1)
    if "coreLibraryDesugaring " not in text:
        if "dependencies {" in text:
            text = text.replace("dependencies {", "dependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'", 1)
        else:
            text += "\ndependencies { coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4' }\n"

if "isCoreLibraryDesugaringEnabled = true" not in text and "coreLibraryDesugaringEnabled true" not in text:
    raise SystemExit("Could not enable core library desugaring")
path.write_text(text)
print(f"Enabled core library desugaring in {path}")
