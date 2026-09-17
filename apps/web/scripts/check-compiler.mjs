import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

async function testReactCompiler() {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
            ecmaFeatures: { jsx: true },
          },
        },
        plugins: {
          'react-compiler': (await import('eslint-plugin-react-compiler')).default,
        },
        rules: {
          'react-compiler/react-compiler': 'error',
        },
      },
    ],
  });

  const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);
  let totalErrors = 0;
  for (const r of results) {
    const compilerMsgs = r.messages.filter((m) => m.ruleId === 'react-compiler/react-compiler');
    if (compilerMsgs.length > 0) {
      console.log(`\nFile: ${r.filePath}`);
      for (const m of compilerMsgs) {
        console.log(`  Line ${m.line}:${m.column} - ${m.message}`);
        totalErrors++;
      }
    }
  }
  console.log(`\nFiles scanned: ${results.length}`);
  console.log(`Total React Compiler Violations: ${totalErrors}`);
}

testReactCompiler().catch(console.error);
