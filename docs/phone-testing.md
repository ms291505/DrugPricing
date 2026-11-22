# Testing on a phone

The first check is Safari in the Xcode iOS Simulator on the same Mac: open `http://localhost:5173`.
It runs real iOS WebKit and reaches the API at `localhost:5250` with no setup. It has no VoiceOver.

For VoiceOver and Android, use a real device with `npm run dev:phone` (in `client/`). A device
can't reach `localhost`, and plain HTTP over the LAN isn't a secure context, so
`crypto.randomUUID()` (workspace startup, pins, scans) throws. This mode serves HTTPS and proxies
`/api` to `http://localhost:5250`, so the device calls the API on the page's own origin (no CORS or
mixed content). It reads `client/.env.phone` (`VITE_API_URL=/api`).

1. Install [mkcert](https://github.com/FiloSottile/mkcert) and run `mkcert -install`.
2. In `client/.cert/` (gitignored), make a certificate with names for the Mac, its LAN IP and
   localhost, saved as `key.pem` and `cert.pem`:
   `mkcert -key-file key.pem -cert-file cert.pem "<Mac name>.local" <LAN IP> localhost`.
3. Install mkcert's root CA (`mkcert -CAROOT`) on the device and turn on full trust (iOS: Settings
   › General › About › Certificate Trust Settings).
4. Start the API and `npm run dev:phone`, then open `https://<Mac name>.local:5173`.

Afterward, remove the trust profile from the device: anyone with `rootCA-key.pem` could intercept
its traffic. `--host` exposes Vite and the proxied API to the LAN, so use a trusted network, and
expect the macOS firewall prompt for node. Android Chrome can skip the certificate: forward ports
5173 and 5250 from `chrome://inspect` and open `http://localhost:5173`.
`@vitejs/plugin-basic-ssl` (self-signed) is a fallback, not a dependency.
