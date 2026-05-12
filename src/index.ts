interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * OpenCellID MCP — cell tower geolocation database (free with key)
 *
 * 50M+ cell towers worldwide. Useful for IoT, geolocating logs with cell
 * identifiers, asset tracking. Pairs with `iplookup` / `geo` / `nominatim`.
 *
 * API: https://wiki.opencellid.org/wiki/API
 * Auth: ?key= query param. Free, register at opencellid.org.
 *
 * Tools:
 * - get_cell:      lookup a tower by MCC/MNC/LAC/CellID
 * - cells_in_area: list towers inside a bounding box (lat/lon ranges)
 */


const BASE_URL = 'https://opencellid.org';

const tools: McpToolExport['tools'] = [
  {
    name: 'get_cell',
    description:
      'Geolocate a cell tower by mobile network identifiers. MCC = Mobile Country Code, MNC = Mobile Network Code, LAC = Location Area Code, cell_id = Cell ID. Returns lat/lon, range, samples, radio type (GSM/UMTS/LTE).',
    inputSchema: {
      type: 'object',
      properties: {
        mcc: { type: 'number', description: 'Mobile Country Code (e.g., 310 = US)' },
        mnc: { type: 'number', description: 'Mobile Network Code (e.g., 410 = AT&T US)' },
        lac: { type: 'number', description: 'Location Area Code' },
        cell_id: { type: 'number', description: 'Cell ID' },
        radio: { type: 'string', description: 'GSM | UMTS | LTE | CDMA (optional disambiguation)' },
      },
      required: ['mcc', 'mnc', 'lac', 'cell_id'],
    },
  },
  {
    name: 'cells_in_area',
    description:
      'List cell towers inside a bounding box. Bounding box format: "lat_sw,lon_sw,lat_ne,lon_ne". OpenCellID caps results per call — narrow the bbox if you need detail.',
    inputSchema: {
      type: 'object',
      properties: {
        bbox: { type: 'string', description: 'Bounding box "lat_sw,lon_sw,lat_ne,lon_ne"' },
        mcc: { type: 'number', description: 'Restrict to a country (Mobile Country Code)' },
        mnc: { type: 'number', description: 'Restrict to a network within MCC' },
        limit: { type: 'number', description: 'Max records (default 1000, server-capped)' },
      },
      required: ['bbox'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = (args._apiKey as string | undefined)?.trim();
  if (!apiKey) {
    throw new Error(
      'OpenCellID requires an API key. Contact the operator about platform credentials, or BYO via ?_apiKey=<key> after registering at https://opencellid.org/register.php.',
    );
  }
  switch (name) {
    case 'get_cell':
      return getCell(apiKey, args);
    case 'cells_in_area':
      return cellsInArea(apiKey, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function ocidFetch<T>(apiKey: string, path: string, params: URLSearchParams): Promise<T> {
  params.set('key', apiKey);
  params.set('format', 'json');
  const url = `${BASE_URL}${path}?${params}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 401 || res.status === 403) throw new Error('OpenCellID: unauthorized — check the API key');
  if (res.status === 429) throw new Error('OpenCellID: rate-limit (HTTP 429)');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenCellID error: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface CellResp {
  lat?: number;
  lon?: number;
  mcc?: number;
  mnc?: number;
  lac?: number;
  cellid?: number;
  averageSignalStrength?: number;
  range?: number;
  samples?: number;
  radio?: string;
  created?: number;
  updated?: number;
  changeable?: number;
  unit?: string;
}

async function getCell(apiKey: string, args: Record<string, unknown>) {
  const params = new URLSearchParams({
    mcc: String(args.mcc),
    mnc: String(args.mnc),
    lac: String(args.lac),
    cellid: String(args.cell_id),
  });
  if (args.radio) params.set('radio', String(args.radio).toUpperCase());

  const data = await ocidFetch<CellResp>(apiKey, '/cell/get', params);
  return normalizeCell(data);
}

function normalizeCell(c: CellResp) {
  return {
    mcc: c.mcc ?? null,
    mnc: c.mnc ?? null,
    lac: c.lac ?? null,
    cell_id: c.cellid ?? null,
    radio: c.radio ?? null,
    latitude: c.lat ?? null,
    longitude: c.lon ?? null,
    range_m: c.range ?? null,
    samples: c.samples ?? null,
    avg_signal_strength: c.averageSignalStrength ?? null,
    created_at: c.created ? new Date(c.created * 1000).toISOString() : null,
    updated_at: c.updated ? new Date(c.updated * 1000).toISOString() : null,
  };
}

async function cellsInArea(apiKey: string, args: Record<string, unknown>) {
  const params = new URLSearchParams({ BBOX: String(args.bbox) });
  if (args.mcc) params.set('mcc', String(args.mcc));
  if (args.mnc) params.set('mnc', String(args.mnc));
  if (args.limit) params.set('limit', String(args.limit));

  const data = await ocidFetch<{ cells?: CellResp[]; count?: number }>(apiKey, '/cell/getInArea', params);
  return {
    bbox: args.bbox,
    count: data.count ?? data.cells?.length ?? 0,
    cells: (data.cells ?? []).map(normalizeCell),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
