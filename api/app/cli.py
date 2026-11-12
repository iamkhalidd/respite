"""Owner accounts from the command line.

    python -m app.cli create-admin you@example.com "Your Name"
    python -m app.cli reset-password you@example.com
"""

import getpass
import sys

from sqlalchemy import func, select

from .db import Base, SessionLocal, engine
from .models import AdminUser
from .security import hash_password


def _password() -> str:
    while True:
        p = getpass.getpass("Password (10+ characters): ")
        if len(p) < 10:
            print("Too short.")
        elif p != getpass.getpass("Again: "):
            print("Those don't match.")
        else:
            return p


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[0] not in ("create-admin", "reset-password"):
        print(__doc__)
        return 1
    Base.metadata.create_all(engine)
    email = argv[1].lower()
    with SessionLocal() as db:
        user = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email))
        if argv[0] == "create-admin":
            if user:
                print("That account already exists. Use reset-password.")
                return 1
            db.add(AdminUser(email=email, name=argv[2] if len(argv) > 2 else "", passwordHash=hash_password(_password())))
        else:
            if not user:
                print("No account with that email.")
                return 1
            user.passwordHash = hash_password(_password())
            user.tokenVersion += 1
        db.commit()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
