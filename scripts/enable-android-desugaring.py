from pathlib import Path

app = Path("flutter_app/android/app/build.gradle.kts")
if not app.exists():
    raise SystemExit("Expected generated app Gradle Kotlin file was not found")
s = app.read_text()
lines = s.splitlines()
for i, line in enumerate(lines):
    if line.strip().startswith("compileSdk"):
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + "compileSdk = 36"
        break
else:
    raise SystemExit("Could not locate app compileSdk setting")
s = "\n".join(lines) + "\n"
if "isCoreLibraryDesugaringEnabled = true" not in s:
    s = s.replace("compileOptions {", "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", 1)
if "coreLibraryDesugaring(" not in s:
    s = s.replace("dependencies {", 'dependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")', 1)
app.write_text(s)

root = Path("flutter_app/android/build.gradle.kts")
if not root.exists():
    raise SystemExit("Expected root Gradle Kotlin file was not found")
r = root.read_text()
block = """
// Align Android library plugins with the Android API level required by current Flutter plugins.
subprojects {
    afterEvaluate {
        extensions.findByName("android")?.let { androidExtension ->
            androidExtension.javaClass.methods
                .firstOrNull { it.name == "setCompileSdkVersion" && it.parameterCount == 1 }
                ?.invoke(androidExtension, 36)
        }
    }
}
"""
if "Align Android library plugins" not in r:
    r += "\n" + block
root.write_text(r)
print("Set app and Android library subprojects to compileSdk 36; enabled core library desugaring.")
