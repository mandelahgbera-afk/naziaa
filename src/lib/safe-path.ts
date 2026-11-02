/** A path on this site only. "//evil.com" and "/\\evil.com" both leave the site in a browser, so both are refused. */
export const isSafePath = (p: string | null | undefined): p is string => !!p && /^\/(?![/\\])/.test(p) && !/[\\\r\n]/.test(p);
