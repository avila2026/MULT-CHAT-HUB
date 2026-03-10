# Verifica se já está em modo Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "O script necessita de elevação. Requisitando UAC..." -ForegroundColor Yellow
    
    # Eleva a si mesmo utilizando o verbo 'RunAs' nativo
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "[OK] Executando com privilégios de Administrador!" -ForegroundColor Green

# Se a aplicação for depender de modificação do sistema via NullClaw, coloque comandos sensíveis aqui
