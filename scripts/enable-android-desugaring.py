from pathlib import Path
import re

p = Path("flutter_app/android/app/build.gradle.kts")
kts = p.exists()
if not kts:
    p = Path("flutter_app/android/app/build.gradle")
if not p.exists():
    raise SystemExit("Android app Gradle file not found")
s = p.read_text()
if kts:
    s, n = re.subn(r"compileSdk\\s*=\\s*flutter\\.compileSdkVersion", "compileSdk = 36", s, count=1)
    if not n:
        s, n = re.subn(r"compileSdk\\s*=\\s*\\d+", "compileSdk = 36", s, count=1)
else:
    s, n = re.subn(r"compileSdk\\s+flutter\\.compileSdkVersion", "compileSdk 36", s, count=1)
    if not n:
        s, n = re.subn(r"compileSdk\\s+\\d+", "compileSdk 36", s, count=1)
if not n:
    raise SystemExit("Could not update compileSdk declaration")
p.write_text(s)
print("Set Android compileSdk to 36")
