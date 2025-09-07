from __future__ import print_function as _

import base64
import json
import os as _os
import sys as _sys

import dash as _dash
import requests

# noinspection PyUnresolvedReferences
from ._imports_ import __all__, _DashPdf

if not hasattr(_dash, "__plotly_dash") and not hasattr(_dash, "development"):
    print(
        "Dash was not successfully imported. "
        "Make sure you don't have a file "
        'named \n"dash.py" in your current directory.',
        file=_sys.stderr,
    )
    _sys.exit(1)

_basepath = _os.path.dirname(__file__)
_filepath = _os.path.abspath(_os.path.join(_basepath, "package-info.json"))
with open(_filepath) as f:
    package = json.load(f)

package_name = package["name"].replace(" ", "_").replace("-", "_")
__version__ = package["version"]

_current_path = _os.path.dirname(_os.path.abspath(__file__))

_this_module = _sys.modules[__name__]

async_resources = []

_js_dist = []

_js_dist.extend(
    [
        {
            "relative_package_path": "async-{}.js".format(async_resource),
            "external_url": ("https://unpkg.com/{0}@{2}/{1}/async-{3}.js").format(
                package_name, __name__, __version__, async_resource
            ),
            "namespace": package_name,
            "async": True,
        }
        for async_resource in async_resources
    ]
)

# TODO: Figure out if unpkg link works
_js_dist.extend(
    [
        {
            "relative_package_path": "async-{}.js.map".format(async_resource),
            "external_url": ("https://unpkg.com/{0}@{2}/{1}/async-{3}.js.map").format(
                package_name, __name__, __version__, async_resource
            ),
            "namespace": package_name,
            "dynamic": True,
        }
        for async_resource in async_resources
    ]
)

_js_dist.extend(
    [
        {
            "relative_package_path": "dash_pdf_plus.min.js",
            "namespace": package_name,
        },
        {
            "relative_package_path": "dash_pdf_plus.min.js.map",
            "namespace": package_name,
            "dynamic": True,
        },
        # add pdf.worker.min.mjs
        {
            "relative_package_path": "pdf.worker.min.mjs",
            "namespace": package_name,
            "dynamic": True,
        },
    ]
)

_css_dist = []


for _component in __all__:
    setattr(locals()[_component], "_js_dist", _js_dist)
    setattr(locals()[_component], "_css_dist", _css_dist)


class DashPDF(_DashPdf):
    def __init__(self, id, data, **kwargs):
        if isinstance(data, str) and (
            data.startswith("http://") or data.startswith("https://")
        ):
            response = requests.get(data)
            pdf_content = response.content
            pdf_base64 = base64.b64encode(pdf_content).decode("utf-8")
            data = f"data:application/pdf;base64,{pdf_base64}"
        elif isinstance(data, bytes):
            data = (
                f"data:application/pdf;base64,{base64.b64encode(data).decode('utf-8')}"
            )
        super().__init__(id=id, data=data, **kwargs)
