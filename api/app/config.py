from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=API_DIR / ".env", extra="ignore")

    # SQLite for local work; a postgres:// URL (Neon) for hosting.
    database_url: str = f"sqlite:///{(API_DIR / 'respite.db').as_posix()}"

    # Signs owner login tokens. Must be long and random in production.
    jwt_secret: str = "dev-only-change-me"
    jwt_minutes: int = 60 * 24 * 7

    # The public website. Used to build pay links and Stripe return URLs.
    site_url: str = "http://localhost:3000"
    # Browsers allowed to call the API directly. The Next.js site calls it server-side and doesn't need this.
    cors_origins: str = "http://localhost:3000"

    # First owner account, created on startup when there are no accounts yet.
    admin_email: str = ""
    admin_password: str = ""
    admin_name: str = "Owner"

    owner_email: str = ""
    email_from: str = "onboarding@resend.dev"
    resend_api_key: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    cron_secret: str = ""

    # Text messages (optional, Twilio charges per message). Off unless all three are set.
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from: str = ""  # the Twilio number texts come from, e.g. +15405550100

    # Overdue rent: one reminder this many days after the due date.
    overdue_after_days: int = 3

    # The outbox worker sends queued emails in the background. Turn it off on hosts that can't
    # run a background thread, and call /cron/notifications every minute instead.
    notify_worker: bool = True
    notify_poll_seconds: float = 15

    # Room photos: Vercel Blob when a token is set, otherwise a local folder.
    blob_read_write_token: str = ""
    upload_dir: Path = API_DIR.parent / "web" / "public" / "uploads"
    upload_url_prefix: str = "/uploads"
    # Set on hosts with a read-only disk so the dashboard hides the photo uploader.
    read_only_disk: bool = False

    @property
    def sqlalchemy_url(self) -> str:
        url = self.database_url
        if url.startswith("sqlite:///./"):  # relative to the api folder, wherever it's run from
            url = f"sqlite:///{(API_DIR / url[len('sqlite:///./') :]).as_posix()}"
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        return url

    @property
    def sms_enabled(self) -> bool:
        return bool(self.twilio_account_sid and self.twilio_auth_token and self.twilio_from)

    @property
    def stripe_enabled(self) -> bool:
        return bool(self.stripe_secret_key)

    @property
    def can_upload_photos(self) -> bool:
        return bool(self.blob_read_write_token) or not self.read_only_disk


@lru_cache
def get_settings() -> Settings:
    return Settings()
