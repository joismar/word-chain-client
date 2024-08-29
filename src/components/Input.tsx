import * as React from "react";
import { Word, WordProps } from "./Word";
import { Distance } from "@src/utils/types";
import { useEventSystem } from "@src/hooks/useEventSystem";

type InputProps = {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    distance?: Distance;
    ref?: React.RefObject<HTMLInputElement>;
    fixedFocus?: boolean;
    wordProps?: Omit<WordProps, "children">;
} & React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function Input({
    distance,
    ref,
    fixedFocus,
    wordProps,
    ...inputProps
}: InputProps) {
    const inputRef = ref || React.useRef<HTMLInputElement>(null);
    const [focused, setFocused] = React.useState(false);

    const { subscribe } = useEventSystem();

    React.useEffect(() => {
        const unsubscribe = subscribe("inputFocus", (name) => {
            if (name === inputProps.name) handleFocus();
        })

        return () => unsubscribe();
    }, [])

    React.useEffect(() => {
        fixedFocus && handleFocus();
        inputProps.autoFocus && handleFocus();
    }, [fixedFocus, inputProps.autoFocus])

    function handleFocus() {
        setFocused(true)
        inputRef.current?.focus();
    }

    function onFocus() {
        setFocused(true)
    }

    function onUnfocus() {
        fixedFocus ? handleFocus() : setFocused(false)
    }

    React.useEffect(() => {
        inputRef.current?.addEventListener('focusin', onFocus)
        inputRef.current?.addEventListener('focusout', onUnfocus)

        return () => {
            inputRef.current?.removeEventListener('focusin', onFocus)
            inputRef.current?.removeEventListener('focusout', onUnfocus)
        }
    }, [inputRef.current])

    return (
        <div
            onClick={() => handleFocus()}
            className={`relative w-full cursor-text overflow-hidden`}
        >
            <Word distance={distance} blink={focused} {...wordProps}>
                {inputRef.current?.value || ''}
            </Word>
            <input ref={inputRef} className="absolute w-0"
            aria-hidden="true" {...inputProps}/>
        </div>
    )
}