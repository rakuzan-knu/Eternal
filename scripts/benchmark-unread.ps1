[CmdletBinding()]
param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\docs\performance\artifacts\unread-sql-2026-10-10'),
  [string]$Image = 'postgres:16-alpine'
)

$ErrorActionPreference = 'Stop'
$benchmarkId = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$benchmarkContainer = "social-unread-bench-$benchmarkId"
$benchmarkDatabase = "unread_bench_$benchmarkId"
$benchmarkSql = Join-Path $PSScriptRoot 'benchmark-unread.sql'
$benchmarkService = Join-Path $PSScriptRoot '..\apps\backend\src\messenger\conversations\conversations.service.ts'
$benchmarkSchema = Join-Path $PSScriptRoot '..\apps\backend\prisma\schema.prisma'
$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory)
$benchmarkLog = Join-Path $resolvedOutput 'psql-output.txt'
$benchmarkJson = Join-Path $resolvedOutput 'explain-analyze.json'
$benchmarkMetadata = Join-Path $resolvedOutput 'runner.json'
$containerCreated = $false

function Assert-DockerSuccess([string]$Action) {
  if ($LASTEXITCODE -ne 0) { throw "$Action failed (exit $LASTEXITCODE)." }
}

try {
  # Fail on query drift instead of benchmarking a stale hand-copied query.
  $serviceText = [IO.File]::ReadAllText($benchmarkService)
  $applicationQuery = [regex]::Match($serviceText, '(?s)async getUnreadCount\([^`]*?Prisma\.sql`(?<sql>.*?)`')
  $fixtureQuery = [regex]::Match([IO.File]::ReadAllText($benchmarkSql), '(?s)unread_sql constant text := \$query\$(?<sql>.*?)\$query\$;')
  if (-not $applicationQuery.Success -or -not $fixtureQuery.Success) {
    throw 'Could not locate the application or fixture unread query.'
  }
  $script:unreadBenchmarkBinding = 0
  $applicationBoundSql = [regex]::Replace($applicationQuery.Groups['sql'].Value, '\$\{userId\}', {
    param($match)
    $script:unreadBenchmarkBinding++
    return '$' + $script:unreadBenchmarkBinding
  })
  $normalizedApplication = [regex]::Replace($applicationBoundSql, '\s+', ' ').Trim()
  $normalizedFixture = [regex]::Replace($fixtureQuery.Groups['sql'].Value, '\s+', ' ').Trim()
  if ($normalizedApplication -ne $normalizedFixture) {
    throw 'The application unread SQL has changed. Update the fixture query before benchmarking.'
  }
  $serviceSha256 = (Get-FileHash -LiteralPath $benchmarkService -Algorithm SHA256).Hash.ToLowerInvariant()
  $schemaSha256 = (Get-FileHash -LiteralPath $benchmarkSchema -Algorithm SHA256).Hash.ToLowerInvariant()

  $null = Get-Command docker -ErrorAction Stop
  $null = & docker version --format '{{.Server.Version}}'
  Assert-DockerSuccess 'Docker daemon check'
  $imageId = & docker image inspect $Image --format '{{.Id}}'
  Assert-DockerSuccess "Cached image check for $Image; pull the image explicitly first if missing"
  $null = New-Item -ItemType Directory -Path $resolvedOutput -Force

  # No application .env, compose services, existing container, connection URL,
  # host port, network connection, bind mount, or shared volume is used. The
  # image creates its own anonymous data volume, removed with the container.
  $null = & docker run --detach --rm --name $benchmarkContainer --network none --memory 2g --cpus 2 --shm-size 256m `
    --env POSTGRES_HOST_AUTH_METHOD=trust --env "POSTGRES_DB=$benchmarkDatabase" $Image
  Assert-DockerSuccess 'Isolated PostgreSQL container startup'
  $containerCreated = $true

  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $null = & docker exec $benchmarkContainer pg_isready -U postgres -d $benchmarkDatabase 2>&1
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Isolated PostgreSQL did not become ready within 30 seconds.' }
  $benchmarkMounts = & docker inspect $benchmarkContainer --format '{{json .Mounts}}' | ConvertFrom-Json
  Assert-DockerSuccess 'Isolated container mount inspection'

  $null = & docker cp $benchmarkSql "${benchmarkContainer}:/tmp/benchmark-unread.sql"
  Assert-DockerSuccess 'Benchmark SQL copy'
  $benchmarkOutput = & docker exec $benchmarkContainer psql -X -U postgres -d $benchmarkDatabase `
    -v ON_ERROR_STOP=1 -f /tmp/benchmark-unread.sql 2>&1
  $benchmarkExit = $LASTEXITCODE
  $outputText = ($benchmarkOutput | ForEach-Object { "$_" }) -join "`n"
  [IO.File]::WriteAllText($benchmarkLog, $outputText, [Text.UTF8Encoding]::new($false))
  if ($benchmarkExit -ne 0) { throw "Benchmark failed (exit $benchmarkExit). See $benchmarkLog." }

  $jsonMatch = [regex]::Match($outputText, '(?s)BENCHMARK_JSON_BEGIN\s*(\{.*\})\s*BENCHMARK_JSON_END')
  if (-not $jsonMatch.Success) { throw "Benchmark JSON markers missing. See $benchmarkLog." }
  $result = $jsonMatch.Groups[1].Value | ConvertFrom-Json
  if ($result.fixture.messages -ne 1000000 -or @($result.runs).Count -ne 45) {
    throw 'Fixture or measured-run sanity check failed.'
  }
  foreach ($run in $result.runs) {
    if ($run.actual_count -ne $run.expected_count) { throw 'Unread count sanity check failed.' }
  }
  [IO.File]::WriteAllText($benchmarkJson, $jsonMatch.Groups[1].Value, [Text.UTF8Encoding]::new($false))
  $metadata = [ordered]@{
    image = $Image; image_id = "$imageId"; container = $benchmarkContainer
    database = $benchmarkDatabase; cpus = 2; memory_bytes = 2147483648; shared_memory_bytes = 268435456
    network = 'none'; published_ports = @(); bind_mounts = @(); shared_volumes = @()
    mounted_volumes = @($benchmarkMounts | ForEach-Object {
      [ordered]@{ type = $_.Type; name = $_.Name; destination = $_.Destination }
    })
    sql_sha256 = (Get-FileHash -LiteralPath $benchmarkSql -Algorithm SHA256).Hash.ToLowerInvariant()
    service_sha256 = $serviceSha256
    schema_sha256 = $schemaSha256
    completed_at = [DateTimeOffset]::UtcNow.ToString('o')
  } | ConvertTo-Json -Depth 4
  [IO.File]::WriteAllText($benchmarkMetadata, $metadata, [Text.UTF8Encoding]::new($false))

  foreach ($group in ($result.runs | Group-Object stage,profile)) {
    $elapsed = @($group.Group | ForEach-Object { [double]$_.plan[0].'Execution Time' } | Sort-Object)
    [pscustomobject]@{
      Stage = $group.Group[0].stage; Profile = $group.Group[0].profile
      Count = $group.Group[0].actual_count; MedianMs = $elapsed[2]
      MinMs = $elapsed[0]; MaxMs = $elapsed[4]
    }
  }
  Write-Host "Raw EXPLAIN (ANALYZE, BUFFERS) plans: $benchmarkJson"
}
finally {
  if ($containerCreated) {
    $null = & docker rm --force --volumes $benchmarkContainer 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Warning "Could not remove isolated container $benchmarkContainer." }
  }
}
