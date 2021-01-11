import Axios from 'axios'
import AxiosFinally from 'promise.prototype.finally'
import { parseLinks, getEndpoint as ge } from '@jota-one/hateoas-parser'
import { concat, uniq, isObject, toPairs, isFunction } from 'lodash-es'

const openBlob = function (blob, filename, forceDownload) {
  let url,
    popup

  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    popup = window.navigator.msSaveOrOpenBlob(blob, filename)
  } else {
    url = window.URL.createObjectURL(blob)

    if (forceDownload) {
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      return
    }

    popup = window.open(url)
  }

  // error display
  window.setTimeout(function () {
    if (!popup || popup.closed) {
      // Create and fire a custom event
      var event = new CustomEvent("popupBlocked", {
        "detail": {
          "message": "Your document should have been displayed in a popup. But your browser prevent the popup to open. Please check the small icon in your address bar.",
          "code": "POPUP_BLOCKED"
        }
      });
      document.dispatchEvent(event);
    }
  }, 1000)
}

const getBinaryTransformResponse = () => {
  return [function (resBlob) {
    // try to decode the Blob content and parse it as JSON
    // if it is JSON, that means it's an error and not an actual Blob result.
    return new Promise((resolve, reject) => {
      let reader = new FileReader()
      reader.addEventListener('abort', reject)
      reader.addEventListener('error', reject)
      reader.addEventListener('loadend', () => {
        resolve(reader.result)
      })
      reader.readAsText(resBlob)
    })
      .then(resText => {
        try {
          return JSON.parse(resText)
        } catch (e) {
          return resBlob
        }
      })
  }]
}

const ExtendedAxios = {
  config: {
    cachebuster: {
      callback: null,
      methods: []
    }
  },

  setCacheBuster (callback, methods = ['GET']) {
    this.config.cachebuster.callback = callback
    this.config.cachebuster.methods = methods
  },

  removeCacheBuster () {
    this.config.cachebuster.callback = null
    this.config.cachebuster.methods = []
  },

  getEndpoint (url, axiosConfig) {
    let finalConfig = Object.assign({
      method: 'GET',
      url: url
    }, (axiosConfig || {}))

    // cachebusting
    if (isFunction(this.config.cachebuster.callback) && this.config.cachebuster.methods.indexOf(finalConfig.method) > -1) {
      finalConfig.params = Object.assign(finalConfig.params || {}, {t: this.config.cachebuster.callback()})
    }

    return this(finalConfig)
      .then(response => {
        if (!response) {
          return {}
        }
        return response.data
      })
  },
  _getBinary (url, axiosConfig) {
    axiosConfig = axiosConfig || {}
    axiosConfig.transformResponse = getBinaryTransformResponse()
    return this.getEndpoint(url, Object.assign({}, (axiosConfig || {}), {responseType: 'blob'}))
  },
  downloadBinary (url, axiosConfig, filename = 'document.pdf') {
    return this._getBinary(url, axiosConfig)
      .then(response => {
        openBlob(response, filename, true)
      })
  },
  openBinary (url, axiosConfig, filename = 'document.pdf') {
    return this._getBinary(url, axiosConfig)
      .then(response => {
        openBlob(response, filename)
      })
  }
}

const HateoasAxios = {
  loadIndex (endpoint) {
    return this.getEndpoint(endpoint)
  },
  getRelEndpoint (index, rel, params, axiosConfig, version) {
    return this.getEndpoint(ge(index, rel, params, version), axiosConfig)
  },
  followLink (resource, ...params) {
    return this.getRelEndpoint(parseLinks(resource), ...params)
  },
  _getBinary (index, rel, params, axiosConfig, version) {
    axiosConfig = axiosConfig || {}
    axiosConfig.transformResponse = getBinaryTransformResponse()
    return this.followLink(index, rel, params, Object.assign({}, (axiosConfig || {}), {responseType: 'blob'}), version)
  },
  downloadBinary (index, rel, params, axiosConfig, version) {
    return this._getBinary(index, rel, params, axiosConfig, version)
      .then(response => {
        let filename = index.fileName || 'document.pdf'
        openBlob(response, filename, true)
      })
  },
  openBinary (index, rel, params, axiosConfig, version) {
    return this._getBinary(index, rel, params, axiosConfig, version)
      .then(response => {
        let filename = index.fileName || 'document.pdf'
        openBlob(response, filename)
      })
  },

  /**
   * Loads all versions of an index endpoint and
   * create a versioned list of links
   *
   * @param {String|Object} endpointDefinition One or several index endpoints
   * @returns {Promise}
   */
  loadVersionedIndex (endpointDefinition) {
    if (!isObject(endpointDefinition)) {
      endpointDefinition = {
        default: endpointDefinition
      }
    }
    let endpoints = toPairs(endpointDefinition)
    let promises = endpoints.map((ep) => {
      return {
        key: ep[0],
        promise: this.loadIndex(ep[1])
      }
    })
    return Axios.all(promises.map(ep => ep.promise))
      .then(results => {
        promises.map((info, index) => {
          info.result = results[index].data || results[index].index || {}
          return info
        })

        // extract all 'rel' values
        let rels = uniq(concat(...promises.map(val => val.result.links)).map(obj => obj.rel))
        rels.sort()

        let links = rels.map((rel) => {
          let hrefs = promises.reduce((acc, obj) => {
            let inHere = obj.result.links.find(link => link.rel === rel)
            if (inHere) {
              acc[obj.key] = inHere.href
            }
            return acc
          }, {})
          if (Object.keys(hrefs).length === 1) {
            hrefs = hrefs[Object.keys(hrefs)[0]]
          }

          return {
            rel: rel,
            href: hrefs
          }
        })

        return {links: links}
      })
  }
}

// shim the finally method
AxiosFinally.shim()

// default library (without hateoas support)
export const HttpClient = {
  create (config) {
    return Object.assign(Axios.create(config), ExtendedAxios)
  }
}

// library with hateoas support
export const HateoasHttpClient = Object.assign({}, HttpClient, {
  create (config) {
    return Object.assign(Axios.create(config), ExtendedAxios, HateoasAxios)
  }
})

export default HttpClient
