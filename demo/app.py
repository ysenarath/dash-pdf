import dash_pdf_highlighter
from dash import Dash, html, dcc, Input, Output, State
import requests
import base64
import dash

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
            "Dash PDF with Annotation Tools",
            className="text-4xl font-bold text-center my-8 text-gray-800",
        ),
        # PDF URL Input Section
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
            className="w-full max-w-md mb-6 flex",
        ),
        # Annotation Tools Section
        html.Div(
            [
                html.H3(
                    "Annotation Tools",
                    className="text-lg font-semibold mb-3 text-gray-700",
                ),
                html.Div(
                    [
                        html.Button(
                            [html.Span("❌", className="mr-2"), "None"],
                            id="tool-none",
                            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200",
                            **{"data-tool": "none"},
                        ),
                        html.Button(
                            [html.Span("💬", className="mr-2"), "Comment"],
                            id="tool-comment",
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200",
                            **{"data-tool": "comment"},
                        ),
                        html.Button(
                            [html.Span("⬜", className="mr-2"), "Rectangle"],
                            id="tool-rectangle",
                            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200",
                            **{"data-tool": "rectangle"},
                        ),
                        html.Button(
                            [html.Span("🖍️", className="mr-2"), "Highlight"],
                            id="tool-highlight",
                            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200",
                            **{"data-tool": "highlight"},
                        ),
                        # page navigation buttons could be added here
                        html.Button(
                            [html.Span("⬅️", className="mr-2"), "Prev Page"],
                            id="prev-page-button",
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors duration-200",
                        ),
                        html.Button(
                            [html.Span("➡️", className="mr-2"), "Next Page"],
                            id="next-page-button",
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors duration-200",
                        ),
                    ],
                    className="flex flex-wrap gap-2",
                ),
                html.P(
                    id="tool-instructions",
                    className="text-sm text-gray-600 mt-3 italic",
                    children="Click on a tool to activate it. Current tool: Comment - Click anywhere on the PDF to add a comment.",
                ),
            ],
            className="mb-6 p-4 bg-gray-50 rounded-lg",
        ),
        # PDF Viewer Section
        html.Div(
            [
                dash_pdf_highlighter.PDF(
                    id="pdf-viewer",
                    data=load_pdf(DEFAULT_URL),
                    enableAnnotations=True,
                    selectedAnnotationTool="none",
                    annotations=[],
                ),
            ],
            className="bg-white p-8 rounded-xl shadow-xl overflow-hidden",
        ),
        # Footer
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
    [
        Output("pdf-viewer", "selectedAnnotationTool"),
        Output("tool-instructions", "children"),
        Output("tool-comment", "className"),
        Output("tool-rectangle", "className"),
        Output("tool-highlight", "className"),
        Output("tool-none", "className"),
    ],
    [
        Input("tool-comment", "n_clicks"),
        Input("tool-rectangle", "n_clicks"),
        Input("tool-highlight", "n_clicks"),
        Input("tool-none", "n_clicks"),
    ],
    prevent_initial_call=True,
)
def update_annotation_tool(
    comment_clicks, rectangle_clicks, highlight_clicks, none_clicks
):
    ctx = dash.callback_context
    if not ctx.triggered:
        return "none", "", "", "", "", ""

    button_id = ctx.triggered[0]["prop_id"].split(".")[0]

    # Base classes for inactive and active buttons
    inactive_class = "bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
    active_class = "bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 ring-2 ring-yellow-300"

    # Tool instructions
    instructions = {
        "tool-rectangle": "Click on a tool to activate it. Current tool: Rectangle - Click and drag to draw a rectangle annotation.",
        "tool-comment": "Click on a tool to activate it. Current tool: Text - Click and drag to add a text annotation.",
        "tool-highlight": "Click on a tool to activate it. Current tool: Highlight - Select text on the PDF to highlight it.",
        "tool-none": "Click on a tool to activate it. Current tool: None - No annotation tool is active.",
    }

    # Tool mapping
    tool_mapping = {
        "tool-comment": "comment",
        "tool-rectangle": "rectangle",
        "tool-highlight": "highlight",
        "tool-none": "none",
    }

    selected_tool = tool_mapping.get(button_id, "comment")

    return (
        selected_tool,
        instructions.get(button_id, instructions["tool-comment"]),
        active_class if button_id == "tool-comment" else inactive_class,
        active_class if button_id == "tool-rectangle" else inactive_class,
        active_class if button_id == "tool-highlight" else inactive_class,
        active_class if button_id == "tool-none" else inactive_class,
    )


@app.callback(
    Output("pdf-viewer", "annotations"),
    Input("pdf-viewer", "annotations"),
    prevent_initial_call=True,
)
def handle_annotation_changes(annotations):
    """
    Process annotation changes - you can save to database,
    send to API, or perform any other processing here.
    """
    if annotations:
        print(f"Annotations updated: {len(annotations)} total annotations")
        for i, annotation in enumerate(annotations):
            print(
                f"  {i + 1}. {annotation.get('type', 'unknown')} on page {annotation.get('page', '?')}"
            )
    else:
        print("No annotations")

    return annotations


# increment or decrement page number
@app.callback(
    Output("pdf-viewer", "pageNumber"),
    Input("prev-page-button", "n_clicks"),
    Input("next-page-button", "n_clicks"),
    State("pdf-viewer", "pageNumber"),
    State("pdf-viewer", "numPages"),
    prevent_initial_call=True,
)
def change_page(prev_clicks, next_clicks, current_page, num_pages):
    ctx = dash.callback_context
    if not ctx.triggered:
        return current_page
    button_id = ctx.triggered[0]["prop_id"].split(".")[0]
    if button_id == "prev-page-button" and current_page > 1:
        return current_page - 1
    elif button_id == "next-page-button" and current_page < num_pages:
        return current_page + 1
    return current_page


if __name__ == "__main__":
    app.run(debug=True)
