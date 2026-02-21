# Published Content

A portfolio of educational content published on LinkedIn and YouTube, covering Excel, Power Query, and data analysis.

## Structure

```
published-content/
├── linkedin/           # LinkedIn posts
│   ├── 0001/           # Sequential numbering
│   ├── 0002/
│   └── ...
├── youtube/            # YouTube sessions
│   ├── 20241129/       # Date-based (YYYYMMDD)
│   ├── 20241206/
│   └── ...
├── scripts/            # Index generation script
├── css/                # Website styles
├── js/                 # Website logic + generated data
└── index.html          # Browsable website
```

Each content folder contains:

| File | Purpose |
|---|---|
| `name.txt` | Title of the post or session |
| `url.txt` | URL to the original post or video |
| `tags.txt` | Tags, one per line |
| `Files.zip` | Downloadable materials |

## Tags

| Tag | Description |
|---|---|
| `excel` | Excel formulas, charts, worksheet features |
| `power-query` | Power Query / M code |
| `m-code` | M language functions and techniques |
| `formulas` | Excel formula techniques |
| `charts` | Charts and data visualization |
| `dynamic-arrays` | SEQUENCE, FILTER, SORT, etc. |
| `data-analysis` | General data analysis techniques |
| `data-cleaning` | Data transformation and cleaning |

## Adding New Content

### LinkedIn Post

```bash
mkdir linkedin/0030
echo "Post Title" > linkedin/0030/name.txt
echo "https://linkedin.com/..." > linkedin/0030/url.txt
printf "power-query\nm-code" > linkedin/0030/tags.txt
cp myfile.zip linkedin/0030/Files.zip
```

### YouTube Session

```bash
mkdir youtube/20260221
echo "Session Title" > youtube/20260221/name.txt
echo "https://youtu.be/..." > youtube/20260221/url.txt
printf "excel\ndynamic-arrays" > youtube/20260221/tags.txt
cp myfile.zip youtube/20260221/Files.zip
```

Push to `main` and GitHub Actions will auto-update the website index.

## Website

The `index.html` page provides a filterable, searchable interface for all content. It can be deployed via GitHub Pages.

To regenerate the data index locally:

```bash
python scripts/generate_index.py
```
