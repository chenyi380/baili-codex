$ErrorActionPreference='Stop'
$taskFiles=Get-ChildItem -LiteralPath (Split-Path -Parent $PSScriptRoot) -Filter '*.ps1' -File
foreach($taskFile in $taskFiles){$taskTokens=$null;$taskErrors=$null;[void][Management.Automation.Language.Parser]::ParseFile($taskFile.FullName,[ref]$taskTokens,[ref]$taskErrors);if($taskErrors.Count){throw ($taskErrors.Message -join '; ')};Write-Output ('Parsed: '+$taskFile.Name)}
