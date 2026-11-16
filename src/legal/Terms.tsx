import { Contact, H, LegalPage } from './Legal';

// The terms of use, at /terms. Plain words, written to match what the app really does today: the host places
// the order in Swiggy, Tiffmate takes no payment, and restaurant information comes from Swiggy. Change it in the
// same change as any change to how ordering works (for example when automatic ordering is switched on).
// It is a plain-language draft, not legal advice: have a lawyer read it before you rely on it.
const UPDATED = '17 November 2026';

export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated={UPDATED}>
      <p className="mt-6">
        These terms are the rules for using Tiffmate, a group food ordering app. By signing in or using a food party link, you agree to them. If you do not agree, please do not use Tiffmate.
      </p>

      <H>What Tiffmate does</H>
      <p className="mt-3">
        A host starts a food party and shares a link. Everyone picks their own dish, and Tiffmate puts the picks together and shows who owes what. Tiffmate helps people plan and share an order. It is not a restaurant, a delivery service or a payment service.
      </p>

      <H>Ordering and paying</H>
      <ul className="mt-3 grid list-disc gap-1.5 pl-5">
        <li>Today the host places each order in Swiggy, by hand, from the list Tiffmate shows. Tiffmate does not place orders, and does not take or hold any money.</li>
        <li>The host is the customer of Swiggy and of the restaurants. Delivery, food quality, refunds and complaints are between the host and them.</li>
        <li>Who pays whom inside the group is for the group to settle. Tiffmate shows the amounts as a help, not as a bill or a receipt for tax.</li>
        <li>Prices, menus and availability come from Swiggy and the restaurants. They can change at any time, and Swiggy adds its own fees and taxes, so the total Swiggy charges can differ from what Tiffmate shows.</li>
      </ul>

      <H>Swiggy</H>
      <p className="mt-3">
        Tiffmate is an independent app. It is not run, approved or endorsed by Swiggy. Swiggy and its logo belong to Swiggy and are shown only to say where restaurant information comes from.
      </p>

      <H>Being a host</H>
      <p className="mt-3">
        If you start a food party, you decide who gets the link, you choose the delivery address and the restaurants, and you are responsible for placing the order and for what you tell the group about it. Please only use delivery addresses you are allowed to use, and only share the link with people who should have it.
      </p>

      <H>Your account and your content</H>
      <ul className="mt-3 grid list-disc gap-1.5 pl-5">
        <li>You sign in with Google. Keep your account to yourself, and tell us if someone else uses it.</li>
        <li>Local menus, photos, names and notes you add are yours. You must have the right to use them, and they must be accurate and not harmful. We may remove content that breaks these terms.</li>
        <li>If you connect an AI assistant, it acts as you, with your permissions, and what it does counts as what you did. You can disconnect it at any time on the Connect page.</li>
        <li>You can delete your account any time under Your account. What that removes is in the <a className="font-medium text-brand underline-offset-4 hover:underline" href="/privacy">privacy notice</a>.</li>
      </ul>

      <H>What not to do</H>
      <p className="mt-3">
        Do not use Tiffmate to break the law, to harass anyone, to place orders you do not intend to pay for, or to interfere with the app or with Swiggy's services (for example, by scraping, by overloading them, or by trying to get around their limits or ours).
      </p>

      <H>No promises about availability</H>
      <p className="mt-3">
        We work to keep Tiffmate running, but it is provided as it is, and it may be down, change or have mistakes. Please do not rely on it for anything where a failure would cause serious harm, and check the order in Swiggy before you place it.
      </p>

      <H>Our responsibility</H>
      <p className="mt-3">
        To the extent the law allows, Tiffmate is not responsible for orders that are wrong, late or never arrive, for restaurant or delivery problems, for prices or fees that differ from what we showed, or for indirect losses. Nothing here takes away rights the law gives you that cannot be taken away.
      </p>

      <H>Changes and ending</H>
      <p className="mt-3">
        We may change these terms or the app. If a change matters, we will update this page and its date. You can stop using Tiffmate at any time, and we may suspend an account that breaks these terms.
      </p>

      <H>Questions</H>
      <p className="mt-3">
        Ask us<Contact />.
      </p>
    </LegalPage>
  );
}
