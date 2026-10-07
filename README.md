# Backpack on backpack.kmverburg.nl

Shared packlists for you and your partner, behind a login that only allows your two email addresses.

## Before you start
- A free Cloudflare account (https://dash.cloudflare.com).
- Node.js installed (https://nodejs.org), so you can run `npx`.
- The domain `kmverburg.nl` must use Cloudflare DNS. If it doesn't yet:
  Cloudflare dashboard > Add a domain > kmverburg.nl > Free plan, then change the nameservers at your registrar to the two Cloudflare gives you. Copy your existing DNS records first (Cloudflare tries to import them).

## 1. Deploy
In a terminal, inside this folder:

    npx wrangler login
    npx wrangler kv namespace create BACKPACK

The second command prints an `id`. Paste it into `wrangler.toml` in place of `PASTE_KV_ID_HERE`. Then:

    npx wrangler deploy

Wrangler creates the DNS record and HTTPS certificate for `backpack.kmverburg.nl` itself.
At this point the site is live but NOT yet locked. Do step 2 right away.

## 2. Lock it to you and your partner
1. Cloudflare dashboard > Zero Trust (choose a team name and the free plan if asked).
2. Access controls > Applications > Add an application > Self-hosted.
3. Application name: Backpack. Public hostname: `backpack.kmverburg.nl` (leave path empty).
4. Add a policy: Action = Allow, Include = Emails, then enter your email and your partner's.
5. Login methods: keep "One-time PIN" enabled. Save.

Visiting the site now asks for an email, sends a code, and only your two addresses get in.

## 3. Check it
- Open https://backpack.kmverburg.nl in a private window, log in with your email.
- Make a change, then open it on your phone (log in with the code). You should see the same data.
- Test with a third email address: it should be refused.

## Notes
- Data lives in Cloudflare KV, one shared copy. If you both save at the exact same moment, the second save is told to refresh and shows a notice.
- The first time the app loads it shows the example items. Edit or delete them.
- Backup: `npx wrangler kv key get state --binding BACKPACK --remote > backup.json`
- Update the app later by editing `public/index.html` and running `npx wrangler deploy` again.
- `workers_dev = false` is deliberate: it removes the public *.workers.dev address, so nothing can bypass the login.

## Automatic deploys (GitHub Actions)
Every push to `main` deploys the app. Pull requests only run checks.

1. Create a GitHub repository and push this folder to its `main` branch.
2. Create a Cloudflare API token: dash.cloudflare.com > My Profile > API Tokens > Create Token > template "Edit Cloudflare Workers". Limit it to your account and the `kmverburg.nl` zone. If a deploy complains about DNS, also add Zone > DNS > Edit.
3. Find your Account ID: Cloudflare dashboard > Workers & Pages (shown on the right).
4. In GitHub: repository > Settings > Secrets and variables > Actions > New repository secret. Add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Push a change. Watch it under the repository's Actions tab. You can also run it by hand with "Run workflow".

The KV namespace id in `wrangler.toml` is not a secret, so it is committed. The API token must never be committed.
Note: while `kmverburg.nl` is still moving to Cloudflare, the deploy step can fail on the custom domain route. It will work once the domain is active.

## Android
Two ways to get Backpack on a phone. Both load the live site, so a normal `wrangler deploy` updates the app everywhere. You only rebuild the APK for native changes (icon, name, Capacitor upgrade).

### A. Install as an app (no build)
Open https://backpack.kmverburg.nl in Chrome on Android > menu > Install app (or Add to Home screen). Log in with the email code once.

### B. APK via CI (`.github/workflows/android-release.yml`)
`mobile/` holds a Capacitor shell that opens https://backpack.kmverburg.nl in a WebView. CI generates the Android project, builds it, and attaches the APK to a GitHub Release.

One-time signing setup (so updates install over older versions):

    keytool -genkeypair -v -keystore backpack.jks -alias backpack -keyalg RSA -keysize 2048 -validity 10000
    base64 -w0 backpack.jks      # macOS: base64 -i backpack.jks

Keep `backpack.jks` and its passwords somewhere safe (a password manager). If you lose it you cannot ship updates over the installed app. Never commit it.
Add GitHub secrets: `ANDROID_KEYSTORE_BASE64` (the base64 output), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS` (`backpack`).
Without these secrets the workflow still runs and produces a debug-signed APK, which is fine for a first test.

Release: `git tag v1.0.0 && git push origin v1.0.0`. The APK appears under the repository's Releases (or Actions > run > Artifacts when started by hand).
Install on the phone: download the APK, allow "install unknown apps" for your browser/files app, open it.

Login note: Cloudflare Access asks for an email code inside the app. To avoid frequent re-login, raise the session length in Zero Trust > Access > Applications > Backpack > Session duration (for example 1 month).
Play Store release needs an AAB and a $25 developer account. Not covered here.
