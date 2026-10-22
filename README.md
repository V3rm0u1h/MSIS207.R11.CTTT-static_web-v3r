# This is a basic website that do basically nothing

## What is nothing?

perhaps it is nothing

## aristotle or socrates?

idk man to be or not to be or sth im not a philosopher

## Vietnam Mega-Sale Simulator (`LAB2/HW/megasale/`)

A front-end simulation of an 11.11 flash sale (Shopee / Lazada style),
built on this repository's Mini-React core (`LAB2/HW/source/`). A
campaign opens on a schedule; shoppers reserve units, which are locked for
a few minutes, and check out before the lock expires or lose it.

### Run it

No build step and no dependencies. Serve the `LAB2/` folder, so the
`../../source/` imports resolve:

```
cd LAB2
python -m http.server 8765
```

- Demo: http://localhost:8765/HW/megasale/source/megaSale.demo.html. The
  links at the top switch scenarios (upcoming, starts in 5 s, live, live
  with a 20 s lock, ended, invalid configuration). A switch below the card
  makes the simulated payment fail.
- Tests: http://localhost:8765/HW/megasale/source/megaSale.test.html. 126
  in-browser tests run on load; the line at the top shows how many passed.
  The other suites still pass too: `HW/source/dataGrid.test.html`,
  `HW/audio/source/audio.test.html`, and `EXERCISE/sources/*.test.html`.

### Important decisions

- **Zero-drift countdown.** Remaining time is always
  `Math.max(0, target − Date.now())`; the interval only schedules
  refreshes, so delayed callbacks never cause drift (`countdown.js`).
- **Explicit state machine.** Reservations follow one frozen transition
  table (IDLE, RESERVING, LOCKED, CHECKING_OUT, PURCHASED, EXPIRED,
  CANCELLED); every other move is rejected (`reservationMachine.js`).
- **One authority for stock.** `reservationStore.js` is the only code that
  changes reservations and stock, keeping
  `total = available + reserved + sold`. Each operation validates and
  writes synchronously. Locks expire against their absolute `expiresAt`,
  exactly once, and stale timer callbacks are ignored. Checkout re-checks
  the expiry and is deduplicated by reservation id.
- **UI derived from the store.** The Mini-React card re-renders from store
  snapshots on changes, never per countdown tick. Status changes are
  announced in one live region, and disabled actions explain why.

Full write-up, architecture table and per-milestone notes:
`LAB2/HW/megasale/report.md`. AI failure audit: `AI_FAILURE_AUDIT.md`.

### Limitations

This is a client-side simulation. Stock is consistent only inside one
page's in-memory store; two tabs or devices do not share it. It is not a
production payment or distributed inventory system: that needs server-side
atomic reservations, durable records and transactions.