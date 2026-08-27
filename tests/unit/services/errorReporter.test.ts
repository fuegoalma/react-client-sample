import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConsoleErrorReporter, NoopErrorReporter } from '@/services'

describe('ConsoleErrorReporter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports a failure with the context it was given', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reporter = new ConsoleErrorReporter()

    reporter.reportError(new Error('Rendering blew up'), { source: 'render' })

    expect(error).toHaveBeenCalledWith(
      '[error] render',
      expect.objectContaining({ message: 'Rendering blew up' }),
    )
  })

  it('takes a failure with no context at all', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reporter = new ConsoleErrorReporter()

    reporter.reportError('something threw a string')

    expect(error).toHaveBeenCalledWith('[error] unknown', 'something threw a string')
  })

  it('quotes the request id, which is what makes a report searchable', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reporter = new ConsoleErrorReporter()
    const failure = {
      code: 500,
      errorCode: 'server_error',
      message: 'Boom',
      fieldErrors: {},
      requestId: 'req-abc',
    }

    reporter.reportError(failure, { source: 'boundary' })

    expect(error).toHaveBeenCalledWith('[error] boundary request req-abc', failure)
  })

  it('says nothing about an id a failure does not carry', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reporter = new ConsoleErrorReporter()
    const failure = { code: 0, errorCode: 'network_error', message: 'Offline', fieldErrors: {} }

    reporter.reportError(failure, { source: 'unhandled' })

    expect(error).toHaveBeenCalledWith('[error] unhandled', failure)
  })

  it('reports a metric as a value, not as an error', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const reporter = new ConsoleErrorReporter()

    reporter.reportMetric({ name: 'LCP', value: 1234.5, rating: 'good' })

    expect(info).toHaveBeenCalledWith('[metric] LCP', '1234.5 (good)')
  })
})

describe('NoopErrorReporter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('says nothing at all, which is what a test run wants', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const reporter = new NoopErrorReporter()

    reporter.reportError(new Error('ignored'), { source: 'render' })
    reporter.reportMetric({ name: 'CLS', value: 0.01, rating: 'good' })

    expect(error).not.toHaveBeenCalled()
    expect(info).not.toHaveBeenCalled()
  })
})
