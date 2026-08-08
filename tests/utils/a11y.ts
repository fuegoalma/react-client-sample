import axe from 'axe-core'
import { expect } from 'vitest'

/**
 * Runs axe over a rendered tree and asserts it found nothing.
 *
 * `color-contrast` is off because the functional project renders with
 * `css: false` — axe would be judging colours no stylesheet ever set, and its
 * answer would describe jsdom's defaults rather than this application. Contrast
 * is asserted where it can actually be seen: `tests/e2e/styling.spec.ts`, the
 * one suite that loads the real stylesheet.
 *
 * The violations are compared as a list of strings rather than through a custom
 * matcher, so a failure names the rule and the element instead of printing an
 * object — and so the assertion reads the same here as in the Playwright suite.
 */
export async function expectNoViolations(container: Element): Promise<void> {
  const { violations } = await axe.run(container, {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    rules: { 'color-contrast': { enabled: false } },
  })

  expect(
    violations.map(
      (violation) =>
        `${violation.id}: ${violation.help} — ${violation.nodes.map((node) => node.html).join(', ')}`,
    ),
  ).toEqual([])
}
