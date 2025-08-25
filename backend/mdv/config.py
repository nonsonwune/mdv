from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    env: str = Field(default="dev", alias="ENV")
    app_url: str = Field(default="http://localhost:3000", alias="APP_URL")

    database_url: str = Field(..., alias="DATABASE_URL")
    redis_url: str = Field(..., alias="REDIS_URL")

    paystack_public_key: Optional[str] = Field(default=None, alias="PAYSTACK_PUBLIC_KEY")
    paystack_secret_key: Optional[str] = Field(default=None, alias="PAYSTACK_SECRET_KEY")

    resend_api_key: Optional[str] = Field(default=None, alias="RESEND_API_KEY")
    resend_from: Optional[str] = Field(default=None, alias="RESEND_FROM")
    email_from_domain: Optional[str] = Field(default=None, alias="EMAIL_FROM_DOMAIN")
    cloudinary_url: Optional[str] = Field(default=None, alias="CLOUDINARY_URL")

    jwt_secret: str = Field(..., alias="JWT_SECRET")

    # Feature flags / settings
    enable_gig_api: bool = Field(default=False, alias="ENABLE_GIG_API")
    enable_sms: bool = Field(default=False, alias="ENABLE_SMS")
    enable_reservations: bool = Field(default=True, alias="ENABLE_RESERVATIONS")
    enable_same_day_lagos: bool = Field(default=False, alias="ENABLE_SAME_DAY_LAGOS")
    coupon_applies_to_discounted: bool = Field(default=False, alias="COUPON_APPLIES_TO_DISCOUNTED")
    free_shipping_threshold_lagos: int = Field(default=50000, alias="FREE_SHIPPING_THRESHOLD_LAGOS")
    default_refund_method: str = Field(default="paystack", alias="DEFAULT_REFUND_METHOD")

    otel_exporter_otlp_endpoint: Optional[str] = Field(default=None, alias="OTEL_EXPORTER_OTLP_ENDPOINT")
    sentry_dsn: Optional[str] = Field(default=None, alias="SENTRY_DSN")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

