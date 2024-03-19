/**
 * Edge represents a single edge within a paginated result set.
 */
export interface Edge<T> {
  /**
   * node holds the value of the Edge.
   */
  node: T
}

/**
 * PageInfo is metadata associated with the page of results.
 */
export interface PageInfo {
  /**
   * endCursor is the cursor for the end of the current page. If there is a next
   * page available, this is the cursor to pass in the next lookup call.
   */
  endCursor: string

  /**
   * hasNextPage indicates whether there is a next page of results available.
   */
  hasNextPage: boolean
}

/**
 * PaginatedResponse represents a response containing a page of results.
 */
export interface PaginatedResponse<T> {
  /**
   * edges are the edges holding the results.
   */
  edges: Edge<T>[]

  /**
   * pageInfo is the metadata for this page.
   */
  pageInfo: PageInfo
}

export const PAGE_INFO_FRAGMENT = `
  pageInfo {
    endCursor
    hasNextPage
  }
`;

/**
 * MutationErrorCode are the errors defined for Mutations.
 */
export enum MutationErrorCode {
  NOT_FOUND = "NOT_FOUND",
  INVALID_REQUEST = "INVALID_REQUEST"
}

/**
 * MutationError represents an error raised during a mutation.
 * 
 * NOTE: These errors are distinct from Apollo errors, which usually indicate
 * an application error rather than a user error.
 */
export interface MutationError {
  code: MutationErrorCode
  details: string
}

/**
 * WithErrors represents the possible error data returning in a mutation.
 */
export interface WithErrors {
  ok: boolean
  errors: MutationError[]
}

export const WITH_ERRORS_FRAGMENT = `
  ok
  errors {
      code
      details
  }
`;

/**
 * Retrieves the paginated result set down to the list of items returned.
 * @param resp The paginated response.
 */
export function GetPages<T>(resp: (PaginatedResponse<T> | undefined)): (T[] | undefined) {
  if (resp === null || resp === undefined) {
    return undefined
  }

  return resp.edges.map((nodeContainer) => nodeContainer.node)
}

/**
 * Returns whether there is a next page of results available in the paginated response.
 * @param resp The paginated response.
 */
export function HasNextPage<T>(resp: (PaginatedResponse<T> | undefined)): boolean {
  if (resp === null || resp === undefined) {
    return false
  }

  return resp.pageInfo.hasNextPage
}

