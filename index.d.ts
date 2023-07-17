import {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios'

export type cachebusterConfig = {
  callback: Function,
  methods: string[]
}

export type CacheStrategies = 'off' | 'rootIndexOnly' | 'all'

export interface responseProcessorFunction {
  (result: AxiosResponse, axiosOptions: AxiosRequestConfig)
}

export type extendedAxiosConfig = {
  cachebuster: cachebusterConfig
}

export type hateoasExtendedConfig = {
  axiosConfig?: AxiosRequestConfig
  axiosConfigCb?: () => Promise<AxiosRequestConfig>
  rootEndpoint?: string | Record<string, unknown>
  rootIndexLinksPath?: string
  allowedLinksProperties?: string[]
  enableLogging?: boolean
  disableCache?: boolean
  cacheStrategy?: CacheStrategies
  responseProcessors?: responseProcessorFunction[]
  withVerbsRestrictions?: boolean
}

export interface ExtendedAxiosInstance extends AxiosInstance {
  setCacheBuster(callback: Function|null, methods?: string[]):void
  removeCacheBuster():void
  getEndpoint(url: string, config?: AxiosRequestConfig):Promise<any>
  downloadBinary(url: string, config?: AxiosRequestConfig, name?: string):Promise<any>
  openBinary(url: string, config?: AxiosRequestConfig, name?: string, forceDownload?: boolean):Promise<any>
}

export interface HateoasAxiosInstance extends AxiosInstance {
  setCacheBuster(callback: Function|null, methods?: string[]):void
  removeCacheBuster():void
  getEndpoint(url: string, config?: AxiosRequestConfig):Promise<any>
  loadIndex(endpoint: string):Promise<any>
  resolveUri(resource: object, rel: string, params?: object):string
  getRelEndpoint(index: object, rel: string, params?: object, axiosConfig?: AxiosRequestConfig):Promise<any>
  followLink(resource: object, rel: string, params?: object, axiosConfig?: AxiosRequestConfig):Promise<any>
  downloadBinary(resource: object, rel: string, params?: object, axiosConfig?: AxiosRequestConfig, filename?: string):Promise<any>
}

export interface HateoasExtended {
  cacheDisabled:Boolean,
  axios:HateoasAxiosInstance
  nocache():HateoasExtended
  generateCanceller():AbortController
  isCancel(e: object):Boolean
  clearCache(path?:string, params?:object):void
  resetCache():void
  get(hpath: string, params?: object, axiosOptions?: AxiosRequestConfig, suffixes?: string[]):Promise<any>
  post(resource: object|string, rel: string, payload?: object, axiosOptions?: AxiosRequestConfig, urlPlaceholders?: object):Promise<any>
  put(resource: object|string, rel: string, payload?: object, axiosOptions?: AxiosRequestConfig, urlPlaceholders?: object):Promise<any>
  delete(resource: object|string, rel: string, params?: object):Promise<any>
  follow(resource: object, rel: string, params?: object, axiosOptions?: AxiosRequestConfig, cachePrefixes?: string[], cacheSuffixes?: string[]):Promise<any>
  download(resource: object|string, rel: string, params?: object, axiosOptions?: AxiosRequestConfig, filename?: string):Promise<any>
}

declare function http(config: AxiosRequestConfig): ExtendedAxiosInstance;
declare function hateoas(config: AxiosRequestConfig): HateoasAxiosInstance;
declare function extended(config: hateoasExtendedConfig): HateoasExtended;
declare function use(client: HateoasExtended, mixin: Function | string): void;
declare function registerMixin(name: string, mixin: Function): void;

export {
  http,
  hateoas,
  extended,
  use,
  registerMixin
}

export default http
