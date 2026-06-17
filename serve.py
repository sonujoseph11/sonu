import os
import sys
import socket
import threading
import webbrowser
import subprocess
import time
from http.server import SimpleHTTPRequestHandler, HTTPServer
try:
    from http.server import ThreadingHTTPServer
except ImportError:
    import socketserver
    class ThreadingHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
        daemon_threads = True


PORT = 8000

def get_local_ips():
    ips = []
    # 1. Primary method via socket connection check
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        primary = s.getsockname()[0]
        if not primary.startswith("127."):
            ips.append(primary)
        s.close()
    except Exception:
        pass
    
    # 2. Backup method resolving hostname list
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
        
    if not ips:
        ips.append('127.0.0.1')
        
    return ips

def open_in_chrome(url):
    print(f"Opening {url} in Google Chrome...")
    chrome_opened = False
    
    # 1. Try registering chrome using webbrowser module
    try:
        for name in ['chrome', 'google-chrome', 'windows-default']:
            try:
                browser = webbrowser.get(name)
                browser.open(url)
                chrome_opened = True
                break
            except webbrowser.Error:
                continue
    except Exception:
        pass

    # 2. Try common Windows paths for Chrome if webbrowser failed
    if not chrome_opened and sys.platform == 'win32':
        chrome_paths = [
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
        ]
        for path in chrome_paths:
            if os.path.exists(path):
                try:
                    subprocess.Popen([path, url])
                    chrome_opened = True
                    break
                except Exception:
                    continue

    # 3. Fallback to default browser
    if not chrome_opened:
        print("Could not find Google Chrome specifically. Opening in default browser...")
        webbrowser.open(url)

def generate_qr_code(text):
    print("\n" + "=" * 40)
    print("        MOBILE PHONE ACCESS")
    print("=" * 40)
    try:
        import qrcode
        qr = qrcode.QRCode(version=1, box_size=1, border=1)
        qr.add_data(text)
        qr.make(fit=True)
        print("Scan this QR code with your mobile phone camera to open the website:")
        try:
            # Reconfigure stdout to support Unicode block characters on Windows
            if hasattr(sys.stdout, 'reconfigure'):
                try:
                    sys.stdout.reconfigure(encoding='utf-8')
                except Exception:
                    pass
            qr.print_tty()
        except Exception:
            # Fallback to manual block drawing
            matrix = qr.modules
            for row in matrix:
                line = ""
                for cell in row:
                    line += "██" if cell else "  "
                try:
                    print(line)
                except UnicodeEncodeError:
                    # Absolute fallback to ASCII characters if terminal encoding doesn't support blocks
                    line = ""
                    for cell in row:
                        line += "##" if cell else "  "
                    print(line)
    except ImportError:
        print("To show a QR code directly in the terminal, install 'qrcode':")
        print("  pip install qrcode pillow")
        print("\nAlternatively, scan the QR code by opening this link in your browser:")
        # Generate a Google Chart API or QR Server API link for QR code
        qr_api_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={text}"
        print(f"  {qr_api_url}")
        print("\nOpening the QR code image in your browser now...")
        webbrowser.open(qr_api_url)

def start_server():
    # Make sure we serve the folder where serve.py is located
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    handler = SimpleHTTPRequestHandler
    # Disable verbose logging to keep terminal output clean
    handler.log_message = lambda self, format, *args: None
    
    # Try binding to port 8000, if not find an available one
    port = PORT
    server = None
    while port < 8080:
        try:
            server = ThreadingHTTPServer(('0.0.0.0', port), handler)
            break
        except OSError:
            port += 1

    if not server:
        print("Error: Could not bind to any port from 8000 to 8080.")
        sys.exit(1)

    local_ips = get_local_ips()
    local_url = f"http://localhost:{port}"
    mobile_urls = [f"http://{ip}:{port}" for ip in local_ips]

    print("=" * 60)
    print(f"Server started successfully!")
    print(f"Local URL (PC):      {local_url}")
    print("Mobile URLs (Phone):")
    for m_url in mobile_urls:
        print(f"  -> {m_url}")
    print("=" * 60)

    # Start server in a background thread so we can open browsers in main thread
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    # Open local URL in Google Chrome
    open_in_chrome(local_url)

    # Generate QR Code for the primary Mobile IP address
    generate_qr_code(mobile_urls[0])

    print("\nPress Ctrl+C to stop the server.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.shutdown()
        print("Server stopped.")

if __name__ == "__main__":
    start_server()
