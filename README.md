# New HSK 3.0 Study Companion

A fully localized Vietnamese study platform for the **New HSK Course 3.0** textbooks (Levels 1–4) — vocabulary, grammar, dialogues, audio, and practice tools, all built directly from the official course books.

🔗 Live course content covers **HSK 1–4**, with Vietnamese translations, native audio, and book-accurate illustrations for every lesson.

## Features

- **Complete lesson content per level** — vocabulary lists, grammar points with worked examples, and full lesson dialogues/passages, translated into Vietnamese.
- **Native audio playback** — dialogue and new-word audio clips for every lesson, sourced from the official course material.
- **Book-accurate illustrations** — each lesson text is paired with its corresponding photo from the textbook, laid out side-by-side with the dialogue just like the printed page.
- **Inline new-word highlighting** — vocabulary introduced in a lesson is automatically highlighted in red wherever it appears in that lesson's dialogues.
- **Interactive flashcards** — review vocabulary by lesson, by level, or by "not yet known" words, in either Hanzi→meaning or meaning→Hanzi mode.
- **Hanzi stroke-order practice** — animated stroke order and guided handwriting quiz for any word, powered by HanziWriter.
- **Global search** — instantly filter vocabulary across a level by Hanzi, pinyin, or Vietnamese meaning.
- **Known-word tracking** — mark words as learned; progress is saved locally per level.
- **Daily streak tracker** — an animated flame badge that tracks consecutive days of study, shared across all levels.
- **Per-level visual themes** — each level's color palette is drawn from its own textbook cover.
- **Responsive, mobile-friendly UI** — works as a single-page app with hash-based routing, no build step required.

## Project Structure

```
├── index.html          # Level picker (landing page)
├── style.css            # Shared site-wide styles
├── app.js                # Shared app logic (routing, flashcards, stroke practice, search, text rendering)
├── streak.js            # Daily streak tracker (shared across all pages)
├── hsk1/ … hsk4/
│   ├── index.html        # Level-specific shell (loads data.js + app.js)
│   ├── data.js            # Lessons: vocabulary, grammar, dialogues/passages, audio refs
│   └── theme.css          # Level-specific color palette
├── Audio/HSK1/ … HSK4/   # Per-lesson dialogue & vocabulary audio clips
└── assets/
    ├── covers/            # Textbook cover art (used as level icons/theming source)
    ├── avatars/            # Recurring character portraits used in dialogues
    ├── texts/HSK1/ … HSK4/ # Cropped lesson illustrations, matched to each dialogue/passage
    ├── icons/               # Favicons
    └── vendor/               # Third-party libraries (HanziWriter)
```

## Running Locally

This is a static site with no build step or dependencies — just serve the directory with any static file server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Tech Stack

Vanilla HTML, CSS, and JavaScript (no framework, no bundler). Stroke-order rendering is powered by [HanziWriter](https://hanziwriter.org/).
