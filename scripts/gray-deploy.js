#!/usr/bin/env node
// 灰度发布脚本 - 文档第7.2节
const GRAY_PERCENTAGE = parseInt(process.env.GRAY_PCT ?? '10', 10);
console.log(`🌓 灰度发布开始 | 首批灰度比例: ${GRAY_PERCENTAGE}%`);
// 模拟灰度流量分发
function isInGrayGroup(userId: string): boolean {
  const hash = [...userId].reduce((s, c) => s + c.charCodeAt(0), 0);
  return (hash % 100) < GRAY_PERCENTAGE;
}
console.log('灰度发布完成，请监控线上日志和错误率');
