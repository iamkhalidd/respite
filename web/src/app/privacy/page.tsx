import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal";
import { getHouse } from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Respite for the Weary collects through this website, why, who helps us run it, and how to ask us to change or delete it.",
};

export default async function PrivacyPage() {
  const house = await getHouse();
  return (
    <LegalPage
      title="Your privacy"
      updated="November 13, 2026"
      intro="People who reach out to us are often going through a hard time. We only ask for what we need to help, we never sell it, and you can ask us to delete it. Here is the whole picture in plain words."
    >
      <LegalSection title="What we collect">
        <p>We only collect what you type into a form, plus the records we keep once you live here.</p>
        <ul>
          <li>
            <strong>Room requests:</strong> your name, phone, email if you give it, who the room is for, which program fits (veteran, recovery or senior), when you hope to move in, how you plan to pay and anything you write to us. If a caseworker or counselor refers you, we also keep their name, organization, phone and email.
          </li>
          <li>
            <strong>Tours:</strong> your name, phone, email if you give it, the time you picked and any note.
          </li>
          <li>
            <strong>Waitlist:</strong> your name, email, phone if you give it, the room you want and any note.
          </li>
          <li>
            <strong>Residents:</strong> your bed, move in and move out dates, rent and what has been paid, repair requests you send us, and notes or documents the house keeps about your stay.
          </li>
          <li>
            <strong>House staff:</strong> the name and email they log in with. Passwords are stored scrambled, so nobody can read them, including us.
          </li>
        </ul>
        <p>
          Telling us you are a veteran or in recovery is sensitive. We use it only to find you the right room and program, and we never share it outside the house.
        </p>
      </LegalSection>

      <LegalSection title="What we don't do">
        <ul>
          <li>We don&apos;t sell or rent your information to anyone.</li>
          <li>We don&apos;t run ads, ad trackers or analytics on this site.</li>
          <li>
            The only cookie we set keeps house staff logged in to the owner dashboard. Visitors and residents get no cookies from us.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use it">
        <ul>
          <li>To call, text or email you back about a room, a tour or the waitlist.</li>
          <li>To send reminders: your tour the day before, a bed opening up, rent that is past due.</li>
          <li>To keep track of rent, deposits and repairs while you live here, and to give you a statement when you ask.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Who helps us run the site">
        <p>A few companies handle parts of the work for us. Each only sees what it needs for its job.</p>
        <ul>
          <li><strong>Vercel</strong> hosts this website.</li>
          <li><strong>Render</strong> runs the server behind it.</li>
          <li><strong>Neon</strong> stores the database.</li>
          <li><strong>Resend</strong> delivers the emails we send.</li>
          <li>
            <strong>Stripe</strong> handles card and bank payments. Your card or bank details go straight to Stripe. We never see or store them.
          </li>
          <li>
            <strong>Twilio</strong> delivers text messages, if the house has text reminders turned on.
          </li>
        </ul>
        <p>We may also share information when the law requires it, or to keep someone safe in an emergency.</p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep requests, tours and waitlist entries while they are useful for finding you a room. Rent and payment records we keep as long as we need them for our books. Ask us any time and we will delete what we don&apos;t have to keep.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <ul>
          <li>Ask to see, correct or delete what we have about you. Call or write to us using the details below.</li>
          <li>Leave the waitlist or cancel a tour any time with the link in your email.</li>
          <li>
            Your resident pay link is private to you. If you think someone else has it, tell us and we will give you a new one.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Children">
        <p>The house is for adults. This site is not meant for anyone under 18, and we don&apos;t knowingly collect their information.</p>
      </LegalSection>

      <LegalSection title="Changes and questions">
        <p>
          If we change how we handle your information, we will update this page and the date at the top. Questions? Call the house at{" "}
          <a href={house.phoneHref} className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
            {house.phone}
          </a>{" "}
          or visit us at {house.address}. See also our{" "}
          <Link href="/terms" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
            terms of use
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
