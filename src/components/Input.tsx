import * as React from "react";
import { Word, WordProps } from "./Word";
import { Distance } from "@src/utils/types";
import { BorderShadow } from "./BorderShadow";

type InputProps = {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    distance?: Distance;
    ref?: React.RefObject<HTMLInputElement>;
    containerRef?: React.RefObject<HTMLDivElement>;
    fixedFocus?: boolean;
    wordProps?: Omit<WordProps, "children">;
    value: string;
} & React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function Input({
    distance,
    ref,
    fixedFocus,
    wordProps,
    value,
    containerRef,
    onChange: userOnChange,
    ...inputProps
}: InputProps) {
    const inputRef = ref || React.useRef<HTMLInputElement>(null);
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
        fixedFocus && handleFocus();
    }, [fixedFocus])

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

    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
        e.target.value = e.target.value.toLowerCase();
        userOnChange?.(e);
    }

    React.useEffect(() => {
        inputRef.current?.addEventListener('focusin', onFocus)
        inputRef.current?.addEventListener('focusout', onUnfocus)

        return () => {
            inputRef.current?.removeEventListener('focusin', onFocus)
            inputRef.current?.removeEventListener('focusout', onUnfocus)
        }
    }, [inputRef.current])

    if (wordProps?.className)
        wordProps.className = `${wordProps?.className} `

    return (
        <div className="flex w-[100%] justify-between" ref={containerRef}>
            <BorderShadow
                size="64px"
                direction="r"
                className="z-[10]"
                isVisible
            />
            <div
                onClick={() => handleFocus()}
                className={`w-full h-full cursor-text overflow-hidden flex justify-end`}
            >    
                <Word distance={distance} blink={focused} {...wordProps}>
                    {value}
                </Word>
                <input 
                    ref={inputRef} 
                    className="absolute opacity-0 pointer-events-none" 
                    aria-hidden="true" autoComplete="off" 
                    value={value}
                    onChange={onChange} 
                    {...inputProps} 
                />
            </div>
        </div>
    )
}