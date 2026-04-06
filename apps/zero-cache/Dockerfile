FROM rocicorp/zero:1.0.0

HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=5 \
  CMD curl -fsS http://127.0.0.1:4848/keepalive >/dev/null || exit 1
