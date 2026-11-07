import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { z } from 'zod';

const policySchema = z.object({
  DisableAutoUpdate: z.boolean().optional(),
  UpdateChannel: z.enum(['stable', 'beta']).optional(),
  DisableTelemetry: z.boolean().optional(),
  EnableDevTools: z.boolean().optional(),
  DisableAutoLaunch: z.boolean().optional(),
});
export type DesktopPolicies = Readonly<z.infer<typeof policySchema>>;
let policies: DesktopPolicies = Object.freeze({});

export function parsePolicies(value: unknown, warn: (count: number) => void): DesktopPolicies {
  const record = z.record(z.string(), z.unknown()).parse(value);
  const unknown = Object.keys(record).filter((key) => !Object.hasOwn(policySchema.shape, key));
  if (unknown.length) warn(unknown.length);
  return Object.freeze(policySchema.parse(record));
}

export function readPolicySource(platform: NodeJS.Platform): unknown[] {
  if (platform === 'win32' && !process.windowsStore) {
    const script = `
$ErrorActionPreference = 'Stop'
$result = @()
foreach ($hive in @('CurrentUser', 'LocalMachine')) {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::$hive, [Microsoft.Win32.RegistryView]::Registry64)
  try {
    $key = $base.OpenSubKey('Software\\Policies\\Eternal')
    $values = @{}
    if ($null -ne $key) {
      try {
        foreach ($name in $key.GetValueNames()) {
          $value = $key.GetValue($name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
          if ($name -in @('DisableAutoUpdate', 'DisableTelemetry', 'EnableDevTools', 'DisableAutoLaunch')) {
            if ($key.GetValueKind($name) -ne [Microsoft.Win32.RegistryValueKind]::DWord -or $value -notin @(0, 1)) { throw 'Invalid policy type' }
            $value = [bool]$value
          } elseif ($name -eq 'UpdateChannel' -and $key.GetValueKind($name) -ne [Microsoft.Win32.RegistryValueKind]::String) { throw 'Invalid policy type' }
          $values[$name] = $value
        }
      } finally { $key.Dispose() }
    }
    $result += $values
  } finally { $base.Dispose() }
}
ConvertTo-Json -InputObject $result -Compress
`;
    const output = execFileSync(
      join(
        process.env.SystemRoot ?? 'C:\\Windows',
        'System32/WindowsPowerShell/v1.0/powershell.exe',
      ),
      ['-NoProfile', '-NonInteractive', '-Command', script],
      {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000,
        maxBuffer: 65536,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    return z.array(z.unknown()).length(2).parse(JSON.parse(output));
  }
  const file =
    platform === 'win32'
      ? join(process.env.ProgramData ?? 'C:\\ProgramData', 'Eternal', 'policies.json')
      : platform === 'darwin'
        ? '/Library/Managed Preferences/com.eternal.desktop.plist'
        : '/etc/eternal/policies.json';
  let contents: string;
  try {
    contents = readFileSync(file, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw new Error('Unable to read desktop policies');
  }
  if (Buffer.byteLength(contents) > 65536) throw new Error('Desktop policies exceed size limit');
  if (platform === 'darwin')
    contents = execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', file], {
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: 65536,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  return [JSON.parse(contents)];
}

export function loadPolicies(warn: (count: number) => void): DesktopPolicies {
  policies = Object.freeze(
    Object.assign(
      {},
      ...readPolicySource(process.platform).map((source) => parsePolicies(source, warn)),
    ),
  );
  return policies;
}

export function getPolicies(): DesktopPolicies {
  return policies;
}

export function devToolsEnabled(): boolean {
  return policies.EnableDevTools ?? !app.isPackaged;
}
