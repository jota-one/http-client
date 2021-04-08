import { AxiosInstance, AxiosRequestConfig } from 'axios';

declare type cachebusterConfig = {
  callback: Function,
  methods: string[]
}
export interface responseProcessorFunction {
  (result: object, axiosOptions: AxiosRequestConfig)
}

export type extendedAxiosConfig = {
  cachebuster: cachebusterConfig
}

export type hateoasExtendedConfig = {
  axiosConfig: extendedAxiosConfig
  rootEndpoint: string
  enableLogging: boolean
  disableCache: boolean
  responseProcessors: responseProcessorFunction[]
}

export interface ExtendedAxiosInstance extends AxiosInstance {
  config: extendedAxiosConfig
  setCacheBuster(callback: Function|null, methods?: string[]):void
  removeCacheBuster():void
  getEndpoint(url: string, config?: AxiosRequestConfig):Promise<any>
  downloadBinary(url: string, config?: AxiosRequestConfig, name?: string):Promise<any>
  openBinary(url: string, config?: AxiosRequestConfig, name?: string):Promise<any>
}

export interface HateoasAxiosInstance extends ExtendedAxiosInstance {
  loadIndex():Promise<any>
  getRelEndpoint():Promise<any>
  followLink():Promise<any>
  loadVersionedIndex():Promise<any>
}

export interface HateoasExtended {
  get():Promise<any>
  post():Promise<any>
  put():Promise<any>
  delete():Promise<any>
  follow():Promise<any>
}

declare function http(config: AxiosRequestConfig): ExtendedAxiosInstance;
declare function hateoas(config: AxiosRequestConfig): HateoasAxiosInstance;
declare function extended(config: hateoasExtendedConfig): HateoasExtended;
declare function use(client: HateoasExtended, mixin: Function): void;
declare function registerMixin(name: string, mixin: Function): void;

export {
  http,
  hateoas,
  extended,
  use,
  registerMixin
}

export default http
