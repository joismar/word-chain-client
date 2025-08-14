import React from "react";

export function useVisualViewport() {
    const [visualViewport, setVisualViewport] = React.useState<{
        width: number;
        height: number;
    }>({
        width: 0,
        height: 0,
    });

    React.useEffect(() => {
        const handleResize = () => {
            setVisualViewport({
                width: window.visualViewport?.width || 0,
                height: window.visualViewport?.height || 0,
            });
        }
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        }
    }, [])

    return visualViewport
}