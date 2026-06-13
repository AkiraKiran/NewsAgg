# Task: Build a Full Footer for NewsAgg

## Context

NewsAgg is a news aggregation platform. React 18 + Vite + Tailwind v4. X-style three-column layout: `NavRail` (left) → `<main>` (centre) → `RightRail` (right), managed by `client/src/app/components/shell/AppShell.tsx`. Current "footer" is a single copyright line inside `RightRail.tsx`:

```tsx
<p className="text-[11px] ...">© {new Date().getFullYear()} NewsAgg · CNN · BBC · Al Jazeera · Yahoo TW</p>
```

Replace it with a proper full-width `<Footer />` component.

---

## Requirements

### 1. Create `client/src/app/components/shell/Footer.tsx`

Place the footer **inside `<main>`** in `AppShell.tsx`, below `{children}`, so it spans the centre column on desktop and goes full-width on mobile. Remove the old copyright line from `RightRail.tsx`.

### 2. Footer Sections (responsive grid: 1 col mobile → 4 col desktop)

**Column 1 — Brand**
- NewsAgg logo: bold gradient "N" box (matches NavRail logo: `w-9 h-9 rounded-xl`, `background: var(--brand-grad)`) + "NewsAgg" text in `font-poppins font-bold`.
- Tagline underneath: "AI-Powered News Intelligence" in muted text.
- Wrap logo in a `<Link to="/">`.

**Column 2 — Navigate**
- Links: Home (`/`), Bookmarks (`/bookmarks`), Posts (`/posts` — conditionally render using `POSTS_ENABLED` from `client/src/app/constants/index.ts`).
- Use `<Link>` from `react-router`.

**Column 3 — Sources**
- External links (open in new tab) to each news source:
  - CNN → `https://www.cnn.com`
  - BBC → `https://www.bbc.com`
  - Al Jazeera → `https://www.aljazeera.com`
  - Yahoo TW → `https://tw.news.yahoo.com`
- Each link gets `target="_blank"` and `rel="noopener noreferrer"`.

**Column 4 — Legal & Info**
- Static text links (can be `<span>` or placeholder `#` hrefs for now): Terms of Service, Privacy Policy.
- "Powered by NLP Sentiment Analysis" badge/label styled with a subtle cyan accent.

**Bottom Bar (full width, below the grid)**
- `© {new Date().getFullYear()} NewsAgg. All rights reserved.`
- Thin top border separator.

### 3. Styling Rules

- Use existing design tokens from `client/src/styles/tokens.css`:
  - `--brand-grad` for gradient accents.
  - `--brand` (`#06b6d4`) for cyan highlights.
  - `--surface`, `--surface-alt`, `--border`, `--text-primary`, `--text-secondary` for dark/light theming.
- Consume `isDark` from `useApp()` (`client/src/app/contexts/AppContext.tsx`) for dark mode classes — follow the same `isDark ? 'dark-class' : 'light-class'` pattern used everywhere else.
- Font: section headings use `font-poppins font-semibold`, body uses the default `font-sans` (Inter).
- Keep padding/spacing consistent with the rest of the shell (`px-4 md:px-6`).
- Add `pb-16 md:pb-0` awareness — mobile has `BottomTabBar` fixed at the bottom, so the footer needs enough bottom margin to not be occluded (the `<main>` already has `pb-16 md:pb-0`, so this should be fine, but verify).

### 4. i18n

- Add **all** new user-facing strings to `client/src/app/i18n/translations.ts` across all 4 languages (`en`, `id`, `zhCN`, `zhTW`):
  - `footerTagline`, `navigate`, `termsOfService`, `privacyPolicy`, `poweredByNLP`, `allRightsReserved`, `newsSources`.
- Add the new keys to the `Translations` interface at the top of the file.
- Use `t.keyName` in the component, not hardcoded English strings.

### 5. Integration

- Import and render `<Footer />` inside `AppShell.tsx`, after `{children}` and before the closing `</main>` tag.
- Remove the old `© ... NewsAgg · CNN · BBC ...` line from `RightRail.tsx`.
- Ensure the footer does **not** render on the article page (where `handle.hideRightRail` and `handle.wide` are both true). Add a `handle.hideFooter` flag to the article route if needed, or simply gate it the same way RightRail is gated.

### 6. Do NOT

- Do not create a new CSS file — use Tailwind utility classes only.
- Do not add any new npm dependencies.
- Do not rename `--accent` or conflict with shadcn's `theme.css` tokens.
- Do not use `localStorage` or `sessionStorage`.
- Do not break existing responsive behaviour (NavRail hidden on mobile, BottomTabBar hidden on desktop).
