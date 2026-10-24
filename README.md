# DummyHub

A single-page app in vanilla JavaScript (ES modules) that uses the DummyJSON API.

- **Name:** _(write your name here)_
- **Section:** _(write your section here)_
- **Date submitted:** _(write the date here)_

## How to run

1. Open the `dummyhub` folder in VS Code.
2. Right-click `index.html` and choose **Open with Live Server** (a local server is required for ES modules).

To slow every request down and demonstrate the loading state, open the app with a delay, for example
`http://127.0.0.1:5500/index.html?delay=1500`.

## Test account

Username `emilys`, password `emilyspass`.

## Requirements checklist

Statuses below are what the code was written to do. Re-check each one in the browser before you submit
and change the status (and add a one-line note) for anything that is not fully working.

| ID | Status | Note |
|----|--------|------|
| SHELL-1 | Done | index.html has only the shell |
| SHELL-2 | Done | Links change the view without a reload |
| SHELL-3 | Done | Back/Forward work (hash routing) |
| SHELL-4 | Done | Active nav link highlighted |
| SHELL-5 | Done | Route params parsed by router.js |
| SHELL-6 | Done | Guests redirected to login, then back to the wanted route |
| SHELL-7 | Done | Not Found view with link to Dashboard |
| AUTH-1 | Done | Regex validation, errors beside fields |
| AUTH-2 | Done | POST /auth/login, button disabled while loading |
| AUTH-3 | Done | User and tokens in state, header shows name and image |
| AUTH-4 | Done | Server message shown, password cleared |
| AUTH-5 | Done | GET /auth/me after login and on start |
| AUTH-6 | Done | Logout clears auth and cart, routes to login |
| DASH-1 | Done | Promise.all with 4 /auth requests |
| DASH-2 | Done | Summary cards use reduce |
| DASH-3 | Done | New quote updates only the quote card |
| DASH-4 | Done | Whole dashboard shows error + Retry (Promise.allSettled stretch not done) |
| SHOP-1 | Done | limit=12, skip, select |
| SHOP-2 | Done | Page X of Y, Previous/Next disabled at ends |
| SHOP-3 | Done | Category dropdown from /products/categories |
| SHOP-4 | Done | Debounced search (300 ms closure) |
| SHOP-5 | Done | Server sort with sortBy and order |
| SHOP-6 | Done | In stock only is derived in render |
| SHOP-7 | Done | One delegated click listener on the grid |
| SHOP-8 | Done | Product detail with gallery and reviews |
| SHOP-9 | Done | Thumbnail click swaps main image |
| SHOP-10 | Done | Add to cart respects stock and minimum order |
| CART-1 | Done | Cart in state, badge uses reduce |
| CART-2 | Done | Immutable map to add, filter to remove |
| CART-3 | Done | +/- and remove through one delegated listener |
| CART-4 | Done | Subtotal, discount, total computed in render |
| CART-5 | Done | POST /carts/add, receipt, cart emptied |
| CART-6 | Done | Past carts from /carts/user/{userId} |
| RCP-1 | Done | Search and server sort |
| RCP-2 | Done | Tag and meal-type filters |
| RCP-3 | Done | Difficulty and time filters (client side) |
| RCP-4 | Done | Detail with servings adjuster |
| POST-1 | Done | 10 posts, Load more appends with spread |
| POST-2 | Done | Tag chips and search |
| POST-3 | Done | Like/Dislike in local state only |
| POST-4 | Done | Post, comments, author with Promise.all |
| POST-5 | Done | Validated comment, POST /comments/add, appended to state |
| POST-6 | Done | All text escaped |
| PPL-1 | Done | Search and role filter |
| PPL-2 | Done | Server sort, cards with name, image, role, company |
| PPL-3 | Done | Profile loads user, posts, todos, carts in parallel |
| TASK-1 | Done | Loads todos with /auth endpoint |
| TASK-2 | Done | Validated add, returned todo added to state |
| TASK-3 | Done | PUT, state changes after success |
| TASK-4 | Done | DELETE, removed only when isDeleted is true |
| TASK-5 | Done | Local tasks handled without requests |
| TASK-6 | Done | All/Active/Completed and items-left counter |
| NF-1 | Done | Unknown routes and 404 detail requests show Not Found |
| JS-1 | Done | One request() wrapper checks res.ok |
| JS-2 | Done | Loading, empty, error + Retry in every async view |
| JS-3 | Done | One state object, views render from it |
| JS-4 | Done | Immutable updates only |
| JS-5 | Done | escapeHTML used for all API and user text |
| JS-6 | Done | Delegated listeners, attached once per mount |
| JS-7 | Done | Named exports, small functions, no stray logs |

## Bonus items attempted

- Session survives a page refresh: tokens are kept in `sessionStorage` and checked with `/auth/me` on start (`auth.js`, `main.js`).

## Notes for the walkthrough

- **Selection methods:** `getElementById` for single known elements, `querySelector`/`querySelectorAll` for
  selectors and a one-time snapshot (login fields), `getElementsByClassName` for the nav links
  (a live collection that always matches the page), and `getElementsByTagName('main')` to move focus after a route change.
- **Frame + render pattern:** each view's `mount()` draws the fixed frame (title, search box, filters) once and attaches
  listeners once. `render()` only redraws the parts that depend on state. This keeps typed text in search boxes.
- **Extra files beyond the required structure:** `constants.js`, `components.js` (loading/error/empty markup),
  `auth.js`, `cart-actions.js`, `header.js`. Each has one responsibility.
- **Local tasks:** the server returns the same id for every new todo, so a new task gets a unique local id and an `isLocal` flag.

## Known issues

_(Fill this in after testing. Examples of things to check: every view with `?delay=1500` and with the network set to Offline.)_

- Shop, Recipes and People: if you change filters faster than the server answers (easy to do with `?delay=1500`), an older response can arrive last and replace the newer list. Wait for the loading state to finish before the next change.
- POST-3: each click on Like or Dislike adds 1 (no undo), because reactions only live in local state.
- POST-4: the author's id comes from the post, so the author request starts when the post arrives; all three still run inside one `Promise.all`.
- DASH-4: `Promise.allSettled` (bonus) is not used; one failed request shows the whole dashboard error.

## Pairs

Not applicable (individual project).
