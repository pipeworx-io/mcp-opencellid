# @pipeworx/opencellid

OpenCellID MCP — cell tower geolocation database.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `get_cell(mcc, mnc, lac, cell_id, radio?)`
- `cells_in_area(bbox, mcc?, mnc?, limit?)`

## Auth

- **Platform key:** gateway env `PLATFORM_OPENCELLID_KEY`.
- **BYO:** `?_apiKey=<key>` after registering at https://opencellid.org/register.php.

## Data source

`https://opencellid.org` — `?key=` query param.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "opencellid": {
      "url": "https://gateway.pipeworx.io/opencellid/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Opencellid data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
