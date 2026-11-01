import { betterAuth } from 'better-auth';
import { OWNER_EMAIL } from './config.js';
export function isOwner(user) {
  return user?.emailVerified === true && typeof user.email === 'string' && user.email.toLowerCase() === OWNER_EMAIL;
}
export function authOptions(config, database) {
  return {
    appName: 'Jazfer Portfolio Admin', baseURL: config.authUrl, basePath:'/api/auth', secret:config.authSecret,
    database, trustedOrigins:[config.authOrigin],
    emailAndPassword:{enabled:false},
    socialProviders: config.googleClientId && config.googleClientSecret ? {google:{clientId:config.googleClientId, clientSecret:config.googleClientSecret, scope:['openid','email','profile'], prompt:'select_account'}} : {},
    account:{accountLinking:{enabled:false}, storeAccountCookie:false},
    session:{cookieCache:{enabled:false}, expiresIn:60 * 60 * 24, updateAge:60 * 60},
    user:{changeEmail:{enabled:false},deleteUser:{enabled:false}},
    advanced:{useSecureCookies:config.authOrigin.startsWith('https:'), defaultCookieAttributes:{httpOnly:true,sameSite:'lax'}},
    databaseHooks:{user:{create:{before:async user => isOwner(user)}}},
    logger:{disabled:true}
  };
}
export function createAuth(config, database) {
  return config.authReady ? betterAuth(authOptions(config,database)) : null;
}
