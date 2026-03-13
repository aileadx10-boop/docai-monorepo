import os
import json
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        auth = self.headers.get('authorization', '')
        expected = f"Bearer {os.environ.get('CRON_SECRET', '')}"

        if auth != expected:
            self._send(401, {'error': 'Unauthorized'})
            return

        try:
            from orchestrator import run
            stats = run()
            self._send(200, {
                'ok': True,
                'total_raw':   stats.get('total_raw', 0),
                'total_clean': stats.get('total_clean', 0),
                'emails_sent': stats.get('emails_sent', 0),
            })
        except Exception as e:
            self._send(500, {'error': str(e)})

    def _send(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
