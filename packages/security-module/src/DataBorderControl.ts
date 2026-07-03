/** DataBorderControl - 数据跨境阻断管控 文档第4.4节 */
export class DataBorderControl {
  private allowedCountries = ['CN'];
  private allowedIPs: string[] = [];
  checkAccess(ip: string, country?: string): { allowed: boolean; reason?: string } {
    if (country && !this.allowedCountries.includes(country)) return { allowed: false, reason: `国家 ${country} 不在白名单` };
    if (this.allowedIPs.length > 0 && !this.allowedIPs.includes(ip)) return { allowed: false, reason: 'IP 不在白名单' };
    return { allowed: true };
  }
  setWhitelist(countries: string[], ips: string[]) { this.allowedCountries = countries; this.allowedIPs = ips; }
}
