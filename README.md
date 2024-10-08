<div align="center">
  <img src="./public/images/icon.png" alt="logo">
  <h1>Integrated Aria2 Download Manager</h1>
  <a href="https://addons.mozilla.org/firefox/addon/ia2dm/"><img height="60" src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get IA2DM for Firefox" /></a>
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/nfchpjolcepnhnmbpigllmahoaecdmlj"><img height="62" src="https://get.microsoft.com/images/en-us%20dark.svg" alt="Get IA2DM for Edge"></a>
</div>
<br>

## Screenshot

<details>
  <summary>Click to expand!</summary>
  <br>

![Popup 1](./misc/popup.png)
![Popup 2](./misc/popup2.png)
![Error](./misc/download_error.png)
![Complete](./misc/download_complete.png)
![options](./misc/options.png)
![Integration](./misc/integration.png)

</details>

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
- Cross Browser - Works on both firefox or chromium based browsers.

Integration with [Aria2 Tray](https://github.com/Cudiph/aria2tray) is available which
you can open and delete file/folder right in the download history see [screenshot](./misc/integration.png).

## Guides

<details>
  <summary>Setup self-signed ssl/tls certificate in firefox</summary>
  <br>

1. Run `genssl.sh` script in the `scripts` folder to generate certificates.
2. Add `root-ca.pem` to Authorities in certificate manager (search for "view
   certificates" in the firefox settings) and check
   `This certificate can identify website` when importing
3. If still not work, try disabling
   `security.certerrors.mitm.auto_enable_enterprise_roots` and
   `security.enterprise_roots.enabled` in `about:config`
4. Finally run
   `aria2c --enable-rpc --rpc-secret=topsecret --rpc-certificate=server.p12 --rpc-secure`

</details>

<details>
  <summary>Setup self-signed ssl/tls certificate in chromium</summary>
  <br>

1. Run `genssl.sh` script in the `scripts` folder to generate certificates.
2. Add `root-ca.pem` to Authorities tab in Manage certificates (search for
   "manage certificates" in the search bar) and check
   `Trust this certificate for identifying websites` when importing
3. Finally run
   `aria2c --enable-rpc --rpc-secret=topsecret --rpc-certificate=server.p12 --rpc-secure`

</details>

<details>
  <summary>Import certificate in windows</summary>
  <br>

1. Run `$ cat genssl.sh | tr -d '\r' | sh -` using WSL then rename the generated
   `root-ca.pem` to `root-ca.cer`, double click the file and install certificate.
2. Store to Local Machine, next, and place the certificate in
   "Trusted Root Certification Authorities" folder.

</details>

## Tips

- If you got `socket error` when using aria2 cli in Windows try adding
  `--disable-ipv6` flag.
- For SSL certificate error when downloading, try adding
  `--check-certificate=false` flag.

## Building

`Node.js` v18 or newer should work.

1. `pnpm install` or `npm install`
2. `npm run build`

`dist` folder will be generated in the root of the project directory with
`firefox` and `chromium` folder inside.

## Translation

Currently no plan for it since it's just fun little project for me to solve my
own problem but let's see if userbase is growing or tell me if you need it I'll
make the abstraction for the translator.

## Contributing and feature request

Any contribution are welcome, fork and send me a pull request! For any
suggestion or issue you can create a new issue in the issue panel.
