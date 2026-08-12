const colors = {
  blue: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const args = process.argv.slice(2);
const type = args[0];
const message = args.slice(1).join(' ');

switch (type) {
  case 'info':
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
    break;
  case 'success':
    console.log(`${colors.green}✔${colors.reset} ${message}`);
    break;
  case 'warn':
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
    break;
  case 'error':
    console.log(`${colors.red}✖ ${message}${colors.reset}`);
    break;
  case 'gray':
    console.log(`  ${colors.gray}${message}${colors.reset}`);
    break;
  case 'bold-success':
    console.log(`${colors.green}${colors.bold}✔ ${message}${colors.reset}`);
    break;
}
