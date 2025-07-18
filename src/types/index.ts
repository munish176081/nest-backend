import { TokenData } from "src/helpers/createUserTokenData";

declare module 'express-session' {
  interface SessionData {
    user: TokenData;
    returnTo: string;
    messages: string[];
    passport: {
      user: TokenData;
    };
  }
}

declare module 'express' {
  interface Request {
    user?: TokenData;
  }
}
