"""Local preview server that mimics Netlify pretty URLs (/vault -> vault.html) and the 404 page.
Not used in production. Usage: python3 tools/serve.py 8080"""
import http.server, os, sys
class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        p = self.path.split('?', 1)[0]
        if p != '/' and '.' not in os.path.basename(p) and os.path.exists('.' + p + '.html'):
            self.path = p + '.html' + (self.path[len(p):])
        if not os.path.exists(self.translate_path(self.path)):
            self.send_response(404); self.send_header('Content-Type', 'text/html'); self.end_headers()
            self.wfile.write(open('404.html', 'rb').read()) if self.command == 'GET' else None
            return None
        return super().send_head()
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 8080), H).serve_forever()
