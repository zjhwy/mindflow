// 上传 SSH 公钥到 ECS 服务器
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER = '47.86.31.53';
const USER = 'root';
const HOME = process.env.USERPROFILE || process.env.HOME;
const PUBKEY = fs.readFileSync(path.join(HOME, '.ssh', 'id_ed25519.pub'), 'utf8').trim();

console.log('通过密码方式上传 SSH 公钥...');

// 使用 scp + sshpass 或直接 ssh copy-id
const sshOpts = '-o StrictHostKeyChecking=accept-new';
const remoteCmd = `mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '${PUBKEY}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'DONE'`;

console.log(`连接 ${USER}@${SERVER}...`);

// 尝试使用 ssh 的 password 方式
const child = spawn('ssh', [
  ...sshOpts.split(' '),
  `${USER}@${SERVER}`,
  remoteCmd,
], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

// 发送密码
child.stdin.write('Q01708029@\n');
child.stdin.end();

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
  process.stderr.write(data);
});

child.on('close', (code) => {
  if (stdout.includes('DONE') || code === 0) {
    console.log('\n✅ SSH 密钥已上传到服务器！');
  } else {
    console.log(`\n❌ 退出码: ${code}`);
    console.log('请手动执行:');
    console.log(`ssh-copy-id root@${SERVER}`);
    console.log(`密码: Q01708029@`);
  }
});
