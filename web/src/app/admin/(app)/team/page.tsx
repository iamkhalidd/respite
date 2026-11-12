import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { admin } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
import { shortDate } from "@/lib/format";
import { logout, removeUser, setUserRole } from "../../actions";
import { Page, Card, CardHead, btnQuiet } from "../ui";
import { ConfirmAction } from "../confirm";
import { SubmitButton } from "../submit";
import { InviteForm, PasswordForm } from "./forms";

export const metadata = { title: "Team" };

const ROLE = { OWNER: "Owner", STAFF: "Staff" } as const;

export default async function TeamAdmin() {
  const [me, users] = await Promise.all([admin.get<AdminUser>("/auth/me"), admin.get<AdminUser[]>("/admin/users")]);
  const isOwner = me.role === "OWNER";
  const owners = users.filter((u) => u.role === "OWNER").length;

  return (
    <Page title="Team" eyebrow={`${users.length} ${users.length === 1 ? "login" : "logins"}`}>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <Card>
            <CardHead
              title="Who can log in"
              hint={isOwner ? "Staff can do everything in the dashboard except change who's on this list." : "Only an owner can add or remove people."}
            />
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {users.map((u) => {
                const self = u.id === me.id;
                const lastOwner = u.role === "OWNER" && owners === 1;
                return (
                  <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="truncate">{u.name || u.email}</span>
                        {self && <span className="mono shrink-0 text-[0.68rem] uppercase text-moss">You</span>}
                      </p>
                      <p className="truncate text-[0.86rem] text-moss">
                        {u.name ? `${u.email} · ` : ""}
                        {u.lastLoginAt ? `Last in ${shortDate(u.lastLoginAt)}` : "Hasn't logged in yet"}
                      </p>
                    </div>
                    <span className={`mono inline-flex h-6 items-center rounded-full px-2.5 text-[0.7rem] font-medium uppercase ${u.role === "OWNER" ? "bg-ink text-white" : "bg-ink/[.06] text-ink"}`}>
                      {ROLE[u.role]}
                    </span>
                    {isOwner && !self && (
                      <div className="flex w-full gap-2 sm:w-auto">
                        {!(lastOwner && u.role === "OWNER") && (
                          <form action={setUserRole.bind(null, u.id, u.role === "OWNER" ? "STAFF" : "OWNER")} className="flex-1 sm:flex-none">
                            <SubmitButton className={`${btnQuiet} w-full`}>{u.role === "OWNER" ? "Make staff" : "Make owner"}</SubmitButton>
                          </form>
                        )}
                        <ConfirmAction
                          action={removeUser.bind(null, u.id)}
                          label="Remove"
                          className={`${btnQuiet} flex-1 !text-ember sm:flex-none`}
                          title={`Remove ${u.name || u.email}?`}
                          body="They're signed out at once and can't log in again unless you add them back."
                          confirmLabel="Remove"
                          danger
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          {isOwner && (
            <div>
              <InviteForm />
            </div>
          )}
        </div>

        <div className="grid gap-5">
          <Card>
            <CardHead title="Your password" hint="Changing it signs you out everywhere else." />
            <PasswordForm />
          </Card>
          <Card className="p-2">
            <Link href="/" target="_blank" className="flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors hover:bg-ink/[.04]">
              <ArrowUpRight size={17} className="text-moss" /> View public site
            </Link>
            <form action={logout}>
              <button className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors hover:bg-ink/[.04]">
                <LogOut size={16} className="text-moss" /> Log out
              </button>
            </form>
          </Card>
        </div>
      </div>
    </Page>
  );
}
