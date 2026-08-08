import type { Meta, StoryObj } from '@storybook/react-vite'
import { Provider } from 'react-redux'

import { createAppStore } from '@/app/store'
import { notified } from '@/app/notificationsSlice'
import { InMemoryTokenStorage } from '@/services'

import { ToastStack } from './ToastStack'

/**
 * Transient feedback any layer can raise — including the transport, when
 * re-authentication fails. The stack ignores pointer events so a lingering
 * toast can never swallow a click meant for the page beneath it.
 */
const meta = {
  title: 'UI/ToastStack',
  component: ToastStack,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ToastStack>

export default meta

function withMessages(messages: { variant: 'success' | 'danger'; message: string }[]) {
  const store = createAppStore({ tokenStorage: new InMemoryTokenStorage() })
  for (const entry of messages) store.dispatch(notified(entry.variant, entry.message))

  return (
    <Provider store={store}>
      <div className="p-5">
        <ToastStack />
      </div>
    </Provider>
  )
}

export const Success: StoryObj = {
  render: () => withMessages([{ variant: 'success', message: '“Vacation 2025” was created.' }]),
}

/** An error stays until dismissed — a 409 explains which rule refused the change. */
export const Failure: StoryObj = {
  render: () =>
    withMessages([{ variant: 'danger', message: 'The last role manager cannot lose that role.' }]),
}
