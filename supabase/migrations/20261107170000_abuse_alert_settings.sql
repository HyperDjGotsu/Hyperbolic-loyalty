-- Thresholds for the network-admin misuse alerts (HQ -> Settings). Null = use the built-in defaults.
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS abuse_alert_settings jsonb;
