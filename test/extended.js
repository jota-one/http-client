import {afterEach, beforeAll, describe, expect, it} from 'vitest'
import extended from '../lib/extended'
import axios from 'axios'
import MockAdapter from "axios-mock-adapter"

describe('extended', () => {
  let mock

  beforeAll(() => {
    mock = new MockAdapter(axios)
  })

  afterEach(() => {
    mock.reset()
  })

  it('has a direct access to underlying axios instance', () => {
    const client = extended()
    expect(client.axios.create).toBeDefined()
  })

  it('reads hateoas index to resolve get queries', async () => {
    const client = extended({
      rootEndpoint: {
        links: [{
          rel: 'users',
          href: 'http://some.site/users',
        }]
      }
    })
    mock.onGet('http://some.site/users').reply(200, { users: true })
    mock.onGet('http://some.site/things').reply(200, { things: true })

    const result = await client.get('users')

    expect(mock.history.get[0].url).toEqual('http://some.site/users')
    expect(result).toEqual({ users: true })
  })

  it('caches get requests depending on path', async () => {
    const client = extended({
      rootEndpoint: {
        links: [{
          rel: 'users',
          href: 'http://some.site/users',
        }, {
          rel: 'user',
          href: 'http://some.site/users/{id}',
        }]
      }
    })
    mock.onGet('http://some.site/users').reply(200, { users: true })
    mock.onGet('http://some.site/users/22').reply(200, { user: 22 })
    mock.onGet('http://some.site/things').reply(200, { things: true })

    const result = await client.get('users')
    const cache = client.getCache()
    const cached = await cache.users['{}']

    expect(cached).toEqual(result)

    const user = await client.get('user', { id: 22})
    const cachedUser = await cache.user['{"id":22}']

    expect(user).toEqual({ user: 22 })
    expect(cachedUser).toEqual(user)
  })
})
