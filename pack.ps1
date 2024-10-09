$compress = @{
  Path = "_locales", "icons", "background.js", "manifest.json"
  CompressionLevel = "Fastest"
  DestinationPath = "output.zip"
}
Compress-Archive @compress