# Korvi Landing Page

Marketing landing page for [Korvi](https://korvi.no) — premium plastic business cards with QR and NFC technology, targeted at the Norwegian market.

## Tech Stack

- **Node.js + Express** — lightweight HTTP server, serves static files and handles the contact form API
- **Tailwind CSS v3** — utility-first CSS, compiled to a single minified file
- **Vanilla JS** — no framework; hero carousel, FAQ accordion, scroll reveal, pricing switcher, mobile nav, scrollspy
- **Resend** — transactional email via raw `fetch` (no SDK), triggered on contact form submission
- **dotenv** — environment variable management

## Project Structure

```
public/          # Static files served directly
  index.html     # Main page (single-page layout)
  app.js         # All client-side JS
  assets/
    tailwind.css # Compiled & minified Tailwind output
  images/        # Product photos and logo
src/
  styles.css     # Tailwind input file + custom component CSS
server.js        # Express server + /contact POST endpoint
```

## Getting Started

```bash
npm install
cp .env.example .env   # fill in RESEND_API_KEY and CONTACT_EMAIL
npm run dev            # start server with live reload
```

Open [http://localhost:3005](http://localhost:3005).

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server with live reload |
| `npm run build:css` | Compile Tailwind CSS once |
| `npm run dev:css` | Watch and recompile CSS on change |
| `npm start` | Build CSS and start production server |

### Environment Variables

See `.env.example` for all available variables.

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes | Resend API key for contact form emails |
| `CONTACT_EMAIL` | Yes | Email address that receives contact submissions |
| `FROM_EMAIL` | No | Sender address (must be a verified Resend domain) |
| `PORT` | No | Server port (default: `3005`) |

## TODO

- [ ] Replace placeholder product images with real Midjourney-generated photos
- [ ] Verify `korvi.no` domain in Resend and update `FROM_EMAIL`
- [ ] Add real customer testimonials once available
- [ ] Implement the AI-driven digital profile feature
- [ ] Set up deployment (Railway / Fly.io / VPS)
- [ ] Add Google Analytics or Plausible for traffic tracking
- [ ] Consider a minimum order configurator on the pricing section
