// data structure used in the codebase

type aria2_status = 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';

type option_t = {
  [key: string]: string;
};

// using gid as the key
type activeDownload_t = {
  [key: string]: DownloadItem;
};

interface RPCConfig {
  name: string;
  host: string;
  port: number;
  secret?: string;
  secure?: boolean;
  options?: option_t;
  updateDelay?: number;
}

interface DownloadItem {
  // required
  gid: string;
  icon: string;
  dirname: string;
  basename: string;
  status: aria2_status;

  // optional
  url?: string;
  bitfield?: string;
  uploadSpeed?: number;
  dlSpeed?: number;
  completedLength?: number;
  filesize?: number;
  serverName?: string;
  startTime?: number;
  finishTime?: number;
  errorMsg?: string;
  seeder?: boolean;
  cookie?: string; // unused, need more consideration
}

// structure stored in the root of local browser storage
interface aria2Storage {
  RPCs: RPCConfig[]; // list of RPC config
  intercept: boolean;
  activeDownload: activeDownload_t; // temporary active download list
  dlHistory: DownloadItem[]; // saved history
  sendCookies: boolean;
  sendReferer: boolean;
  progressColor: string; // use it as accent color?
  progressOutlineColor: string;
}

// Notification or request
interface jsonRPCPayload {
  id?: string;
  jsonrpc: string;
  method: string;
  params: any;
}

// Response
interface jsonRPCResponse {
  id?: string;
  jsonrpc: string;
  result?: any;
  error?: any;
}

// Extension messaging
interface runtimeMSG {
  type: 'poke';
}

type page = Writable<'add' | 'item-detail' | 'main'>;
