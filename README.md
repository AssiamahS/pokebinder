# pokebinder

A storefront window for one person's Pokemon card collection. It shows what is
for sale, what condition it is in and what it is worth. Checkout runs on
hosted payment links, eBay or direct offer, so the site itself never handles
card numbers.

Live: https://assiamahs.github.io/pokebinder/

## Why checkout is hosted, not built in

A stranger has no reason to send money to an unknown personal site. eBay and
PayPal Goods & Services give the buyer protection and give the seller a
feedback history, which is what makes a private collection look legitimate.
The site's job is the catalog and the trust signals (real photos on request,
grade cert numbers, a link to eBay feedback).

## Add or change cards

Edit `cards.json`. Each row is one listing:

| field | meaning |
| --- | --- |
| `id` | TCGdex card id, `<set id>-<number>`. Find it at https://tcgdex.dev or `https://api.tcgdex.net/v2/en/cards?name=charizard` |
| `variant` | optional print: `holofoil`, `normal`, `reverse-holofoil`. Defaults to the first one with a price |
| `condition` | `NM`, `LP`, `MP`, `HP`, `DMG` |
| `grade` | optional, e.g. `PSA 10` (shown instead of the condition) |
| `qty` | copies available |
| `ask` | asking price in USD, or `null` for "open to offers" |
| `listing` | eBay listing URL. When set, the button becomes "Buy on eBay" |
| `status` | `available` or `sold` |
| `checkout` | hosted payment link for this card (Stripe Payment Link or PayPal). When set with an `ask`, the card gets a "Buy now" button |
| `soldPrice`, `soldOn`, `soldVia`, `proof` | for sold cards: price, date, where, and an https link to the sale (eBay item or feedback). Fills the "Sold so far" table |
| `cert` | optional PSA cert number, adds a cert lookup link |
| `note` | one line about this copy |

Name, set, art and market price come from TCGdex at page load (cached in the
browser for 12 hours). No API key, no build step.

Edit `site.json` for the owner name, contact email, eBay username, payment
methods and shipping text. Set `"sample": false` once the real cards are in.

## Selling straight from the site

The page is static, so payment runs on a hosted checkout page and no card
numbers touch this site. In Stripe: Payment Links, new link, one product per
card, set the price, turn on "limit the number of payments" to 1 so a single
card cannot be bought twice, collect the shipping address. Paste the link
into that card's `checkout` field. PayPal payment links work the same way.

After a sale set `status` to `sold` and fill the sold fields. That table is
the track record new buyers look at.

## Install it like an app

Open the site on a phone, Share, Add to Home Screen. It gets its own icon and
opens full screen (`manifest.webmanifest`, `icon-*.png`).

## Run locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080. Opening `index.html` straight from disk will
not work because the page fetches the JSON files.

## Where the money comes from

`seller.html` (not linked from the binder) totals the market value of the
available cards and shows what each way out would net. Rough numbers:

| route | you keep | paid as |
| --- | --- | --- |
| direct sale, PayPal G&S | ~96% | cash |
| TCGplayer | ~87% | cash |
| eBay | ~85% | cash |
| local shop, store credit | 60 to 70% | credit at that shop |
| local shop, cash | 50 to 60% | cash or check |
| online buylist | 50 to 65% | PayPal, check or wire |

To net full market on eBay, list at market / 0.85 (a $100 card goes up at
about $118). Every card links to eBay sold listings and PriceCharting so the
asking price can be checked against real sales.

Shops pay graded slabs better (65 to 75% of recent sold prices). Store credit
runs about 10 points above cash at the same shop, which only helps if you were
going to spend the money there anyway. Fees change, so check the platform's
own fee page before listing.

Not affiliated with Nintendo, Creatures, GAME FREAK or The Pokemon Company.
