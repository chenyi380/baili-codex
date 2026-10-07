param([ValidateSet('Inspect','Listener','Port')][string]$Action='Inspect',[int]$Port=0,[string]$Executable='')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if($Action -eq 'Port') {
    $taskListener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
    try {$taskListener.Start(); Write-Output $taskListener.LocalEndpoint.Port} finally {$taskListener.Stop()}
    exit
}
if($Action -eq 'Listener') {
    if($Port -lt 1024 -or $Port -gt 65535 -or -not [IO.Path]::IsPathRooted($Executable)){throw 'Invalid expected listener identity'}
    $taskRows=@(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
    if($taskRows.Count -eq 0){throw 'Listener not ready'}
    foreach($taskRow in $taskRows) {
        if($taskRow.LocalAddress -ne '127.0.0.1'){throw 'Listener is not loopback-only; refusing connection'}
        $taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId = $($taskRow.OwningProcess)"
        if(-not $taskProcess -or -not [string]::Equals($taskProcess.ExecutablePath,$Executable,[StringComparison]::OrdinalIgnoreCase)){throw 'Listener process does not match the validated Codex executable'}
        $taskOwner=Invoke-CimMethod -InputObject $taskProcess -MethodName GetOwnerSid
        $taskCurrentSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        if($taskOwner.ReturnValue -ne 0 -or $taskOwner.Sid -ne $taskCurrentSid){throw 'Listener owner does not match the current user'}
    }
    @{verified=$true;port=$Port} | ConvertTo-Json -Compress
    exit
}
$taskPackage=Get-AppxPackage -Name OpenAI.Codex | Where-Object {$_.PackageFamilyName -eq 'OpenAI.Codex_2p2nqsd0c76g0'} | Select-Object -First 1
if(-not $taskPackage){throw 'Official OpenAI.Codex Windows package was not found'}
if([string]$taskPackage.Status -ne 'Ok' -and [int]$taskPackage.Status -ne 0){throw 'Official package status is not healthy'}
$taskExe=Join-Path $taskPackage.InstallLocation 'app\ChatGPT.exe'
if(-not (Test-Path -LiteralPath $taskExe -PathType Leaf)){throw 'Official GUI executable was not found'}
$taskSignature=Get-AuthenticodeSignature -LiteralPath $taskExe
if($taskSignature.Status -ne 'Valid' -or $taskSignature.SignerCertificate.Subject -notmatch 'OpenAI OpCo, LLC'){throw 'Official OpenAI executable signature verification failed'}
$taskProcesses=@(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object {[string]::Equals($_.ExecutablePath,$taskExe,[StringComparison]::OrdinalIgnoreCase)} | Select-Object -ExpandProperty ProcessId)
$taskBundledNode=Join-Path $taskPackage.InstallLocation 'app\resources\cua_node\bin\node.exe'
@{version=[string]$taskPackage.Version;exe=$taskExe;family=$taskPackage.PackageFamilyName;signature='Valid OpenAI';running=@($taskProcesses);bundledNode=$taskBundledNode;userSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value} | ConvertTo-Json -Compress
