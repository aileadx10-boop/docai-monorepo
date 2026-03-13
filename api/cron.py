"""
Vercel Serverless Function — /api/cron
Triggered daily by Vercel Cron (see vercel.json).
Protected by CRON_SECRET so only Vercel can call it.
"""

from http.server import BaseHTTPRequestHandler
import os, json, sys

# Add parent dir so we can import orchestrator
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        # Verify the request is from Vercel Cron
        auth = self.headers.get('authorization', '')
        expected = f"Bearer {os.environ.get('CRON_SECRET', '')}"

        if auth != expected:
            self._respond(401, {'error': 'Unauthorized'})
            return

        try:
            from orchestrator import run
            stats = run()
            self._respond(200, {
                'ok': True,
                'total_raw':   stats['total_raw'],
                'total_clean': stats['total_clean'],
                'emails_sent': stats['emails_sent'],
            })
        except Exception as e:
            self._respond(500, {'error': str(e)})

    def _respond(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # suppress default logging
