import { describe, expect, it, beforeAll, afterEach } from 'vitest'
import http, { hateoas } from '../lib/http'
import axios from 'axios'
import MockAdapter from "axios-mock-adapter"


describe('ExtendedAxios', () => {
  let mock

  beforeAll(() => {
    mock = new MockAdapter(axios)
  })

  afterEach(() => {
    mock.reset()
  })

  it('contains extra functions', () => {
    const client = http()
    expect(client.openBinary).toBeDefined()
    expect(client.setCacheBuster).toBeDefined()
    expect(client.removeCacheBuster).toBeDefined()
    expect(client.getEndpoint).toBeDefined()
    expect(client.downloadBinary).toBeDefined()
  })

  it('has a working cachebuster system', async () => {
    const client = http()
    client.setCacheBuster(() => 'randomly-generated-string')

    // given
    const users = [
      { id: 1, name: "John" },
      { id: 2, name: "Andrew" },
    ]
    mock.onGet('http://some.site/users').reply(200, users)

    // when
    const result = await client.getEndpoint('http://some.site/users')

    // then
    expect(mock.history.get[0].params).toEqual({t: 'randomly-generated-string' })
    expect(result).toEqual(users)
  })

  it('is still an Axios instance', () => {
    const client = http()
    expect(client.create).toBeDefined()
  })

  it('should use the Content-Disposition filename if not provided in the call', async () => {
    const client = http()

    // generate a blob content
    const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
    const blob = await fetch(url)
      .then(res => res.blob())

    const filename = 'tépien-pon-c-fussi.png'
    mock.onGet('https://download.com/myfile').reply(200, blob, {
      'Content-Disposition': `attachment; filename="${filename}"`
    })

    const result = await client.downloadBinary('https://download.com/myfile')
    expect(result).toBe(filename)
  })

  it('should support any letter case for content-DisPOsiTion', async () => {
    const client = http()

    // generate a blob content
    const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
    const blob = await fetch(url)
      .then(res => res.blob())

    const filename = 'tépien-pon-c-fussi.png'
    mock.onGet('https://download.com/myfile').reply(200, blob, {
      'content-DisPOsiTion': `attachment; filename="${filename}"`
    })

    const result = await client.downloadBinary('https://download.com/myfile')
    expect(result).toBe(filename)
  })

  it('should use the provided filename if provided', async () => {
    const client = http()

    // generate a blob content
    const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
    const blob = await fetch(url)
      .then(res => res.blob())

    const filename = 'filename-from-frontend.png'
    mock.onGet('https://download.com/myfile').reply(200, blob, {
      'Content-Disposition': `attachment; filename="filename-from-backend.png"`
    })

    const result = await client.downloadBinary('https://download.com/myfile', {}, filename)
    expect(result).toBe(filename)
  })

  it('should handle JSON error response when downloading a file', async () => {
    const client = http()

    const filename = 'filename-from-frontend.png'
    mock.onGet('https://download.com/myfile').reply(500, { error: true }, {
      'Content-Disposition': `attachment; filename="filename-from-backend.png"`
    })

    const result = client.downloadBinary('https://download.com/myfile', {}, filename)
    await expect(result).rejects.toThrow('Request failed with status code 500')
  })

  it('should handle JSON weird error responses with success status when trying to download a file', async () => {
    const client = http()

    const filename = 'filename-from-frontend.png'
    mock.onGet('https://download.com/myfile').reply(200, { error: true }, {
      'Content-Disposition': `attachment; filename="filename-from-backend.png"`
    })

    const result = client.downloadBinary('https://download.com/myfile', {}, filename)
    await expect(result).resolves.toEqual({ error: true })
  })

  it('should throw in case of absence of frontend filename and backend Content-Disposition header', async () => {
    const client = http()

    // generate a blob content
    const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
    const blob = await fetch(url)
      .then(res => res.blob())

    mock.onGet('https://download.com/myfile').reply(200, blob)

    const result = client.downloadBinary('https://download.com/myfile')
    await expect(result).rejects.toThrow('No filename has been found neither in the frontend call or in the Content-Disposition header.')
  })

  it('should throw in case of absence of frontend filename and backend Content-Disposition without filename', async () => {
    const client = http()

    // generate a blob content
    const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
    const blob = await fetch(url)
      .then(res => res.blob())

    mock.onGet('https://download.com/myfile').reply(200, blob, {
      'Content-Disposition': 'attachment'
    })

    const result = client.downloadBinary('https://download.com/myfile')
    await expect(result).rejects.toThrow('No filename has been found neither in the frontend call or in the Content-Disposition header.')
  })
})

describe('HateoasAxios', () => {
  it('contains more extra functions', () => {
    const client = hateoas()
    expect(client.openBinary).toBeDefined()
    expect(client.setCacheBuster).toBeDefined()
    expect(client.removeCacheBuster).toBeDefined()
    expect(client.getEndpoint).toBeDefined()
    expect(client.downloadBinary).toBeDefined()
    expect(client.loadIndex).toBeDefined()
    expect(client.resolveUri).toBeDefined()
    expect(client.getRelEndpoint).toBeDefined()
    expect(client.followLink).toBeDefined()
  })

  it('is still an Axios instance', () => {
    const client = hateoas()
    expect(client.create).toBeDefined()
  })
})
