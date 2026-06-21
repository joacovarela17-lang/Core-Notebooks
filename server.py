import http.server
import json
import os
import subprocess
import urllib.parse
import re

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        url_path = urllib.parse.urlparse(self.path).path
        
        if url_path == '/api/save-catalog':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                catalog_data = json.loads(post_data.decode('utf-8'))
                
                catalog_path = os.path.join(os.getcwd(), 'catalog.json')
                with open(catalog_path, 'w', encoding='utf-8') as f:
                    json.dump(catalog_data, f, indent=4, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                
        elif url_path == '/api/upload-image':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            content_type = self.headers.get('Content-Type', '')
            boundary_str = ''
            for part in content_type.split(';'):
                if 'boundary=' in part:
                    boundary_str = part.split('boundary=')[1].strip()
            
            if not boundary_str:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No boundary found in Content-Type"}).encode('utf-8'))
                return
                
            boundary = b'--' + boundary_str.encode('utf-8')
            filename, file_data = self.parse_multipart(post_data, boundary)
            
            if filename and file_data:
                assets_dir = os.path.join(os.getcwd(), 'assets')
                os.makedirs(assets_dir, exist_ok=True)
                
                _, ext = os.path.splitext(filename)
                safe_filename = "".join([c for c in filename if c.isalnum() or c in ['.', '_', '-']]).strip()
                if not safe_filename:
                    import uuid
                    safe_filename = f"upload_{uuid.uuid4().hex}{ext}"
                
                target_path = os.path.join(assets_dir, safe_filename)
                with open(target_path, 'wb') as f:
                    f.write(file_data)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"image_path": f"assets/{safe_filename}"}).encode('utf-8'))
            else:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Failed to parse uploaded image"}).encode('utf-8'))
                
        elif url_path == '/api/export-excel':
            try:
                result = subprocess.run(['python', 'scrape_to_excel.py'], capture_output=True, text=True, check=True)
                print("Excel export output:", result.stdout)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not Found"}).encode('utf-8'))

    def parse_multipart(self, body_bytes, boundary):
        parts = body_bytes.split(boundary)
        for part in parts:
            if b'filename="' in part:
                header_end = part.find(b'\r\n\r\n')
                if header_end == -1:
                    continue
                headers_part = part[:header_end]
                body_part = part[header_end+4:]
                
                if body_part.endswith(b'\r\n'):
                    body_part = body_part[:-2]
                elif body_part.endswith(b'\r\n--'):
                    body_part = body_part[:-4]
                
                filename_match = re.search(rb'filename="([^"]+)"', headers_part)
                if filename_match:
                    filename = filename_match.group(1).decode('utf-8', errors='ignore')
                    filename = os.path.basename(filename)
                    return filename, body_part
        return None, None

if __name__ == '__main__':
    import socketserver
    PORT = 8000
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Serving Core Notebooks CMS API on http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
