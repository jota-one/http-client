import axios from 'axios'
import { parseLinks, getEndpoint as ge } from '@jota-one/hateoas-parser'

const openBlob = function (blob, filename, forceDownload) {
  const url = window.URL.createObjectURL(blob)

  if (forceDownload) {
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return filename
  }

  const popup = window.open(url)

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

    getEndpoint (url, axiosConfig = {}, fullResponse = false) {
      const finalConfig = {
        method: 'GET',
        url,
        ...axiosConfig
      }

      // cachebusting
      if (typeof extendedConfig.cachebuster.callback === 'function' && extendedConfig.cachebuster.methods.includes(finalConfig.method)) {
        finalConfig.params = Object.assign(finalConfig.params || {}, { t: extendedConfig.cachebuster.callback() })
      }

      return axiosInstance(finalConfig)
        .then(response => {
          if (fullResponse) {
            return response
          }
          if (!response) {
            return {}
          }
          return response.data
        })
    },

    openBinary (url, axiosConfig, filename, forceDownload = false) {
      return extended.getEndpoint(url, {
        ...axiosConfig,
        responseType: 'blob',
      }, true)
        .then(response => {
          if (!filename) {
            const contentDisposition = response.headers['Content-Disposition']
            filename = contentDisposition.match(/filename="(.+)"/)[1]
          }
          if (response.data instanceof Blob) {
            return openBlob(response.data, filename, forceDownload)
          } else {
            return response.data
          }
        })
    },

    downloadBinary (url, axiosConfig, filename) {
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
    loadIndex: (endpoint, axiosConfig) => extended.getEndpoint(endpoint, axiosConfig),

    resolveUri: (resource, rel, params) => ge(parseLinks(resource), rel, params),

    getRelEndpoint: (index, rel, params, axiosConfig) => extended.getEndpoint(ge(index, rel, params), axiosConfig),

    followLink: (resource, ...params) => hateoas.getRelEndpoint(parseLinks(resource), ...params),

    downloadBinary: (resource, rel, params, axiosConfig, filename) => extended.openBinary(hateoas.resolveUri(resource, rel, params), axiosConfig, filename, true),
  }
  return Object.assign(extended, hateoas)
}

// default library (without hateoas support)
export const http = config => new ExtendedAxios(config)

// library with hateoas support
export const hateoas = config => new HateoasAxios(config)

export default http
