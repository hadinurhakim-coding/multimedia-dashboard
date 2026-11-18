CREATE SCHEMA IF NOT EXISTS app_security;
-- statement-breakpoint
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS app_security.rate_limits (
  bucket_key text PRIMARY KEY CHECK (length(bucket_key) <= 100),
  request_count integer NOT NULL,
  reset_at timestamptz NOT NULL,
  blocked_until timestamptz NOT NULL,
  strikes integer NOT NULL,
  expires_at timestamptz NOT NULL
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS rate_limits_expiry_idx ON app_security.rate_limits (expires_at);
-- statement-breakpoint
REVOKE ALL ON app_security.rate_limits FROM PUBLIC;
-- statement-breakpoint
CREATE OR REPLACE FUNCTION app_security.consume_limit(p_key text, p_limit integer, p_window integer, p_cooldown integer)
RETURNS TABLE(allowed boolean, retry_after integer, newly_blocked boolean)
LANGUAGE plpgsql SET search_path = pg_catalog, app_security AS $$
DECLARE
  bucket app_security.rate_limits%ROWTYPE;
  moment timestamptz := clock_timestamp();
BEGIN
  IF length(p_key) > 100 OR p_limit < 1 OR p_window < 1 OR p_cooldown < 1 THEN
    RAISE EXCEPTION 'Invalid rate policy';
  END IF;
  -- A short transaction lock keeps admission and the row cap atomic across all instances.
  PERFORM pg_advisory_xact_lock(719026441);
  moment := clock_timestamp();
  DELETE FROM app_security.rate_limits WHERE bucket_key IN (
    SELECT bucket_key FROM app_security.rate_limits WHERE expires_at <= moment ORDER BY expires_at LIMIT 500
  );
  SELECT * INTO bucket FROM app_security.rate_limits WHERE bucket_key = p_key;
  IF NOT FOUND THEN
    IF (SELECT count(*) FROM app_security.rate_limits) >= 10000 THEN
      RETURN QUERY SELECT false, 60, false; RETURN;
    END IF;
    INSERT INTO app_security.rate_limits VALUES (p_key, 0, moment + make_interval(secs => p_window), moment, 0, moment + make_interval(secs => p_window * 2)) RETURNING * INTO bucket;
  END IF;
  IF bucket.blocked_until > moment THEN
    RETURN QUERY SELECT false, greatest(1, ceil(extract(epoch FROM bucket.blocked_until - moment))::integer), false; RETURN;
  END IF;
  IF bucket.reset_at <= moment THEN
    bucket.request_count := 0;
    bucket.reset_at := moment + make_interval(secs => p_window);
  END IF;
  IF bucket.request_count >= p_limit THEN
    bucket.strikes := least(bucket.strikes + 1, 5);
    bucket.blocked_until := greatest(bucket.reset_at, moment + make_interval(secs => least(p_cooldown * power(2, bucket.strikes - 1)::integer, 900)));
    UPDATE app_security.rate_limits SET strikes = bucket.strikes, blocked_until = bucket.blocked_until, expires_at = bucket.blocked_until + make_interval(secs => p_window * 2) WHERE bucket_key = p_key;
    RETURN QUERY SELECT false, greatest(1, ceil(extract(epoch FROM bucket.blocked_until - moment))::integer), true; RETURN;
  END IF;
  UPDATE app_security.rate_limits SET request_count = bucket.request_count + 1, reset_at = bucket.reset_at, expires_at = greatest(bucket.expires_at, bucket.reset_at + make_interval(secs => p_window)) WHERE bucket_key = p_key;
  RETURN QUERY SELECT true, 0, false;
END;
$$;
-- statement-breakpoint
REVOKE ALL ON FUNCTION app_security.consume_limit(text, integer, integer, integer) FROM PUBLIC;
-- statement-breakpoint
-- Provision this non-admin role separately. It has no business/auth table access.
GRANT USAGE ON SCHEMA app_security TO app_security_runtime;
-- statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON app_security.rate_limits TO app_security_runtime;
-- statement-breakpoint
GRANT EXECUTE ON FUNCTION app_security.consume_limit(text, integer, integer, integer) TO app_security_runtime;
