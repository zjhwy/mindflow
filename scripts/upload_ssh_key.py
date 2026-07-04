#!/usr/bin/env python3
"""上传 SSH 公钥到远程服务器（使用 subprocess + 密码）"""
import subprocess
import os
import sys

SERVER = "47.86.31.53"
USER = "root"
PASSWORD = "Q01708029@"
HOME = os.environ.get("USERPROFILE", os.environ.get("HOME", ""))
PUBKEY_PATH = os.path.join(HOME, ".ssh", "id_ed25519.pub")

if not os.path.exists(PUBKEY_PATH):
    print(f"未找到公钥: {PUBKEY_PATH}")
    sys.exit(1)

with open(PUBKEY_PATH, "r") as f:
    pubkey = f.read().strip()

# 使用 ssh 的 -o PubkeyAuthentication=no 强制密码
# 配合 Windows OpenSSH，通过环境变量 SSH_ASKPASS 传递密码
script = os.path.join(os.path.dirname(__file__), "ssh_pass.bat")
with open(script, "w") as f:
    f.write(f'@echo {PASSWORD}\n')

os.environ["SSH_ASKPASS"] = script
os.environ["DISPLAY"] = "dummy"
os.environ["SSH_ASKPASS_REQUIRE"] = "force"

cmd = [
    "ssh",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "PubkeyAuthentication=no",
    "-o", "PreferredAuthentications=password",
    f"{USER}@{SERVER}",
    f"mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '{pubkey}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo SSH_KEY_UPLOADED",
]

print(f"正在连接 {USER}@{SERVER}...")
result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

if "SSH_KEY_UPLOADED" in result.stdout:
    print("✅ SSH 公钥已成功上传到服务器！")
else:
    print(f"stdout: {result.stdout}")
    print(f"stderr: {result.stderr}")
    print("❌ 上传失败，请检查密码")

os.remove(script)
