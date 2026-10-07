param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$taskNode=Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
if(-not $taskNode){$taskNode=Join-Path ([Environment]::GetFolderPath('UserProfile')) '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'}
if(-not(Test-Path -LiteralPath $taskNode -PathType Leaf)){throw 'Node.js 22+ required. Use Start-Codex.cmd for diagnostics.'}
if($CheckOnly){& $taskNode (Join-Path $taskRoot 'launcher.mjs') --check-consent;exit $LASTEXITCODE}
$taskLog=Join-Path $taskRoot 'launcher.log'
$taskInfo=[Diagnostics.ProcessStartInfo]::new($taskNode)
$taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true;$taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true
$taskInfo.WorkingDirectory=$taskRoot;$taskInfo.ArgumentList.Add((Join-Path $taskRoot 'launcher.mjs'));$taskInfo.ArgumentList.Add('--desktop')
$taskProcess=[Diagnostics.Process]::new();$taskProcess.StartInfo=$taskInfo
[void]$taskProcess.Start()
$taskOut=$taskProcess.StandardOutput.ReadToEndAsync();$taskErr=$taskProcess.StandardError.ReadToEndAsync();$taskProcess.WaitForExit()
$taskOutput=@($taskOut.GetAwaiter().GetResult(),$taskErr.GetAwaiter().GetResult());$taskCode=$taskProcess.ExitCode;$taskProcess.Dispose()
$taskOutput | Out-File -LiteralPath $taskLog -Encoding utf8
if($taskCode -eq 2){
    # New account, app version, or code: interactive FIRST consent, never auto-YES.
    Start-Process -FilePath $env:ComSpec -ArgumentList @('/d','/c',('""'+(Join-Path $taskRoot 'Start-Codex.cmd')+'""')) -WorkingDirectory $taskRoot -WindowStyle Normal
}elseif($taskCode -ne 0){
    Add-Type -AssemblyName PresentationFramework
    [void][Windows.MessageBox]::Show(($taskOutput -join [Environment]::NewLine),'Codex · 白璃动画启动提示')
}
