#!/usr/bin/env node
// 性能压测脚本 - 文档第6.2/7.3节
const BASE = process.env.API_URL ?? 'http://localhost:3000';
const CONCURRENT = 50;
const DURATION_MS = 10_000;

async function req(method = 'GET', path = '/api/v1/nodes/test/inner-lines') {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { method });
    return { ok: res.ok, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, err: String(e) };
  }
}

async function run() {
  console.log(`🚀 性能测试开始 | 并发: ${CONCURRENT} | 时长: ${DURATION_MS}ms`);
  let total = 0, errors = 0, totalMs = 0;
  const t0 = Date.now();

  while (Date.now() - t0 < DURATION_MS) {
    const batch: Promise<any>[] = [];
    for (let i = 0; i < CONCURRENT; i++) batch.push(req());
    const results = await Promise.all(batch);
    results.forEach(r => { total++; if (!r.ok) errors++; totalMs += r.ms; });
  }

  const elapsed = Date.now() - t0;
  console.log(`QPS: ${(total/(elapsed/1000)).toFixed(1)} | 错误率: ${((errors/total)*100).toFixed(2)}% | 平均延迟: ${(totalMs/total).toFixed(1)}ms`);
}

run().catch(console.error);
