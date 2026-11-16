# Email to Swiggy Builders Club (draft)

To: builders@swiggy.in
Subject: Tiffmate (group food ordering): questions before we apply

Hello Swiggy Builders team,

I am building Tiffmate (https://tiffmate.vercel.app), a group food ordering app. A host starts a food party and
shares one link, everyone picks their own dish from Swiggy restaurants, and the host places the order. The app
works out who owes what. Today the host adds the dishes to Swiggy by hand; we want to replace everything that
touches Swiggy with your official Food MCP before we apply, and we would like to be sure it fits the programme.

A few questions, so we build the right thing:

1. **Order size.** The docs mention a Rs 1000 cart cap for Builders Club food orders. Does it apply to every
   builder, and is there a higher limit or a process for group orders? A team order is often Rs 3,000 to 6,000
   across several restaurants. If the cap stays, we would warn at pick time and split the order, and we would like
   to know if that is acceptable.
2. **Several restaurants.** The cart holds one restaurant at a time. We plan one cart and one order per
   restaurant, in sequence, each confirmed by the host. Is that the intended pattern?
3. **Staging and credentials.** Some docs say there is a staging server and others say there is no sandbox. Which
   is right, and are client credentials issued, or do we register dynamically?
4. **Hosting.** Our API runs on Vercel serverless, which has no fixed outbound IP. Is a static IP range required?
   We can move to a fixed-egress host if so.
5. **Data location.** Our database is in the US today. We will move it to Singapore (our provider has no
   Mumbai region). If any Swiggy-originated data (addresses, order details) would be stored there, does Singapore
   count as inside your data region, or do you need a signed DPA before production? What is the process?
6. **Rate limits.** The exact limits are not published. We expect roughly [N] orders and [N] tool calls a day
   during a pilot with [one team]. Is that fine?
7. **Branding.** We will show the square Swiggy logo and "Powered by Swiggy" wherever Swiggy content appears. Where
   do we get the supplied artwork?

What we have already done: Tiffmate no longer shows Swiggy's logo in marketing, it says plainly that ordering is
manual today, and it has a privacy notice and an in-app "Delete my account" that removes a person's name, email,
sign-in and picks.

Happy to share a demo and our architecture once the answers are clear.

Thank you,
[Your name]
[Your role] | [email] | [phone]
