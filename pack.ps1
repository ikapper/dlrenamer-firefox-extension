$targets = @("_locales", "icons", "background.js", "manifest.json")

# Set-Alias -Name 7zip -Value "C:\Program Files\7-Zip\7z.exe"
# 上記を設定済みという想定。
# Compress-Archiveではバックスラッシュが使われるのでダメ。
7zip a -tzip output.zip @targets
