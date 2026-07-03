/** 全局统一API响应结构 - 文档第3.3节 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
  timestamp: number;
}

/** 解密状态响应 - 文档第3.3节 */
export interface DecryptStatusResponse {
  step: 1 | 2 | 3 | 4 | 5;
  stepName: string;
  progress: number;
  isComplete: boolean;
  encryptedFileKey?: string;
  errorMessage?: string;
}
