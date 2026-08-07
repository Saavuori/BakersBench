"""Tiny static server for local development.

Identical to `python -m http.server` except it tells the browser never to cache.
Without that, editing styles.css or js/*.js and reloading keeps serving the old
file, which makes it look like your change did nothing.

    python serve.py [port]
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Keep the console readable — only complain about failures.
        if not args or not str(args[0]).startswith(('GET', 'HEAD')):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
    handler = partial(NoCacheHandler, directory='.')
    print('Baker\'s Bench on http://localhost:%d  (no-cache)' % port)
    ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
