interface EmailVerificationBadgeProps {
  readonly verified: boolean
}

/**
 * Whether the address has been proven.
 *
 * The API records verification and enforces nothing on it, so this says what is
 * true without implying a consequence that does not exist: an unconfirmed
 * account is not restricted, and calling it "pending" rather than "required"
 * is the difference.
 */
export function EmailVerificationBadge({ verified }: EmailVerificationBadgeProps) {
  return verified ? (
    <span className="badge text-bg-success">Confirmed</span>
  ) : (
    <span className="badge text-bg-secondary">Not confirmed</span>
  )
}
