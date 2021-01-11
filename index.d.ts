import { AxiosInstance, AxiosRequestConfig } from 'axios';

declare type cachebusterConfig = {
  callback: Function,
  methods: string[]
}

export type extendedAxiosConfig = {
  cachebuster: cachebusterConfig
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

export interface HttpClientInstance {
  create(config: AxiosRequestConfig): ExtendedAxiosInstance;
}

export interface HateoasHttpClientInstance {
  create(config: AxiosRequestConfig): HateoasAxiosInstance;
}

declare const HttpClient: HttpClientInstance;
declare const HateoasHttpClient: HateoasHttpClientInstance;

export {
  HttpClient,
  HateoasHttpClient
}

export default HttpClient;
