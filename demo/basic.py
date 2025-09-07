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
