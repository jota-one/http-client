import axios from 'axios'
import { parseLinks, getEndpoint as ge } from '@jota-one/hateoas-parser'
import isFunction from 'lodash-es/isFunction'

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
 * Adds a couple of features to the default Axios instance
 * - cache buster
 * - download or open a binary file
 */
function ExtendedAxios(config) {
  const extendedConfig = {
    cachebuster: {
      callback: null,
      methods: []
    }
  }

  const axiosInstance = axios.create(config)
  const extended = {
    setCacheBuster: (callback, methods = ['GET']) => {
      extendedConfig.cachebuster.callback = callback
      extendedConfig.cachebuster.methods = methods
    },

    removeCacheBuster: () => {
      extendedConfig.cachebuster.callback = null
      extendedConfig.cachebuster.methods = []
    },

    getEndpoint (url, axiosConfig = {}) {
      const finalConfig = {
        method: 'GET',
        url,
        ...axiosConfig
      }

      // cachebusting
      if (isFunction(extendedConfig.cachebuster.callback) && extendedConfig.cachebuster.methods.includes(finalConfig.method)) {
        finalConfig.params = Object.assign(finalConfig.params || {}, { t: extendedConfig.cachebuster.callback() })
      }

      return axiosInstance(finalConfig)
        .then(response => {
          if (!response) {
            return {}
          }
          return response.data
        })
    },

    openBinary (url, axiosConfig, filename = 'document.pdf', forceDownload = false) {
      return extended.getEndpoint(url, {
        ...axiosConfig,
        responseType: 'blob',
        transformResponse: getBinaryTransformResponse()
      })
        .then(response => openBlob(response, filename, forceDownload))
    },

    downloadBinary (url, axiosConfig, filename = 'document.pdf') {
      return extended.openBinary(url, axiosConfig, filename, true)
    }
  }
  return Object.assign(axiosInstance, extended)
}

/**
 * Add hateoas features to the ExtendedAxios
 */
function HateoasAxios(config) {
  const extended = new ExtendedAxios(config)
  const hateoas = {
    loadIndex: (endpoint) => {
      return extended.getEndpoint(endpoint)
    },

    resolveUri (resource, rel, params) {
      return ge(parseLinks(resource), rel, params)
    },

    getRelEndpoint (index, rel, params, axiosConfig) {
      return extended.getEndpoint(ge(index, rel, params), axiosConfig)
    },

    followLink: (resource, ...params) => {
      return hateoas.getRelEndpoint(parseLinks(resource), ...params)
    },

    openBinary (index, rel, params, axiosConfig = {}, filename = 'document.pdf', forceDownload = false) {
      return extended.openBinary(ge(index, rel, params), axiosConfig, filename, forceDownload)
    },

    downloadBinary (index, rel, params, axiosConfig, filename = 'document.pdf') {
      return hateoas.openBinary(index, rel, params, axiosConfig, filename, true)
    },
  }
  return Object.assign(extended, hateoas)
}

// default library (without hateoas support)
export const http = config => new ExtendedAxios(config)

// library with hateoas support
export const hateoas = config => new HateoasAxios(config)

export default http
