# Cloudflare Origin CA Certificates Directory

Place your Cloudflare Origin CA Certificate and Private Key here for production deployment:

1. `origin.crt` — Cloudflare Origin Certificate (PEM format)
2. `origin.key` — Cloudflare Private Key (PEM format)

### How to generate (Free, 15-year validity from Cloudflare):
1. Open your domain in Cloudflare Dashboard.
2. Navigate to **SSL/TLS** → **Origin Server**.
3. Click **Create Certificate**.
4. Keep the default settings (RSA 2048, Hostnames `*.yourdomain.com`, `yourdomain.com`, 15 years validity).
5. Click **Create**.
6. Copy the **Origin Certificate** and save it as `origin.crt`.
7. Copy the **Private Key** and save it as `origin.key`.
8. Secure the private key on the server: `chmod 600 origin.key`.
9. Set Cloudflare SSL/TLS encryption mode to **Full (Strict)**.
