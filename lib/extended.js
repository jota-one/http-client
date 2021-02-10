import Axios from 'axios'
import { hateoas } from './http'
import { isString, isEmpty, get, set, cloneDeep, compact } from 'lodash-es'

const cancelRequestResult = { HateoasClientRequestCancelled: true }
const $mixins = []

export const registerMixin = function (name, mixin) {
  $mixins[name] = mixin
}

export const use = function (client, mixin) {
  if (typeof mixin !== 'function') {
    if (typeof $mixins[mixin] !== 'function') {
      throw new Error(`Mixin ${mixin} is not a function.`)
    }
    mixin = $mixins[mixin]
  }

  mixin(client)
}

export default function ({ axiosConfig, rootEndpoint = '/index', enableLogging = false, disableCache = false, withVerbsRestrictions = false, responseProcessors = [] }) {
  const client = hateoas({
    withCredentials: true,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
    ...axiosConfig
  })

  let $cache = {}

  const getRootIndex = async () => {
    // if the uri has a .js or .json extension, we assume it's
    // a fallback local file to load instead of a remote endpoint.
    if (['js', 'json'].includes(rootEndpoint.split('.').pop())) {
      const module = await import('@/' + rootEndpoint)
      return module.default
    }

    return client.loadIndex(rootEndpoint)
  }

  const prepareResource = (resource, rel, verb) => {
    if (!resource.links) {
      throw new Error(
        'Trying to follow a link on a badly formatted resource. Resources should contain a "links" property.',
      )
    }

    // from here we have to clone the resource to avoid mutate it for further calls
    const cleanResource = cloneDeep(resource)

    const link = cleanResource.links.find(l => l.rel === rel)
    if (!link) {
      throw new Error(
        `Impossible to follow the link [${rel}]. It's not registered in the provided resource.`,
      )
    }

    if (withVerbsRestrictions && (link.verbs || []).length > 0) {
      const verbConfig = link.verbs.find(v => v.verb === verb)
      if (!verbConfig) {
        throw new Error(
          `Impossible to follow the link [${rel}] with the verb [${verb}]. It's not registered in the provided resource.`,
        )
      }
      link.href += verbConfig.querystring || ''
    }
    return cleanResource
  }

  const getCachedValue = async (
    resource,
    key,
    params = {},
    axiosOptions = {},
    prefixes = [],
    suffixes = [],
    noCache = false
  ) => {
    // define what to fetch
    let loadFn = cachePath =>
      followLink(resource, key, params, axiosOptions, cachePath)
    if (!resource && !key) {
      loadFn = () => getRootIndex()
    }
    if (noCache) {
      return loadFn()
    }

    // define where to store the promise
    const cachePath = compact(prefixes)
      .concat([key, JSON.stringify(params)])
      .concat(compact(suffixes))
      .join('.')

    log('state of the cache', cloneDeep($cache))

    if (!get($cache, cachePath)) {
      try {
        const promise = loadFn(cachePath)
        set($cache, cachePath, promise)
        await promise // await for the promise resolution to handle its potential failure
        log(
          '%c%s',
          'color: orange; font-weight: bold;',
          'cache promise under key:',
          cachePath,
        )
      } catch (err) {
        // if the promise resolves to a specific object that indicates
        // that the request has been cancelled, we will also invalidate the cache silently.
        set($cache, cachePath, null)
        throw err
      }
    } else {
      log(
        '%c%s',
        'color: #5BAC26; font-weight: bold;',
        'promise already cached under key:',
        cachePath,
        '-> Return it directly.',
      )
    }
    return get($cache, cachePath)
  }

  const followLink = async (resource, key, params, axiosOptions, cachePath) => {
    try {
      const verb = (axiosOptions.method || 'get').toLowerCase()
      resource = prepareResource(resource, key, verb)
      let r = await client.followLink(resource, key, params, axiosOptions)

      for (let proc of responseProcessors) {
        r = await proc(r, axiosOptions)
      }

      return r
    } catch (err) {
      // if the request was manually cancelled, we throw something different that will be caught later
      if (Axios.isCancel(err)) {
        console.info('Request canceled:', err.message)
        throw Object.assign({}, cancelRequestResult, { cachePath }) // this be used to invalidate the cache
      } else {
        throw err.response
      }
    }
  }

  const log = (...args) => {
    if (enableLogging) {
      console.log(...args)
    }
  }

  return {
    cacheDisabled: disableCache,
    axios: client,

    nocache() {
      return this.cacheDisabled
        ? this
        : Object.assign(cloneDeep(this), { cacheDisabled: true })
    },

    generateCanceller() {
      return Axios.CancelToken.source()
    },

    isCancel(e) {
      return e.HateoasClientRequestCancelled
    },

    clearCache(path = '', params = {}) {
      log(
        '%c%s',
        'color: red; font-weight: bold;',
        'clear cache with path',
        path,
        params,
      )
      if (!path && isEmpty(params)) {
        $cache = {}
      } else {
        const keyToDelete =
          path.split('/').join('.') +
          (!isEmpty(params) ? '.' + JSON.stringify(params) : '')
        log('key to delete:', keyToDelete)
        set($cache, keyToDelete, null)
      }
      log('after clear', cloneDeep($cache))
    },

    resetCache() {
      $cache = {}
    },

    async get(hpath, params = {}, axiosOptions = {}, suffixes = []) {
      const prefixes = []
      const modules = [null].concat(hpath ? hpath.split('/') : [])
      let result = null

      let iterations = modules.length
      for (let module of modules) {
        iterations--
        const getParams = !iterations ? params : {}
        const addSuffixes = !iterations ? suffixes : []
        result = await getCachedValue(
          result,
          module,
          getParams,
          axiosOptions,
          prefixes,
          addSuffixes,
          disableCache || (this.cacheDisabled && (resource || key))
        )
        prefixes.push(module)
      }

      return result
    },

    async follow(
      resource,
      rel,
      params = {},
      axiosOptions = {},
      cachePrefixes = ['followed'],
      cacheSuffixes = []
    ) {
      return getCachedValue(
        resource,
        rel,
        params,
        axiosOptions,
        cachePrefixes,
        cacheSuffixes,
        disableCache || (this.cacheDisabled && (resource || key))
      )
    },

    async post(
      resource,
      rel,
      payload = {},
      axiosOptions = {},
      urlPlaceholders = {},
    ) {
      if (!resource) {
        resource = await getRootIndex()
      } else if (isString(resource)) {
        resource = await this.get(resource)
        log(resource, rel)
      }

      return followLink(resource, rel, urlPlaceholders, {
        method: 'post',
        data: payload,
        ...axiosOptions,
      })
    },

    async put(resource, rel, payload, axiosOptions = {}, urlPlaceholders = {}) {
      if (!resource) {
        resource = await getRootIndex()
      } else if (isString(resource)) {
        resource = await this.get(resource)
        log(resource, rel)
      }

      return followLink(resource, rel, urlPlaceholders, {
        method: 'put',
        data: payload,
        ...axiosOptions,
      })
    },

    delete(resource, rel, params = {}) {
      return followLink(resource, rel, params, {
        method: 'delete',
      })
    }
  }
}
