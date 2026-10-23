# 把 dist\win-unpacked 装到 %LOCALAPPDATA%\Programs\wow-moyu，并在桌面和开始菜单放快捷方式。
# 用法：npm run install-local（会先打包）。装好的副本和项目目录分开，之后重新打包不影响正在用的那份。
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'dist\win-unpacked'
$dest = Join-Path $env:LOCALAPPDATA 'Programs\wow-moyu'
$exe = Join-Path $dest 'wow-moyu.exe'

if (-not (Test-Path (Join-Path $src 'wow-moyu.exe'))) { throw "没找到 $src\wow-moyu.exe，先运行 npm run pack" }
if (Get-Process wow-moyu -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe }) {
  throw 'WoW 摸鱼正在运行，先从托盘或 ✕ 退出再装'
}

if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Copy-Item $src $dest -Recurse

$shell = New-Object -ComObject WScript.Shell
$places = @(
  [Environment]::GetFolderPath('Desktop'),
  (Join-Path ([Environment]::GetFolderPath('Programs')) '')
)
foreach ($dir in $places) {
  $lnk = $shell.CreateShortcut((Join-Path $dir 'WoW 摸鱼.lnk'))
  $lnk.TargetPath = $exe
  $lnk.WorkingDirectory = $dest
  $lnk.IconLocation = "$exe,0"
  $lnk.Description = 'WoW 摸鱼：打本时的置顶网页小窗'
  $lnk.Save()
  Write-Host "快捷方式：$(Join-Path $dir 'WoW 摸鱼.lnk')"
}
Write-Host "已装到 $dest"
