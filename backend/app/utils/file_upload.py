"""Deprecated — replaced by app/utils/imagekit.py.

This module used to save uploads to local disk (UPLOAD_DIR), but the app
never mounted a /static route to actually serve them, so uploaded images
were saved but never reachable by URL. Image uploads now go through
ImageKit (see app/utils/imagekit.py), which returns a real CDN URL.

Left as an empty stub rather than deleted since this tool can't delete
files on your machine — safe to remove this file manually.
"""
