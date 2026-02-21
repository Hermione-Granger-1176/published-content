# Maintenance Guide

This document is for **"Future Me"** (and anyone else contributing) to remember how this repository works and how to manage the content.

## Project Structure

```
published-content/
├── linkedin/                # LinkedIn posts
│   ├── 0001/                # Sequential 4-digit numbering
│   │   ├── name.txt         # Post title
│   │   ├── url.txt          # LinkedIn post URL
│   │   ├── tags.txt         # Tags, one per line
│   │   └── Files.zip        # Practice files
│   ├── 0002/
│   └── ...
├── youtube/                 # YouTube sessions
│   ├── 20241129/            # Date-based naming (YYYYMMDD)
│   │   ├── name.txt         # Session title
│   │   ├── url.txt          # YouTube video URL
│   │   ├── tags.txt         # Tags, one per line
│   │   └── Files.zip        # Session files
│   └── ...
├── scripts/
│   └── generate_index.py    # Scans folders, generates js/data.js + README auto sections
├── css/
│   └── style.css            # Website styles (dark/light theme)
├── js/
│   ├── app.js               # Website logic (filters, search, pagination)
│   └── data.js              # Auto-generated content index (DO NOT edit manually)
├── .github/
│   └── workflows/
│       └── update.yml       # GitHub Action that auto-generates data + README stats
├── index.html               # Main website entry point
├── README.md                # Profile page
├── MAINTENANCE.md           # This file
└── .gitignore
```

## How to Add a New LinkedIn Post

You don't need to touch any code. Just follow this process:

1. **Find the next number.** Check the last folder in `linkedin/` and increment by 1 (e.g., if `0029` exists, create `0030`).

2. **Create the folder and files:**

    ```bash
    mkdir linkedin/0030
    ```

3. **Add the required files:**

    - **`name.txt`** (Required): The post title, on a single line.

        ```text
        How to Build a Financial Dashboard in Excel
        ```

    - **`url.txt`** (Required): The LinkedIn post URL.

        ```text
        https://www.linkedin.com/posts/aditya-darak_example-post-id
        ```

        If the post isn't published yet, use a placeholder:

        ```text
        TODO: Add LinkedIn post URL
        ```

    - **`tags.txt`** (Required): One tag per line. Use existing tags from the vocabulary below.

        ```text
        excel
        charts
        data-analysis
        ```

    - **`Files.zip`** (Required): Zip your practice file(s) and place them here.

4. **Push to GitHub:**

    ```bash
    git add linkedin/0030
    git commit -m "Add post 0030: How to Build a Financial Dashboard in Excel"
    git push
    ```

    The GitHub Action will auto-update `js/data.js`, README stats, and the website.

## How to Add a New YouTube Session

1. **Determine the date.** Use the session date in `YYYYMMDD` format (e.g., `20260221` for Feb 21, 2026).

2. **Create the folder and files:**

    ```bash
    mkdir youtube/20260221
    ```

3. **Add the same set of files** as LinkedIn (name.txt, url.txt, tags.txt, Files.zip), but with the YouTube video URL:

    ```text
    # url.txt
    https://youtu.be/your-video-id
    ```

4. **Push to GitHub** (same as above).

## Tag Vocabulary

Use these standardized tags. A post can have multiple tags.

| Tag | When to Use |
|-----|-------------|
| `excel` | Excel formulas, charts, worksheet features, general Excel topics |
| `power-query` | Power Query Editor, data transformations, loading data |
| `m-code` | M language functions, custom functions, advanced PQ techniques |
| `formulas` | Excel formula techniques (VLOOKUP, INDEX-MATCH, LAMBDA, etc.) |
| `charts` | Charts, graphs, data visualization in Excel |
| `dynamic-arrays` | SEQUENCE, FILTER, SORT, UNIQUE, XLOOKUP, spill ranges |
| `data-analysis` | General analysis techniques, financial analysis, statistics |
| `data-cleaning` | Cleaning, transforming, reshaping messy data |

### Adding New Tags

If you need a new tag (e.g., `python`, `ai`, `power-bi`, `dax`):

1. Just use it in `tags.txt` - the website picks up new tags automatically.
2. Update this table for reference.

No code changes or restructuring needed.

## How the Automation Works

### GitHub Action (`.github/workflows/update.yml`)

Triggered on every push to `main` (any file) and on manual dispatch.

What it does:
1. Checks out the repo
2. Runs `python scripts/generate_index.py`
3. Commits updated `js/data.js` and `README.md` if they changed
4. Pushes the commit
5. Deploys the site to GitHub Pages

### The Generate Script (`scripts/generate_index.py`)

- Scans all folders in `linkedin/` and `youtube/`
- Reads `name.txt`, `url.txt`, `tags.txt` from each
- Checks for `Files.zip` existence
- Outputs `js/data.js` with a `window.CONTENT_DATA` array
- Updates README auto-markers for platform totals, total badge/count, and topic badges
- Skips folders without `name.txt`
- Skips `url.txt` values that start with `TODO`

## Local Testing

To preview changes before pushing:

1. Add your folder and files.
2. Run the script:

    ```bash
    python scripts/generate_index.py
    ```

3. Open `index.html` in your browser (or use a local server):

    ```bash
    python -m http.server 8000
    ```

4. Visit `http://localhost:8000` to verify.

## Website Features

- **Platform filter**: All / LinkedIn / YouTube
- **Tag filter**: Dynamically generated from content
- **Search**: Matches titles, tags, and IDs
- **Sort**: Newest / Oldest
- **Pagination**: 12 items per page
- **URL sync**: All filters are stored in URL query params (`?page=2&platform=linkedin&tag=power-query&sort=newest&q=trim`) - shareable and browser back/forward works
- **Dark/Light theme**: Toggle in the header, preference saved in localStorage

## Customization Notes

- **Colors**: Defined in `:root` of `css/style.css`. The accent color is `--color-bright-amber` (#ffd100).
- **Items per page**: Change `ITEMS_PER_PAGE` in `js/app.js` (currently 12).
- **Logo/Avatar**: The header avatar links to the GitHub profile image. Update the `src` in `index.html` if needed.
- **Site title**: Update in `index.html` `<title>` tag and the `.logo` text.

## Deploying to GitHub Pages

GitHub Pages is deployed automatically by the GitHub Actions workflow on every push to `main`. The source is set to **GitHub Actions** (not branch-based).

No manual deployment steps are needed. The site is live at `https://hermione-granger-1176.github.io/published-content/`
