# The demo video for Swiggy

Swiggy's docs say a walkthrough of the real flow "is the fastest way from application to allowlist". Send a link
(YouTube unlisted, Loom or Drive), or email the file. Keep it under about 4 minutes, narrated, in 1080p.

## What exists today

| Video | Where | Use it for |
| --- | --- | --- |
| The product film (2 min, narrated) | <https://tiffmate.vercel.app/promo/story.mp4> (`public/promo/story.mp4`) | Explaining the idea to anyone. Not for the Swiggy application: it is a story, not the app. |
| The AI chat film | <https://tiffmate.vercel.app/promo/mcp.mp4> | Showing the assistant (MCP) side. |
| A first draft walkthrough (2:40, no narration) | `~/Downloads/tiffmate-demo.mp4` on the author's Mac | **Do not send.** It shows today's manual ordering and restaurant data read the unofficial way. |

**The Swiggy video has not been recorded yet.** It must be recorded after the official Swiggy MCP replaces the
unofficial code (see `docs/swiggy-builders-club.md` in the `lunch-backend` repo, section 2), so that what it shows is
what Swiggy is approving.

## Shot list (record this once the official MCP works, in staging or with a real account)

1. **Who and why (15 s).** One sentence: "Tiffmate helps a team order food together: everyone picks their own dish,
   the host places the order." The problem in one line: one phone going round, orders copied by hand.
2. **The host connects Swiggy (20 s).** Sign in with Google, then "Connect your Swiggy account": the Swiggy sign-in
   and the Allow screen. Say that Tiffmate never sees the Swiggy password and the person can disconnect.
3. **Start a food party (20 s).** Choose a saved Swiggy address, the restaurants near it (only open ones), the cutoff.
   Show the share link. "Powered by Swiggy" with the logo is visible.
4. **Everyone picks (30 s).** Open the link on a phone as a second person, pick a dish, add a cooking note.
   Show the live board filling up.
5. **Lock and review (20 s).** The host locks the picks and sees each restaurant's dishes and total.
6. **Confirm, then order (40 s).** The confirmation screen with the items, the total, the delivery address and the
   payment method (cash on delivery). The host presses confirm; only then is the order placed.
   Show what happens above the Rs 1000 cap, whichever way you chose.
7. **Track (20 s).** The delivery status updating, then each bag marked arrived.
8. **Who owes what (15 s).** Each person's card with their share.
9. **Your data (20 s).** Your account, "Delete my account", and the privacy notice and terms pages.
10. **Close (10 s).** "Tiffmate: everyone picks, the host orders." The website address.

## Before you record

- Use real staging or a real account, with real (small) test data. Not a sandbox pretending to be real, and not
  sample data.
- Close other tabs, hide notifications, use a fresh browser profile, and clear anything personal.
- Say aloud anything the screen cannot show (for example, "payment is cash on delivery").
- Put the link in the application form, and in the README's demo section.

## After you record

Add the link to the "Demo video" section in the [README](../README.md) and to the application.
