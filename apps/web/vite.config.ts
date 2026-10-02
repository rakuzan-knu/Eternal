import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { execFile } from 'node:child_process';
import fs from 'node:fs';

function presentationRendererPlugin(): Plugin {
  return {
    name: 'presentation-renderer-plugin',
    configureServer(server) {
      server.middlewares.use('/api/render-presentation', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        try {
          const rawUrl = (req as any).originalUrl || req.url || '';
          const urlObj = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`);
          const fileName = urlObj.searchParams.get('fileName') || 'presentation.pptx';

          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const fileBuffer = Buffer.concat(chunks);

          if (fileBuffer.length === 0) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Empty file buffer' }));
            return;
          }

          const cacheBaseDir = path.resolve('C:/Users/Ayate/Desktop/SocialMedia/.ppt_render_cache');
          if (!fs.existsSync(cacheBaseDir)) {
            fs.mkdirSync(cacheBaseDir, { recursive: true });
          }
          const tempDir = fs.mkdtempSync(path.join(cacheBaseDir, 'run_'));
          const ext = path.extname(fileName) || '.pptx';
          const tempFilePath = path.join(tempDir, `pres_${Date.now()}${ext}`);
          fs.writeFileSync(tempFilePath, fileBuffer);

          const psScriptPath = path.join(tempDir, 'export.ps1');
          const psScript = `
$hasUserWindow = (Get-Process -Name "POWERPNT" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }).Count -gt 0
if (-not $hasUserWindow) {
  Get-Process -Name "POWERPNT" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -eq 0 } | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 200
}
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $null
try {
  $file = '${tempFilePath.replace(/'/g, "''")}'
  $outDir = '${tempDir.replace(/'/g, "''")}'
  
  $pres = $ppt.Presentations.Open($file, -1, 0, 0)
  
  $ratio = $pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth
  $w = 1600
  $h = [math]::Round($w * $ratio)
  
  $slides = @()
  for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $s = $pres.Slides.Item($i)
    $imgPath = Join-Path $outDir ("slide_" + $i + ".png")
    $s.Export($imgPath, "PNG", $w, $h)
    
    $title = ""
    try {
      if ($s.Shapes.HasTitle) {
        $title = $s.Shapes.Title.TextFrame.TextRange.Text.Trim()
      }
    } catch {}
    
    $paras = @()
    $hasTable = $false
    $tableHeaders = @()
    $tableRows = @()
    
    foreach ($shp in $s.Shapes) {
      try {
        if ($shp.HasTable) {
          $hasTable = $true
          $tbl = $shp.Table
          if ($tbl.Rows.Count -gt 0 -and $tbl.Columns.Count -gt 0) {
            for ($c = 1; $c -le $tbl.Columns.Count; $c++) {
              $tableHeaders += $tbl.Cell(1, $c).Shape.TextFrame.TextRange.Text.Trim()
            }
            for ($r = 2; $r -le $tbl.Rows.Count; $r++) {
              $row = @()
              for ($c = 1; $c -le $tbl.Columns.Count; $c++) {
                $row += $tbl.Cell($r, $c).Shape.TextFrame.TextRange.Text.Trim()
              }
              $tableRows += ,$row
            }
          }
        }
      } catch {}

      try {
        if ($shp.HasTextFrame -and $shp.TextFrame.HasText) {
          $txt = $shp.TextFrame.TextRange.Text.Trim()
          if ($txt -and $txt -ne $title) {
            $paras += $txt
          }
        }
      } catch {}
    }
    
    $slides += [PSCustomObject]@{
      slideNumber = $i
      title = $title
      paragraphs = $paras
      hasTable = $hasTable
      tableHeaders = $tableHeaders
      tableRows = $tableRows
      aspectRatio = if ($ratio -gt 0.6) { "4:3" } else { "16:9" }
    }
  }
  
  $pres.Close()
  $pres = $null
  $slides | ConvertTo-Json -Depth 6 | Out-File -FilePath (Join-Path $outDir "meta.json") -Encoding utf8
} catch {
  Write-Host "ERROR at line" $_.InvocationInfo.ScriptLineNumber ":" $_.Exception.Message
} finally {
  if ($pres) {
    try { $pres.Close() } catch {}
  }
  if (-not $hasUserWindow) {
    try { $ppt.Quit() } catch {}
  }
  try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null } catch {}
}
`;
          fs.writeFileSync(psScriptPath, psScript);

          execFile(
            'powershell.exe',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScriptPath],
            { timeout: 25000 },
            (error, stdout, stderr) => {
              try {
                if (error) {
                  console.error(
                    '[presentationRendererPlugin] Exec error:',
                    error,
                    'stdout:',
                    stdout,
                    'stderr:',
                    stderr,
                  );
                  try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                  } catch {}
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: String(error),
                      stdout: String(stdout),
                      stderr: String(stderr),
                    }),
                  );
                  return;
                }

                let metadataList: any[] = [];
                const metaPath = path.join(tempDir, 'meta.json');
                if (fs.existsSync(metaPath)) {
                  try {
                    const metaContent = fs.readFileSync(metaPath, 'utf8').replace(/^\uFEFF/, '');
                    metadataList = JSON.parse(metaContent);
                    if (!Array.isArray(metadataList) && metadataList) {
                      metadataList = [metadataList];
                    }
                  } catch (parseErr) {
                    console.warn('[presentationRendererPlugin] Parse meta err:', parseErr);
                  }
                }

                const results: any[] = [];
                let idx = 1;
                while (true) {
                  const imgPath = path.join(tempDir, `slide_${idx}.png`);
                  if (fs.existsSync(imgPath)) {
                    const imgBuf = fs.readFileSync(imgPath);
                    const meta = metadataList.find((m: any) => m.slideNumber === idx) || {};
                    results.push({
                      slideNumber: idx,
                      title: meta.title || `Слайд ${idx}`,
                      paragraphs: Array.isArray(meta.paragraphs)
                        ? meta.paragraphs
                        : meta.paragraphs
                          ? [meta.paragraphs]
                          : [],
                      hasTable: !!meta.hasTable,
                      tableHeaders: Array.isArray(meta.tableHeaders) ? meta.tableHeaders : [],
                      tableRows: Array.isArray(meta.tableRows) ? meta.tableRows : [],
                      aspectRatio: meta.aspectRatio || '4:3',
                      imageUrl: `data:image/png;base64,${imgBuf.toString('base64')}`,
                    });
                    idx++;
                  } else {
                    break;
                  }
                }

                try {
                  fs.rmSync(tempDir, { recursive: true, force: true });
                } catch {}

                if (results.length > 0) {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, slides: results }));
                } else {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({ success: false, error: 'No slides exported', stdout, stderr }),
                  );
                }
              } catch (e: any) {
                try {
                  fs.rmSync(tempDir, { recursive: true, force: true });
                } catch {}
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e?.message || 'Error' }));
              }
            },
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), presentationRendererPlugin()],
  esbuild: {
    target: 'es2022',
    legalComments: 'none',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
  resolve: {
    alias: {
      zod: path.resolve(__dirname, './node_modules/zod'),
      '@': path.resolve(__dirname, './src'),
      '@backend/common/contracts': path.resolve(
        __dirname,
        '../../packages/shared/contracts/src/index.ts',
      ),
      '@backend/messenger/events/ws-events': path.resolve(
        __dirname,
        '../../packages/shared/socket/src/events.ts',
      ),
      '@backend': path.resolve(__dirname, '../backend/src'),
      '@common/contracts': path.resolve(__dirname, '../../packages/shared/contracts/src/index.ts'),
      '@common': path.resolve(__dirname, '../backend/src/common'),
      '@shared/contracts': path.resolve(__dirname, '../../packages/shared/contracts/src/index.ts'),
      '@shared/utils': path.resolve(__dirname, '../../packages/shared/utils/src/index.ts'),
      '@shared/crypto': path.resolve(__dirname, '../../packages/shared/crypto/src/index.ts'),
      '@shared/socket': path.resolve(__dirname, '../../packages/shared/socket/src/index.ts'),
      '@shared/stores': path.resolve(__dirname, '../../packages/shared/stores/src/index.ts'),
      '@shared/api-client': path.resolve(
        __dirname,
        '../../packages/shared/api-client/src/index.ts',
      ),
      '@shared/ui-primitives': path.resolve(
        __dirname,
        '../../packages/shared/ui-primitives/src/index.ts',
      ),
      '@social-network/text-pipeline': path.resolve(
        __dirname,
        '../../packages/text-pipeline/src/index.ts',
      ),
      '@social-network/msg-codec': path.resolve(__dirname, '../../packages/msg-codec/src/index.ts'),
      '@social-network/blinded-crypto': path.resolve(
        __dirname,
        '../../packages/blinded-crypto/src/index.ts',
      ),
      '@social-network/feed-score': path.resolve(
        __dirname,
        '../../packages/feed-score/src/index.ts',
      ),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('curatedMediaCatalogPart1')) {
            return 'showcase-catalog-1';
          }
          if (normalizedId.includes('curatedMediaCatalogPart2')) {
            return 'showcase-catalog-2';
          }
          if (
            normalizedId.includes('/entities/profile/ui/') &&
            (normalizedId.includes('Badge') || normalizedId.includes('Tier'))
          ) {
            return 'profile-badges';
          }
          if (normalizedId.includes('/features/music/model/useMusicHubStore')) {
            return 'music-store';
          }

          if (id.includes('node_modules')) {
            if (normalizedId.includes('/emoji-picker-react/')) {
              return 'vendor-emoji';
            }
            if (normalizedId.includes('/lucide-react/')) {
              return 'vendor-icons';
            }
            if (
              normalizedId.includes('/socket.io-client/') ||
              normalizedId.includes('/engine.io-client/')
            ) {
              return 'vendor-socket';
            }
            if (normalizedId.includes('/@tanstack/') || normalizedId.includes('/zustand/')) {
              return 'vendor-state';
            }
            if (normalizedId.includes('/@sentry/')) {
              return 'vendor-sentry';
            }
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router/') ||
              normalizedId.includes('/node_modules/react-router-dom/') ||
              normalizedId.includes('/node_modules/scheduler/') ||
              normalizedId.includes('/node_modules/use-sync-external-store/')
            ) {
              return 'vendor-react';
            }
            if (
              normalizedId.includes('/react-hook-form/') ||
              normalizedId.includes('/zod/') ||
              normalizedId.includes('/@hookform/')
            ) {
              return 'vendor-forms';
            }
            if (normalizedId.includes('/katex/')) {
              return 'vendor-katex';
            }
            if (
              normalizedId.includes('/react-markdown/') ||
              normalizedId.includes('/remark-') ||
              normalizedId.includes('/rehype-') ||
              normalizedId.includes('/micromark') ||
              normalizedId.includes('/unified') ||
              normalizedId.includes('/unist-') ||
              normalizedId.includes('/vfile') ||
              normalizedId.includes('/mdast-') ||
              normalizedId.includes('/hast-') ||
              normalizedId.includes('/property-information') ||
              normalizedId.includes('/comma-separated-tokens') ||
              normalizedId.includes('/space-separated-tokens') ||
              normalizedId.includes('/decode-named-character-reference') ||
              normalizedId.includes('/character-entities') ||
              normalizedId.includes('/trough') ||
              normalizedId.includes('/zwitch') ||
              normalizedId.includes('/ccount') ||
              normalizedId.includes('/devlop') ||
              normalizedId.includes('/trim-lines') ||
              normalizedId.includes('/bail') ||
              normalizedId.includes('/longest-streak') ||
              normalizedId.includes('/is-plain-obj') ||
              normalizedId.includes('/markdown-table')
            ) {
              return 'vendor-markdown';
            }
            if (normalizedId.includes('/html-to-image/')) {
              return 'vendor-html-to-image';
            }
            if (
              normalizedId.includes('/prismjs/') ||
              normalizedId.includes('/prism-react-renderer/')
            ) {
              return 'vendor-prism';
            }
            if (normalizedId.includes('/axios/')) {
              return 'vendor-http';
            }
            if (normalizedId.includes('/wavesurfer.js/')) {
              return 'vendor-wavesurfer';
            }
            if (normalizedId.includes('/hls.js/')) {
              return 'vendor-hls';
            }
            if (normalizedId.includes('/@radix-ui/')) {
              return 'vendor-radix';
            }
            if (normalizedId.includes('/framer-motion/') || normalizedId.includes('/motion/')) {
              return 'vendor-motion';
            }
            return 'vendor-libs';
          }
        },
      },
    },
  },
});
