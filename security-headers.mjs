import {randomBytes} from 'node:crypto';

// Nonces belong to one response. HTML remains no-store, including owner previews.
export function responseSecurity(res,{production=false}={}){
 const nonce=randomBytes(24).toString('base64');
 res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');
 res.setHeader('Content-Security-Policy',[
  "default-src 'self'",
  `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' https://checkout.razorpay.com`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://revakanya.com https://unicornproseries.com https://www.unicornproseries.com data: https://static.wixstatic.com",
  "connect-src 'self' https://*.razorpay.com",
  "frame-src https://*.razorpay.com",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"
 ].join('; '));
 // Observe legacy DOM sinks before enforcing Trusted Types; cart/admin use them.
 res.setHeader('Content-Security-Policy-Report-Only',"require-trusted-types-for 'script'");
 if(production)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
 return nonce;
}

// Apply only to repository-owned templates, before inserting saved content.
export function nonceTemplateScripts(html,nonce){
 return html.replace(/<script\b([^>]*)>/gi,(_,attributes)=>
  `<script nonce="${nonce}"${attributes.replace(/\snonce\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'')}>`);
}
