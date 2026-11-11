# PAYDAY Flutter migration
Native Flutter/Dart app foundation. The React/Capacitor app, Cloudflare Worker, D1 database and migrations remain untouched until full parity is verified.
Current slice: Flutter auth UI, secure session-cookie persistence, live dashboard and transaction API integration, Material 3 navigation.
Build: cd flutter_app && flutter pub get && flutter analyze && flutter test && flutter build apk --debug
Configure API with --dart-define=PAYDAY_API_URL=https://payday-ap.pages.dev.
Salary cycle remains 24th–23rd. Expected salary is not counted as received balance. Never remove existing production resources during migration.
