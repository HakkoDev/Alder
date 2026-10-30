# Alder localization framework

Alder uses stable translation keys in `src/lib/i18n/en.ts`, a `t(key, params)` interpolation function, and the `useTranslation()` hook for reactive UI updates. Current available language: English. Settings exposes System default and English, persisted as `alder.locale`. Until other locales ship, System defaults to English.

## Adding a language
1. Duplicate `en.ts` as `de.ts` (or your BCP 47 tag); translate **values**, not keys.
2. Extend `Locale`, register the catalog and language label, and use English fallbacks for any missing keys.
3. Expand the Settings language list and validate placeholders such as `{line}` against English.
4. Use `t("section.key")` for new UI strings. New strings should be extracted gradually; this release extracts the primary navigation, change sort/staging controls and language preferences, **not every screen yet**.
5. Test plural rules and formatting with `Intl.PluralRules`, `Intl.DateTimeFormat`, and `Intl.NumberFormat` when moving dynamic messages into translation catalogs. Never concatenate sentence fragments for translations.

No network requests are required to switch languages. The theme preference store is untouched.
