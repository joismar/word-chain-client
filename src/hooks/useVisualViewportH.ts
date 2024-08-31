import React from "react";

export function useVisualViewportH() {
    const [visualViewportH, setVisualViewportH] = React.useState(0);

    React.useEffect(() => {
        const handleResize = () => {
            setVisualViewportH(window.visualViewport?.height || 0);
        }
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        }
    }, [])

    return visualViewportH    
}