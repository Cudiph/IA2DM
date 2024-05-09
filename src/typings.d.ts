// data structure used in the codebase

type aria2_status = 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';

type option_t = {
  [key: string]: string;
};

// using gid as the key
type activeDownload_t = {
  [key: string]: activeDownloadItem;
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

// properties that can't be fetched with tellStatus
interface activeDownloadItem {
  gid?: string;
  icon?: string;
  startTime?: number;
  url?: string;
  serverName?: string;
}

interface DownloadItem {
  // common value
  gid: string;
  icon: string;
  dirname: string;
  basename: string;
  status: aria2_status;

  // active/in progress exclusive
  seeder?: boolean;
  uploadSpeed?: number;
  dlSpeed?: number;
  connections?: number;
  completedLength?: number;
  uploadLength?: number;

  // extra info
  url?: string;
  bitfield?: string;
  filesize?: number;
  serverName?: string;
  startTime?: number;
  finishTime?: number;
  errorMsg?: string;
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
