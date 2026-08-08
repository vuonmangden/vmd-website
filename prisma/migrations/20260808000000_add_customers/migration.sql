-- BKG-001: Customer Core
-- Tech Spec §10.6

CREATE TABLE customers (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code       VARCHAR(30) NOT NULL,
    full_name           VARCHAR(150) NOT NULL,
    phone_normalized    VARCHAR(20),
    email_normalized    CITEXT,
    source              VARCHAR(50) NOT NULL DEFAULT 'DIRECT',
    marketing_consent   BOOLEAN     NOT NULL DEFAULT FALSE,
    privacy_consent_at  TIMESTAMPTZ,
    notes               TEXT,
    first_booking_at    TIMESTAMPTZ,
    last_booking_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT uq_customers_customer_code UNIQUE (customer_code)
);

-- §62.6.1 Index bắt buộc
CREATE INDEX idx_customers_phone_normalized ON customers (phone_normalized);
CREATE INDEX idx_customers_email_normalized ON customers (email_normalized);
