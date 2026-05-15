"""Tiny static server that disables caching.

Drop-in replacement for `python -m http.server 8765`. Sends
`Cache-Control: no-store` on every response so the browser never serves stale
JS / CSS during dev. Use:

    python dev_server.py 8765
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with ThreadingHTTPServer(("", port), NoCacheHandler) as srv:
        print(f"dev server on http://localhost:{port}  (no-cache)")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
