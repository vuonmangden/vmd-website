-- NTF-001: Queue and Outbox — notification tables
-- Tech Spec §10.37, §10.38

CREATE TABLE notification_jobs (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code            VARCHAR(80)  NOT NULL,
    recipient_type           VARCHAR(30)  NOT NULL,
    recipient_reference_id   UUID         NOT NULL,
    email                    CITEXT,
    phone                    VARCHAR(20),
    payload                  JSONB        NOT NULL,
    scheduled_at             TIMESTAMPTZ  NOT NULL,
    status                   VARCHAR(30)  NOT NULL DEFAULT 'pending',
    deduplication_key        VARCHAR(180) NOT NULL,
    attempt_count            INTEGER      NOT NULL DEFAULT 0,
    last_error               TEXT,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at             TIMESTAMPTZ,
    CONSTRAINT uq_notification_jobs_dedup UNIQUE (deduplication_key)
);

-- §62.6.1 Index bắt buộc
CREATE INDEX idx_notification_jobs_status_scheduled ON notification_jobs (status, scheduled_at);

CREATE TABLE notification_deliveries (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID        NOT NULL REFERENCES notification_jobs(id),
    channel             VARCHAR(30) NOT NULL,
    provider            VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(150),
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    response_data       JSONB,
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ
);
