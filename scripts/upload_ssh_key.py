#!/usr/bin/env python3
"""上传 SSH 公钥到 mindflow-ecs 服务器"""
import subprocess
import os
import sys

SERVER = "47.86.31.53"
USER = "root"
PASS = "Qw201708029@"
HOME = os.environ["USERPROFILE"]
KEY_FILE = os.path.join(HOME, ".ssh", "id_ed25519.pub")

with open(KEY_FILE) as f:
    pubkey = f.read().strip()

remote_cmd = (
    f"mkdir -p ~/.ssh && "
    f"chmod 700 ~/.ssh && "
    f'echo {pubkey} >> ~/.ssh/authorized_keys && '
    f"chmod 600 ~/.ssh/authorized_keys && "
    f"echo SSH_OK"
)

ssh_cmd = [
    "ssh",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "PubkeyAuthentication=no",
    "-o", "PreferredAuthentications=password",
    "-tt",
    f"{USER}@{SERVER}",
    remote_cmd,
]

print(f"连接 {USER}@{SERVER}...")
proc = subprocess.Popen(
    ssh_cmd,
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

stdout, stderr = proc.communicate(input=f"{PASS}\n".encode(), timeout=30)

if b"SSH_OK" in stdout:
    print("✅ SSH 密钥已上传！现在可以免密登录。")
    # 测试免密连接
    test = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", f"{USER}@{SERVER}", "hostname"],
        capture_output=True, timeout=10,
    )
    if test.returncode == 0:
        print(f"✅ 免密连接成功！主机名: {test.stdout.decode().strip()}")
    else:
        print(f"⚠️ 免密测试: {test.stderr.decode()}")
else:
    print(f"❌ 失败")
    print(f"stdout: {stdout.decode(errors='replace')}")
    print(f"stderr: {stderr.decode(errors='replace')}")
