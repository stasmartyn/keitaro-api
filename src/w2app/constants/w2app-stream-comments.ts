const W2APP_COMMENT_PREFIX = "onyx:";

export function encodeStreamAppComment(appId: string): string {
    return `${W2APP_COMMENT_PREFIX}${appId}`;
}

export function parseStreamAppComment(
    comments: string | null | undefined,
): string | null {
    if (!comments?.startsWith(W2APP_COMMENT_PREFIX)) {
        return null;
    }

    const appId = comments.slice(W2APP_COMMENT_PREFIX.length).trim();
    return appId.length > 0 ? appId : null;
}
