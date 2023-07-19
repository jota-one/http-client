import { hateoas } from './http.js'
import merge from 'lodash.merge'
import cloneDeep from 'lodash.clonedeep'

const cancelRequestResult = { HateoasClientRequestCancelled: true }
const $mixins = []

const get = function (obj, path = '', defaultValue) {
  const result = path.split('.').reduce((r, p) => {
    if (typeof r === 'object' && r !== null) {
      p = p.startsWith('[') ? p.replace(/\D/g, '') : p

      return r[p]
    }

    return undefined
  }, obj)

  return result === undefined ? defaultValue : result
}

// inspired by https://github.com/lukeed/dset
const set = function (obj, keys, val) {
  keys.split && (keys = keys.split('.'))
  let i = 0
  const l = keys.length
  let t = obj
  let x
  let k
  while (i < l) {
    k = keys[i++]
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') break
    t = t[k] =
      i === l
        ? val
        : typeof (x = t[k]) === typeof keys && t[k] !== null
          ? x
          : keys[i] * 0 !== 0 || !!~('' + keys[i]).indexOf('.')
            ? {}
            : []
  }
}

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

export default function extended({
  axiosConfig = {},
  axiosConfigCb = () => Promise.resolve({}),
  rootEndpoint = '/index',
  rootIndexLinksPath = '',
  allowedLinksProperties = ['_links', 'links'],
  enableLogging = false,
  disableCache = false, // deprecated -> use `cacheStrategy: 'all'` instead and remove when releasing v1.0.0
  cacheStrategy = 'all',
  withVerbsRestrictions = false,
  responseProcessors = []
} = {}) {
  const client = hateoas({
    withCredentials: true,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
    ...axiosConfig
  })
  cacheStrategy = disableCache ? 'off' : cacheStrategy // @todo: remove when disableCache is removed

  let $cache = {}

  const getRootIndex = async () => {
    // return the object if passed as endpoint
    if(typeof rootEndpoint === 'object') {
      return rootEndpoint
    }

    return client.loadIndex(rootEndpoint, (await axiosConfigCb()))
      .then(response => {
        const path = rootIndexLinksPath.split('.').filter(prop => Boolean(prop))
        return path.reduce((acc, prop) => {
          if (acc[prop]) {
            return acc[prop]
          }
          return acc
        }, response)
      })
  }

  const prepareResource = (resource, rel, verb) => {
    if (!allowedLinksProperties.some(prop => Boolean(resource[prop]))) {
      throw new Error(
        `Trying to follow a link on a badly formatted resource. Resources should contain one of these properties: ${allowedLinksProperties.join(', ')}`,
      )
    }

    // from here we have to clone the resource to avoid mutate it for further calls
    const cleanResource = cloneDeep(resource)

    const links = allowedLinksProperties.reduce((acc, prop) => acc || cleanResource[prop], null)

    // ensure that the hateoas links are always formatted as an array of { rel: ..., href:... } objects.
    let foundLinks = cloneDeep(links)
    if (!Array.isArray(foundLinks)) {
      foundLinks = Object.entries(foundLinks).reduce((acc, [rel, def]) => {
        return acc.concat([{
          rel,
          ...def
        }])
      }, [])
    }

    const link = foundLinks.find(l => l.rel === rel)
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

    // ensure that the hateoas links are always stored in a 'links' property.
    cleanResource.links = foundLinks
    return cleanResource
  }

  const getCachedValue = async (
    resource,
    key,
    cacheStrategy,
    params = {},
    axiosOptions = {},
    prefixes = [],
    suffixes = []
  ) => {
    // define what to fetch
    let loadFn = cachePath =>
      followLink(resource, key, params, axiosOptions, cachePath)
    const wantsRootIndex = !resource && !key
    if (wantsRootIndex) {
      loadFn = () => getRootIndex()
    }
    if (cacheStrategy === 'off') {
      return loadFn()
    }
    if (!wantsRootIndex && cacheStrategy === 'rootIndexOnly') {
      return loadFn()
    }

    // define where to store the promise
    const cachePath = prefixes.filter(Boolean)
      .concat([key, JSON.stringify(params)])
      .concat(suffixes.filter(Boolean))
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
      const dynamicAxiosConfig = await axiosConfigCb()
      const verb = (axiosOptions.method || 'get').toLowerCase()
      resource = prepareResource(resource, key, verb)
      const mergedAxiosOptions = merge(axiosOptions, dynamicAxiosConfig)

      let r = await client.followLink(resource, key, params, mergedAxiosOptions)

      for (let proc of responseProcessors) {
        r = await proc(r, mergedAxiosOptions)
      }

      return r
    } catch (err) {
      console.log('hey!!!', err)
      // if the request was manually cancelled, we throw something different that will be caught later
      if (err.name === 'AbortError') {
        console.info('Request canceled:', err.message)
        throw Object.assign({}, cancelRequestResult, { cachePath }) // this be used to invalidate the cache
      } else if (err.response) {
        throw err.response
      } else {
        throw err
      }
    }
  }

  const log = (...args) => {
    if (enableLogging) {
      console.log(...args)
    }
  }

  return {
    cacheDisabled: cacheStrategy === 'off',
    axios: client,

    nocache() {
      const newConfig = {
        axiosConfig,
        rootEndpoint,
        rootIndexLinksPath,
        allowedLinksProperties,
        enableLogging,
        cacheStrategy: 'off',
        withVerbsRestrictions,
        responseProcessors
      }
      return this.cacheDisabled
        ? this
        : extended(newConfig)
    },

    generateCanceller() {
      return new AbortController()
    },

    isCancel(e) {
      return typeof e === 'object' && e.HateoasClientRequestCancelled
    },

    clearCache(path = '', params = {}) {
      log(
        '%c%s',
        'color: red; font-weight: bold;',
        'clear cache with path',
        path,
        params,
      )
      if (!path && Object.keys(params).length === 0) {
        $cache = {}
      } else {
        const keyToDelete =
          path.split('/').join('.') +
          (Object.keys(params).length > 0 ? '.' + JSON.stringify(params) : '')
        log('key to delete:', keyToDelete)
        set($cache, keyToDelete, null)
      }
      log('after clear', cloneDeep($cache))
    },

    resetCache() {
      $cache = {}
    },

    getCache() {
      return $cache
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
        const caching = (this.cacheDisabled && (result || module)) ? 'off' : cacheStrategy
        result = await getCachedValue(
          result,
          module,
          caching,
          getParams,
          axiosOptions,
          prefixes,
          addSuffixes
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
      const caching = (this.cacheDisabled && (resource || key)) ? 'off' : cacheStrategy
      return getCachedValue(
        resource,
        rel,
        caching,
        params,
        axiosOptions,
        cachePrefixes,
        cacheSuffixes
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
      } else if (typeof resource.valueOf() === 'string') {
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
      } else if (typeof resource.valueOf() === 'string') {
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
    },

    async download(resource, rel, params = {}, axiosOptions = {}, filename = 'document.pdf') {
      const dynamicAxiosConfig = await axiosConfigCb()
      if (!resource) {
        resource = await getRootIndex()
      } else if (typeof resource.valueOf() === 'string') {
        resource = await this.get(resource)
        log(resource, rel)
      }
      return this.axios.downloadBinary(resource, rel, params, merge(axiosOptions, dynamicAxiosConfig), filename)
    }
  }
}
