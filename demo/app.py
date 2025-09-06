import dash_pdf_highlighter
from dash import Dash, html, dcc, Input, Output, State
import requests
import base64

# Initialize the app with Tailwind CSS
app = Dash(
    __name__,
    external_stylesheets=[
        "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css"
    ],
)
server = app.server

# Default PDF URL
DEFAULT_URL = "https://css4.pub/2015/textbook/somatosensory.pdf"


# Function to load PDF data
def load_pdf(url):
    response = requests.get(url)
    pdf_content = response.content
    pdf_base64 = base64.b64encode(pdf_content).decode("utf-8")
    return f"data:application/pdf;base64,{pdf_base64}"


# App layout
app.layout = html.Div(
    [
        html.H1(
            "Dash PDF",
            className="text-4xl font-bold text-center my-8 text-gray-800",
        ),
        html.Div(
            [
                dcc.Input(
                    id="pdf-url-input",
                    type="text",
                    placeholder="Enter PDF URL",
                    value=DEFAULT_URL,
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                ),
                html.Button(
                    "Load PDF",
                    id="load-pdf-button",
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-md",
                ),
            ],
            className="w-full max-w-md mb-4 flex",
        ),
        html.Div(
            [
                dash_pdf_highlighter.PDF(
                    id="pdf-viewer",
                    data=load_pdf(DEFAULT_URL),
                    buttonClassName="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mx-1",
                    labelClassName="text-gray-800 text-lg mb-2",
                    controlsClassName="flex flex-row items-center justify-center space-x-4",
                    enableAnnotations=True,
                    showAnnotationSidebar=True,
                    annotations=[],
                ),
            ],
            className="bg-white p-8 rounded-xl shadow-xl overflow-hidden",
        ),
        html.Footer(
            html.P(
                [
                    "Made with ",
                    html.Span("❤️", className="text-red-500"),
                    " by ",
                    html.A(
                        "Ploomber",
                        href="https://ploomber.io/?utm_source=dash-pdf&utm_medium=github",
                        target="_blank",
                        rel="noopener noreferrer",
                        className="text-blue-500 hover:text-blue-700 underline",
                    ),
                    " • ",
                    html.Span("⭐ on "),
                    html.A(
                        "GitHub",
                        href="https://github.com/ploomber/dash-pdf/?utm_source=dash-pdf&utm_medium=github",
                        target="_blank",
                        rel="noopener noreferrer",
                        className="text-blue-500 hover:text-blue-700 underline",
                    ),
                ],
                className="text-center text-gray-600 mt-8",
            ),
            className="mt-auto",
        ),
    ],
    className="min-h-screen bg-gradient-to-r from-blue-100 to-green-100 p-6 flex flex-col items-center justify-center",
)


@app.callback(
    Output("pdf-viewer", "data"),
    Input("load-pdf-button", "n_clicks"),
    Input("pdf-url-input", "n_submit"),
    State("pdf-url-input", "value"),
    prevent_initial_call=True,
)
def update_pdf(n_clicks, n_submit, url):
    return load_pdf(url)


@app.callback(
    Output("pdf-viewer", "annotations"),
    Input("pdf-viewer", "annotations"),
    prevent_initial_call=True,
)
def handle_annotation_changes(annotations):
    # Process annotation changes
    # Save to database, etc.
    print("Annotations updated:", annotations)
    return annotations


if __name__ == "__main__":
    app.run(debug=True)
