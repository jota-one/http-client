import { describe, expect, it, beforeAll, afterEach } from 'vitest'
import http, { hateoas } from '../lib/http'
import axios, { Axios } from 'axios'
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
    mock.onGet('http://some.site/users').reply(200, users);

    // when
    const result = await client.getEndpoint('http://some.site/users')

    // then
    expect(mock.history.get[0].params).toEqual({t: 'randomly-generated-string' });
    expect(result).toEqual(users);
  })

  it('is still an Axios instance', () => {
    const client = http()
    console.log(client instanceof Axios)
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
    console.log(client instanceof Axios)
  })
})
