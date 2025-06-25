import * as requestIp from 'request-ip';
import { Request } from 'express';

export const parseIpFromReq = (req: Request): string => {
  const clientIp = requestIp.getClientIp(req);
  return clientIp;
};
