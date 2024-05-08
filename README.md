<div align="center">
  <img src="./public/images/icon.png" alt="logo">
  <h1>Integrated Aria2 Download Manager</h1></div>
<br>

## Features

- Intercept download - Forward download from the browser to the aria2 instance.
- Automatic fetching - When it downloads metadata files such as `.torrent` or
  `.metalink` it'll automatically download the files specified inside.
- Download history - Every time download finished, the history will be saved and
  not lost when you close the browser.
- Pie progress indicator - Show pie progress on the browser toolbar (need to pin
  the extension first)
- Customizable - Progress color can be customized to any color (very game
  changing)
- Hotkey - keyboard shortcut is available
- Fallback server - Add another server configuration as a fallback if the main
  one fail. Program will try to connect from top to bottom order in the options.

## Known issue

Edge case and error handling is not tested yet, but the list are:

- no technical issue found yet except some UI mess when given unexpected data.

## Building

`Node.js` v18 or newer should work.

1. `pnpm install` or `npm install`
2. `npm run build`

`dist` folder will be generated in the root of the project directory with
`firefox` and `chromium` folder inside.

## Contributing and feature request

Any contribution are welcome, fork and send me a pull request! For any
suggestion or issue you can create a new issue in the issue panel.
