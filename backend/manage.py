"""Command-line administration.

    python -m backend.manage create-admin --email you@school.edu --name "Your Name"
    python -m backend.manage reset-password --email someone@school.edu
"""
import argparse
import getpass
import sys

import backend.models  # noqa: F401
from backend.auth import generate_temp_password, hash_password, validate_new_password
from backend.database import Base, SessionLocal, engine
from backend.models import User


def _ask_password() -> str:
    while True:
        first = getpass.getpass('New password: ')
        if first != getpass.getpass('Repeat password: '):
            print('Passwords do not match.')
            continue
        try:
            validate_new_password(first)
        except Exception as exc:  # HTTPException carries .detail
            print(getattr(exc, 'detail', exc))
            continue
        return first


def create_admin(email: str, name: str) -> None:
    with SessionLocal() as db:
        email = email.strip().lower()
        if db.query(User).filter(User.email == email).first():
            sys.exit(f'An account with {email} already exists.')
        db.add(User(email=email, name=name, role='admin', password_hash=hash_password(_ask_password()), must_change_password=False))
        db.commit()
        print(f'Administrator {email} created.')


def reset_password(email: str) -> None:
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email.strip().lower()).first()
        if not user:
            sys.exit('No such account.')
        temp = generate_temp_password()
        user.password_hash = hash_password(temp)
        user.must_change_password = True
        user.token_version += 1
        user.is_active = True
        db.commit()
        print(f'Temporary password for {user.email}: {temp}')


def main() -> None:
    parser = argparse.ArgumentParser(prog='python -m backend.manage')
    sub = parser.add_subparsers(dest='command', required=True)
    p_admin = sub.add_parser('create-admin')
    p_admin.add_argument('--email', required=True)
    p_admin.add_argument('--name', default='School Administrator')
    p_reset = sub.add_parser('reset-password')
    p_reset.add_argument('--email', required=True)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    if args.command == 'create-admin':
        create_admin(args.email, args.name)
    else:
        reset_password(args.email)


if __name__ == '__main__':
    main()
