# Lucky Box — Vending-Style Ordering Website

Static, data-driven ordering site designed like a vending machine. Uses Netlify Forms to collect orders (no payment gateway included).

## Quick start

1. **Upload images** into `/images` matching the names in `products.json` (or change the paths there).
2. Deploy to Netlify:

   - Create a new GitHub repo and push these files.
   - In Netlify, "New site from Git" → pick the repo. No build step needed.

3. Orders will show in **Netlify → Forms → order** and can also be sent to email/Slack via Netlify notifications.

## Customize

- Edit product data in `products.json` (codes, names, prices, images).
- Visuals live in `style.css`. Layout is responsive and works nicely on mobile.
- The main UI is in `index.html` and dynamic rendering/cart logic is in `script.js`.

## Notes

- This site intentionally collects an order request only (no payments). You can add a payment link in the confirmation email or switch to a full cart/checkout later.
- Product codes map to a 3×3 keypad (A–C, 1–3). Add more slots by adding codes like `D1`, `D2` and adjusting the grid columns in CSS if desired.