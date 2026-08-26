import { useParams } from 'react-router-dom'

export interface NumericParam {
  readonly id: number
  /** Pass to a query's options: a non-numeric address must not be requested. */
  readonly skip: boolean
}

/**
 * A record id read out of the address.
 *
 * Every detail screen parsed its own and then had to remember to skip the query
 * when the parse failed — `Number('x')` is `NaN`, and a request for
 * `/albums/NaN` is a 404 the client asked for. Reading the id and deciding
 * whether it may be used are one answer, so they are returned together.
 */
export function useNumericParam(name: string): NumericParam {
  const params = useParams()
  const id = Number(params[name])

  return { id, skip: Number.isNaN(id) }
}
