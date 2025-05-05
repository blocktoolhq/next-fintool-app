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
    return (
        <CitationBubble
            searchResultId={chunkId}
        />
    );
};
