"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locales = void 0;
exports.t = t;
const zh_CN_1 = __importDefault(require("./zh-CN"));
const en_US_1 = __importDefault(require("./en-US"));
exports.locales = { 'zh-CN': zh_CN_1.default, 'en-US': en_US_1.default };
function t(key, locale = 'zh-CN') {
    const keys = key.split('.');
    let obj = exports.locales[locale];
    for (const k of keys) {
        if (obj == null)
            return key;
        obj = obj[k];
    }
    return typeof obj === 'string' ? obj : key;
}
//# sourceMappingURL=index.js.map