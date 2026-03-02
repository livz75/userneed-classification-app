"""
Proxy Franceinfo API — déployé sur Vercel en région cdg1 (Paris)
pour contourner la géo-restriction de l'API Franceinfo.
"""
from http.server import BaseHTTPRequestHandler
import json
import urllib.request
from urllib.parse import urlparse, parse_qs


FRANCEINFO_BASE = "https://api-front.publish.franceinfo.francetvinfo.fr"

HEADERS = {
    "Accept": "application/ld+json",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://www.francetvinfo.fr/",
    "Origin": "https://www.francetvinfo.fr",
}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        # Récupérer le chemin API à proxifier
        api_path = params.get("path", [None])[0]
        if not api_path:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing 'path' parameter"}).encode())
            return

        url = f"{FRANCEINFO_BASE}{api_path}"

        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"Franceinfo API error: {str(e)}"
            }).encode())
