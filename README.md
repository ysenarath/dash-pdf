<p align="center">
    <h1 align="center"><b>Dash PDF Plus</b></h1>
	<p align="center">
		Display and annotate PDFs in your Dash apps with enhanced features.
  </p>
</p>

<br/>

## Features

-   **PDF Display**: Render PDF documents directly in your Dash applications
-   **Interactive Annotations**: Add comments, highlights, and rectangle annotations
-   **Navigation Controls**: Navigate through PDF pages with built-in controls
-   **URL Loading**: Load PDFs from URLs or local files
-   **Customizable UI**: Customize button and control styling

## Installation

```sh
pip install dash-pdf-plus
```

## Usage

### Basic PDF Display

```python
import requests
from dash import Dash, html

import dash_pdf_plus

app = Dash(__name__)

# Download the PDF and read it as bytes
url = "https://css4.pub/2015/textbook/somatosensory.pdf"
response = requests.get(url)
pdf_bytes = response.content

# Alternatively, you can read a local PDF file
# pdf_bytes = Path('path/to/local/file.pdf').read_bytes()

app.layout = html.Div(
    [
        dash_pdf_plus.DashPDF(
            id="pdf-viewer",
            data=pdf_bytes,
            enableAnnotations=True,
            selectedAnnotationTool="none",
            annotations=[],
        ),
    ]
)

if __name__ == "__main__":
    app.run(debug=True)
```

### Advanced Usage with Annotations

The demo application (`demo/app.py`) showcases advanced features including:

-   **Annotation Tools**: Comment, rectangle, and highlight tools
-   **Interactive Controls**: Load PDFs from URLs, navigate pages
-   **Real-time Updates**: Handle annotation changes with callbacks
-   **Responsive Design**: Bootstrap-based UI with resizable panels

Key features demonstrated:

-   PDF loading from URLs
-   Annotation tool selection (comment, rectangle, highlight, none)
-   Page navigation controls
-   Annotation change handling
-   Responsive layout with control panel

## Run Demo Locally

```sh
cd demo
uv venv
uv pip install -r requirements.txt
uv run app.py
```

Open: http://localhost:8050

## Development Setup

```sh
# Install JavaScript dependencies
npm install

# Install Python package in editable mode
uv venv
uv pip install -e .

# Install other Python dependencies
uv pip install -r requirements.txt
uv pip install -r tests/requirements.txt
```

## Development Workflow

```sh
# Build the component
npm run build

# Run the demo
uv run demo/app.py
```

## Release Process

```sh
# Generate distribution files
rm -rf dist
npm run build
uv build

# Test the artifact
uv pip install dash dist/dash_pdf_plus-0.0.3.tar.gz
uv run demo/app.py

# Upload to PyPI
# uv pip install twine
# twine upload dist/*

# Or with UV
uv publish

# Clean up
rm -rf dist
```

## Credits

This project is derived from the original [dash-pdf](https://github.com/ploomber/dash-pdf) implementation by [Ploomber Inc.](https://ploomber.io/). We extend our gratitude to the original authors for their foundational work that made this enhanced version possible.

## License

See [LICENSE](LICENSE) file for details.
