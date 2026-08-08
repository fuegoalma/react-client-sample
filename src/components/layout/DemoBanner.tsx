/**
 * Says out loud that nothing here is real.
 *
 * The published demo answers every request from the same mock API the test
 * suite runs against, so a visitor can create albums, upload photos and hand
 * themselves roles — and none of it survives a reload. Without this they would
 * reasonably assume they had reached a live system.
 */
export function DemoBanner() {
  return (
    <div className="demoBanner" role="note">
      <strong>Demo.</strong> Every response comes from an in-browser mock of the API — the same one
      the test suite uses. Data is invented and resets when you reload. Sign in as{' '}
      <code>ada@example.com</code> / <code>secret123</code>.
    </div>
  )
}
