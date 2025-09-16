import base64
import json

import dash
import requests
from dash import Dash, Input, Output, State, html
import dash_bootstrap_components as dbc

import dash_pdf_plus

# Initialize the app with Bootstrap CSS
app = Dash(
    __name__,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
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
        # Left panel - Controls
        html.Div(
            [
                # PDF URL Input Section
                dbc.Card(
                    dbc.CardBody(
                        [
                            html.H5("Load PDF", className="card-title mb-3"),
                            dbc.InputGroup(
                                [
                                    dbc.Input(
                                        id="pdf-url-input",
                                        type="text",
                                        placeholder="Enter PDF URL",
                                        value=DEFAULT_URL,
                                    ),
                                    dbc.Button(
                                        "Load",
                                        id="load-pdf-button",
                                        color="primary",
                                        className="fw-bold",
                                    ),
                                ],
                            ),
                        ]
                    ),
                    className="mb-3",
                ),
                # Annotation Tools Section
                dbc.Card(
                    dbc.CardBody(
                        [
                            html.H5("Annotation Tools", className="card-title mb-3"),
                            html.Div(
                                [
                                    # Annotation Tools Group
                                    dbc.ButtonGroup(
                                        [
                                            dbc.Button(
                                                "❌",
                                                id="tool-none",
                                                color="secondary",
                                                outline=True,
                                                className="fw-medium",
                                            ),
                                            dbc.Button(
                                                "💬",
                                                id="tool-comment",
                                                color="warning",
                                                outline=True,
                                                className="fw-medium",
                                            ),
                                            dbc.Button(
                                                "⬜",
                                                id="tool-rectangle",
                                                color="secondary",
                                                outline=True,
                                                className="fw-medium",
                                            ),
                                            dbc.Button(
                                                "🖍️",
                                                id="tool-highlight",
                                                color="secondary",
                                                outline=True,
                                                className="fw-medium",
                                            ),
                                        ],
                                        className="mb-3 d-flex flex-wrap",
                                    ),
                                    # Navigation Tools Group
                                    dbc.ButtonGroup(
                                        [
                                            dbc.Button(
                                                "⬅️",
                                                id="prev-page-button",
                                                color="primary",
                                                outline=True,
                                                className="fw-medium",
                                            ),
                                            dbc.Button(
                                                "➡️",
                                                id="next-page-button",
                                                color="primary",
                                                outline=True,
                                                className="fw-medium",
                                            ),
                                        ],
                                        className="mb-3",
                                    ),
                                    # Scaling
                                    dbc.ButtonGroup(
                                        [
                                            dbc.Button(
                                                "➖",
                                                id="zoom-out-button",
                                                color="info",
                                                outline=True,
                                                className="fw-medium",
                                            ),
                                            dbc.Button(
                                                "➕",
                                                id="zoom-in-button",
                                                color="info",
                                                outline=True,
                                                className="fw-medium",
                                            ),
                                        ],
                                        className="mb-3 ms-3",
                                    ),
                                    html.P(
                                        id="tool-instructions",
                                        className="small text-muted fst-italic",
                                        children="Click on a tool to activate it. Current tool: Comment - Click anywhere on the PDF to add a comment.",
                                    ),
                                ]
                            ),
                        ]
                    ),
                ),
                # Footer
                html.Footer(
                    html.P(
                        [
                            "Made with ",
                            html.Span("❤️", className="text-danger"),
                            " by ",
                            html.A(
                                "Yasas",
                                href="https://ysenarath.com",
                                target="_blank",
                                rel="noopener noreferrer",
                                className="text-primary text-decoration-none",
                            ),
                            " • ",
                            html.Span("⭐ on "),
                            html.A(
                                "GitHub",
                                href="https://github.com/ysenarath/dash-pdf",
                                target="_blank",
                                rel="noopener noreferrer",
                                className="text-primary text-decoration-none",
                            ),
                            " • ",
                            html.Span("Inspired by "),
                            html.A(
                                "dash-pdf by ploomber",
                                href="https://github.com/ploomber/dash-pdf",
                                target="_blank",
                                rel="noopener noreferrer",
                                className="text-primary text-decoration-none",
                            ),
                        ],
                        className="text-center text-muted mt-4 small",
                    ),
                ),
            ],
            className="p-3",
            style={
                "width": "350px",
                "height": "100%",
                "overflowY": "auto",
                "backgroundColor": "#f8f9fa",
                "borderRight": "3px solid #dee2e6",
                "resize": "horizontal",
                "minWidth": "300px",
                "maxWidth": "500px",
            },
        ),
        # Right panel - PDF Viewer
        html.Div(
            dbc.Card(
                dbc.CardBody(
                    dash_pdf_plus.DashPDF(
                        id="pdf-viewer",
                        data=load_pdf(DEFAULT_URL),
                        enable_annotations=True,
                        selected_annotation_tool="none",
                        annotations=[],
                    ),
                    className="p-2",
                ),
                className="h-100 shadow-lg border-0",
            ),
            style={
                "flex": "1",
                "height": "100%",
                "overflow": "hidden",
                "padding": "10px",
            },
        ),
    ],
    style={
        "display": "flex",
        "height": "100vh",
    },
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
        Output("pdf-viewer", "selected_annotation_tool"),
        Output("tool-instructions", "children"),
        Output("tool-comment", "outline"),
        Output("tool-rectangle", "outline"),
        Output("tool-highlight", "outline"),
        Output("tool-none", "outline"),
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
        return "none", "", True, True, True, False

    button_id = ctx.triggered[0]["prop_id"].split(".")[0]

    # Tool instructions
    instructions = {
        "tool-rectangle": "Click on a tool to activate it. Current tool: Rectangle - Click and drag to draw a rectangle annotation.",
        "tool-comment": "Click on a tool to activate it. Current tool: Comment - Double-click anywhere on the PDF to add a comment.",
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
        False if button_id == "tool-comment" else True,  # comment outline
        False if button_id == "tool-rectangle" else True,  # rectangle outline
        False if button_id == "tool-highlight" else True,  # highlight outline
        False if button_id == "tool-none" else True,  # none outline
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
                json.dumps(annotation, indent=2),
            )
    else:
        print("No annotations")

    return annotations


# increment or decrement page number
@app.callback(
    Output("pdf-viewer", "page_number"),
    Input("prev-page-button", "n_clicks"),
    Input("next-page-button", "n_clicks"),
    State("pdf-viewer", "page_number"),
    State("pdf-viewer", "num_pages"),
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


@app.callback(
    Output("pdf-viewer", "scale"),
    Input("zoom-in-button", "n_clicks"),
    Input("zoom-out-button", "n_clicks"),
    State("pdf-viewer", "scale"),
    prevent_initial_call=True,
)
def change_scale(zoom_in_clicks, zoom_out_clicks, current_scale):
    ctx = dash.callback_context
    if not current_scale:
        current_scale = 1.0
    if not ctx.triggered:
        return current_scale
    button_id = ctx.triggered[0]["prop_id"].split(".")[0]
    if button_id == "zoom-in-button":
        return current_scale + 0.1
    elif button_id == "zoom-out-button" and current_scale > 0.2:
        return current_scale - 0.1
    return current_scale


if __name__ == "__main__":
    app.run(port=8060, debug=True)
