# Faz uma cópia de segurança do data.db (dados reais dos clientes) numa
# pasta "backups" dentro do próprio projeto, com data/hora no nome, e apaga
# backups com mais de 30 dias pra não acumular arquivo pra sempre.
#
# Uso manual: clique com o botão direito neste arquivo > "Executar com o
# PowerShell" (ou rode `powershell -ExecutionPolicy Bypass -File
# backup-data.ps1` num terminal).
#
# Uso automático: agende no Agendador de Tarefas do Windows pra rodar todo
# dia (veja instruções que o Pedro recebeu junto com este arquivo).

$ErrorActionPreference = "Stop"

$pastaProjeto = $PSScriptRoot
$caminhoDb = Join-Path $pastaProjeto "data.db"
$pastaBackups = Join-Path $pastaProjeto "backups"

if (-not (Test-Path $caminhoDb)) {
    Write-Host "Não encontrei data.db em $pastaProjeto — nada pra fazer backup."
    exit 1
}

if (-not (Test-Path $pastaBackups)) {
    New-Item -ItemType Directory -Path $pastaBackups | Out-Null
}

$carimbo = Get-Date -Format "yyyy-MM-dd_HHmmss"
$destino = Join-Path $pastaBackups "data_$carimbo.db"

Copy-Item -Path $caminhoDb -Destination $destino -Force

Write-Host "Backup criado: $destino"

# Apaga backups com mais de 30 dias (mantém sempre os mais recentes)
$limite = (Get-Date).AddDays(-30)
Get-ChildItem -Path $pastaBackups -Filter "data_*.db" |
    Where-Object { $_.LastWriteTime -lt $limite } |
    ForEach-Object {
        Write-Host "Removendo backup antigo: $($_.Name)"
        Remove-Item $_.FullName -Force
    }

Write-Host "Backup concluído."
