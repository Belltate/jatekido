// Az Electron indítása fejlesztéshez (`npm start`). A VS Code-ból (és a Claude Code-ból) indított
// terminál örökölheti az ELECTRON_RUN_AS_NODE=1 változót, amitől az Electron sima Node-ként futna.
import { spawn } from 'node:child_process';
import electronPath from 'electron';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electronPath, ['.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
