import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost, apiPatch, apiDelete } from '../api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function okResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(data),
  })
}

function errorResponse(status: number, statusText: string) {
  return Promise.resolve({
    ok: false,
    status,
    statusText,
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('apiGet', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ id: 1 }))
    const result = await apiGet<{ id: number }>('/api/test')
    expect(result).toEqual({ id: 1 })
  })

  it('throws ApiError with correct status on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(404, 'Not Found'))
    await expect(apiGet('/api/test')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    })
  })
})

describe('apiPost', () => {
  it('sends POST with Content-Type and serialised body', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ ok: true }))
    await apiPost('/api/test', { name: 'value' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'value' }),
      }),
    )
  })

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(500, 'Internal Server Error'))
    await expect(apiPost('/api/test', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    })
  })
})

describe('apiPatch', () => {
  it('sends PATCH with Content-Type and serialised body', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ updated: true }))
    await apiPatch('/api/test/1', { watched: true })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test/1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watched: true }),
      }),
    )
  })

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(422, 'Unprocessable Entity'))
    await expect(apiPatch('/api/test/1', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
    })
  })
})

describe('apiDelete', () => {
  it('resolves on 204 without parsing body', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: 'No Content' }),
    )
    await expect(apiDelete('/api/test/1')).resolves.toBeUndefined()
  })

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(403, 'Forbidden'))
    await expect(apiDelete('/api/test/1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
    })
  })
})
