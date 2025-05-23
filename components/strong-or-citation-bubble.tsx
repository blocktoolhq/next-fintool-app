import React, { PropsWithChildren } from "react";
import { CitationBubble } from "./citation-bubble";


export const StrongOrCitationBubble: React.FC<PropsWithChildren> = ({
    children,
    ...props
}) => {
    const text = children?.toString() || '';
    const match = text.match(/^\[(.*?)\]$/);

    if (!match) {
        return <strong {...props}>{children}</strong>;
    }

    const chunkId = match[1];
    
    // Ensure chunkId is a valid string
    if (!chunkId || typeof chunkId !== 'string' || chunkId.trim() === '') {
        console.error('Invalid chunkId:', chunkId);
        return <strong {...props}>{children}</strong>;
    }

    return (
        <CitationBubble
            searchResultId={chunkId.trim()}
        />
    );
};
