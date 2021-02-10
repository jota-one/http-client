import Axios from 'axios'
import AxiosFinally from 'promise.prototype.finally'
import { parseLinks, getEndpoint as ge } from '@jota-one/hateoas-parser'
import { isFunction } from 'lodash-es'

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

/**
 * Wrap the axios instance into an es6 class to make it easier extendable.
 */
class Jotaxios {
  constructor(options) {
    return Axios.create(options);
  }
}

/**
 * Adds a couple of features to the default Axios instance
 * - cache buster
 * - download or open a binary file
 */
class ExtendedAxios extends Jotaxios {
  constructor (config) {
    super(config)

    this.config = {
      cachebuster: {
        callback: null,
        methods: []
      }
    }
  }

  setCacheBuster (callback, methods = ['GET']) {
    this.config.cachebuster.callback = callback
    this.config.cachebuster.methods = methods
  }

  removeCacheBuster () {
    this.config.cachebuster.callback = null
    this.config.cachebuster.methods = []
  }

  getEndpoint (url, axiosConfig = {}) {
    const finalConfig = {
      method: 'GET',
      url,
      ...axiosConfig
    }

    // cachebusting
    if (isFunction(this.config.cachebuster.callback) && this.config.cachebuster.methods.includes(finalConfig.method)) {
      finalConfig.params = Object.assign(finalConfig.params || {}, { t: this.config.cachebuster.callback() })
    }

    return this(finalConfig)
      .then(response => {
        if (!response) {
          return {}
        }
        return response.data
      })
  }

  openBinary (url, axiosConfig, filename = 'document.pdf', forceDownload = false) {
    return this.getEndpoint(url, {
      ...axiosConfig,
      responseType: 'blob',
      transformResponse: getBinaryTransformResponse()
    })
      .then(response => openBlob(response, filename, forceDownload))
  }

  downloadBinary (url, axiosConfig, filename = 'document.pdf') {
    return this.openBinary(url, axiosConfig, filename, true)
  }
}

/**
 * Add hateoas features to the ExtendedAxios
 */
class HateoasAxios extends ExtendedAxios {
  loadIndex (endpoint) {
    return this.getEndpoint(endpoint)
  }

  getRelEndpoint (index, rel, params, axiosConfig) {
    return this.getEndpoint(ge(index, rel, params), axiosConfig)
  }

  followLink (resource, ...params) {
    return this.getRelEndpoint(parseLinks(resource), ...params)
  }

  openBinary (index, rel, params, axiosConfig = {}, filename = 'document.pdf', forceDownload = false) {
    return super.openBinary(ge(index, rel, params), axiosConfig, filename, forceDownload)
  }

  downloadBinary (index, rel, params, axiosConfig, filename = 'document.pdf') {
    return this.openBinary(index, rel, params, axiosConfig, filename, true)
  }
}

// shim the finally method
AxiosFinally.shim()

// default library (without hateoas support)
export const http = config => new ExtendedAxios(config)

// library with hateoas support
export const hateoas = config => new HateoasAxios(config)

export default http
