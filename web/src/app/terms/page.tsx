import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal";
import { getHouse } from "@/lib/content";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The plain rules for using the Respite for the Weary website: requests, tours, the waitlist, resident pay links and payments.",
};

export default async function TermsPage() {
  const house = await getHouse();
  const link = "font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink";
  return (
    <LegalPage
      title="Terms of use"
      updated="November 13, 2026"
      intro="These are the ground rules for using this website. They are short on purpose. Living at the house is covered by your resident agreement and the house rules, which you get when you move in."
    >
      <LegalSection title="What this site is for">
        <p>
          You can use this site to look at rooms, ask for a room, book a tour, join the waitlist and, if you live here, pay rent and send repair requests. House staff use it to manage all of that.
        </p>
      </LegalSection>

      <LegalSection title="Rooms, prices and availability">
        <p>
          We keep room details and prices as current as we can, but they can change. Sending a request or booking a tour does not hold a bed or promise you a place. A room is yours once we have confirmed it with you and you have signed the resident agreement.
        </p>
      </LegalSection>

      <LegalSection title="Be honest with us">
        <p>
          Please give us true details when you fill out a form, and only send a request for someone else if they have asked you to. Don&apos;t use the site to send spam, harass anyone, or try to get into parts of it that aren&apos;t yours.
        </p>
      </LegalSection>

      <LegalSection title="Your resident pay link">
        <p>
          Each resident gets a private link to see and pay what they owe. Anyone with that link can see your balance and pay it, so keep it to yourself. If you think someone else has it, tell us and we will give you a new one.
        </p>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          Card and bank payments are processed by Stripe. A payment counts once Stripe confirms it, and your balance updates on your pay page. If something looks wrong, call the house and we will sort it out with you. Deposits are handled as your resident agreement says.
        </p>
      </LegalSection>

      <LegalSection title="Staff accounts">
        <p>
          Owner dashboard logins are for house staff only. Keep your password private, and tell the owners right away if you think someone else has used your account.
        </p>
      </LegalSection>

      <LegalSection title="The fine print">
        <p>
          We work to keep the site running and accurate, but we can&apos;t promise it will always be available or free of mistakes. We are not responsible for losses caused by the site being down or by an error on it, as far as the law allows. These terms follow the laws of Virginia.
        </p>
        <p>
          If we change these terms, we will update this page and the date at the top. How we handle your information is explained on our{" "}
          <Link href="/privacy" className={link}>
            privacy page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          Call the house at{" "}
          <a href={house.phoneHref} className={link}>
            {house.phone}
          </a>{" "}
          or visit us at {house.address}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
