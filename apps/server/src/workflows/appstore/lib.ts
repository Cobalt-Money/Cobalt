import type { NotificationType } from "@cobalt-web/server-data/subscriptions/mutations";

/**
 * Maps an App Store Server Notification V2 type to subscription status.
 */
export function notificationTypeToSubscriptionStatus(
  notificationType: NotificationType,
  currentStatus: string
): string {
  switch (notificationType) {
    case "SUBSCRIBED":
    case "DID_RENEW":
    case "RENEWAL_EXTENDED": {
      return "active";
    }
    case "EXPIRED":
    case "GRACE_PERIOD_EXPIRED": {
      return "expired";
    }
    case "DID_FAIL_TO_RENEW": {
      return "billing_retry";
    }
    case "REFUND":
    case "REVOKE": {
      return "cancelled";
    }
    case "DID_CHANGE_RENEWAL_STATUS": {
      return currentStatus;
    }
    default: {
      return currentStatus;
    }
  }
}
