import { Contact, H, LegalPage } from './Legal';

// The privacy notice, at /privacy. Plain words about what Tiffmate keeps, why, who sees it, and how to delete it.
// Keep it true: change it in the same change as any change to what the app stores (apps/accounts/erasure.py is
// what deleting an account removes).
const UPDATED = '17 November 2026';

export default function Privacy() {
  return (
    <LegalPage title="Privacy notice" updated={UPDATED}>
      <p className="mt-6">
        Tiffmate is a group food ordering app. A host starts a food party and shares a link, everyone picks their own dish, and the host places the order. This notice says what we keep about you while you use it, and how to have it deleted.
      </p>

      <H>What we keep</H>
      <ul className="mt-3 grid list-disc gap-1.5 pl-5">
        <li>Your name and email, from your Google sign-in. We never see your Google password.</li>
        <li>What you pick in a food party: the restaurant, the dish, the quantity, and any note you add for the restaurant.</li>
        <li>The delivery addresses a host chooses for a food party, and where they are on the map.</li>
        <li>Local menus you save: the restaurant name, a photo, and the dishes and prices.</li>
        <li>If you turn on notifications, a token that lets your device receive them.</li>
        <li>If you connect an AI assistant, a sign-in the assistant uses to act as you. We keep only an unreadable fingerprint of it, and you can disconnect it any time from the Connect page.</li>
        <li>For a company: its name, the email domain, and who has which role.</li>
      </ul>
      <p className="mt-3">We do not take card or payment details. We do not sell your data, show ads, or use tracking or analytics scripts. Error reports go to a monitoring service without personal details.</p>

      <H>Who sees it</H>
      <p className="mt-3">
        The host of a food party, and the people in it, see who picked what. A company's hosts see their company's food parties. Nobody else can open a food party without its link. Restaurant and menu information comes from Swiggy. Tiffmate is its own app and is not run, approved or endorsed by Swiggy.
      </p>

      <H>How long we keep it</H>
      <p className="mt-3">
        Until you delete your account. A finished food party keeps its record of who ordered what, so the host's receipts and everyone's totals stay right, but once you delete your account your name on it becomes "Former member".
      </p>

      <H>Deleting your account</H>
      <p className="mt-3">
        Open <span className="font-medium text-foreground">Your account</span> in the app and press <span className="font-medium text-foreground">Delete my account</span>. That removes your name, email, sign-in, devices, notifications, assistant access and saved local menus, and your picks in food parties still taking picks. If you host a food party that is not over, or your food is already being ordered, we will ask you to wait until it is done, so nobody's order is changed behind their back.
      </p>

      <H>Your rights</H>
      <p className="mt-3">
        You can ask to see what we hold about you, to correct it, or to delete it. Deleting is built into the app, as above. For anything else, or a complaint, contact us<Contact />.
      </p>

      <H>Who handles the data</H>
      <p className="mt-3">We use a few services to run the app: Google (sign-in and notifications), Vercel (hosting) and a managed PostgreSQL database. They handle data only to run Tiffmate for us.</p>

      <H>Changes</H>
      <p className="mt-3">If we change what we keep, we will update this page and its date.</p>
    </LegalPage>
  );
}
