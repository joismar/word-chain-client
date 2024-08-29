import * as React from "react";
import { Word } from "./Word";
import { Distance } from "@src/utils/types";

type InputProps = {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    value: string;
    distance?: Distance;
    ref?: React.RefObject<HTMLInputElement>;
    autoFocus?: boolean;
} & React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function Input({
    value,
    distance,
    ref,
    autoFocus,
    ...inputProps
}: InputProps) {
    const inputRef = ref || React.useRef<HTMLInputElement>(null);
    const [focused, setFocused] = React.useState(false);

    function handleFocus() {
        setFocused(true)
        inputRef.current?.focus();
    }

    React.useEffect(() => {
        autoFocus && handleFocus()
    }, [autoFocus])

    function onFocus() {
        setFocused(true)
    }

    function onUnfocus() {
        autoFocus ? handleFocus() : setFocused(false)
    }

    React.useEffect(() => {
        handleFocus()
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
            className={`w-full cursor-text`}
        >
            <Word distance={distance} blink={focused}>
                {inputRef.current?.value || ''}
            </Word>
            <input ref={inputRef} style={{ opacity: 0, position: 'absolute' }}
            aria-hidden="true" {...inputProps}/>
        </div>
    )
}