declare module 'netmask' {
  export class Netmask {
    constructor(cidr: string);
    contains(ip: string): boolean;
  }
}
