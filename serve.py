"""Tiny no-cache static server for dev.

Python's stdlib http.server sets Last-Modified but lets browsers aggressively
cache ES modules via the HTTP cache. That makes iteration painful — edits to
source files don't show up until you close the browser context. This wrapper
adds Cache-Control: no-store on every response so every reload fetches fresh.
"""
import http.server
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with socketserver.TCPServer(("", port), NoCacheHandler) as httpd:
        print(f"serving at http://localhost:{port}/ (no-store)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
