import * as React from "react";
import { Letter, WordProps } from "./GridLayout";
import { useWordAnimations } from "@src/hooks/useWordAnimations";
import { animated } from "@react-spring/web";
import { sanitizeInput } from "@src/utils/helpers";

type CustomInputProps = {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    refElement?: HTMLInputElement;
    fixedFocus?: boolean;
    maxSize?: number;
    value: string;
} & Omit<WordProps, "children">;

export function CustomInput({
    refElement,
    fixedFocus,
    value,
    onChange: userOnChange,
    onKeyDown,
    itemGap,
    itemSize,
    index,
    maxSize = 8,
    ...wordProps
}: CustomInputProps) {
    const sanitizedValue = sanitizeInput(value || "");

    const {
      word: input,
      hiddenProps: inputHiddenProps,
    } = useWordAnimations({ children: Array.from({ length: maxSize }, () => " ").join(""), itemGap, itemSize, index, ...wordProps });

    const inputRef = React.useRef<HTMLInputElement>(refElement || null);
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      if (fixedFocus) {
        handleFocus();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fixedFocus]);

    function handleFocus() {
      setIsFocused(true);
      inputRef.current?.focus();
    }

    function onFocus() {
      setIsFocused(true);
    }

    function onUnfocus() {
      if (fixedFocus) {
        handleFocus();
      } else {
        setIsFocused(false);
      }
    }

    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
      const sanitized = sanitizeInput(e.target.value);
      e.target.value = sanitized;
      userOnChange?.(e);
    }

    React.useEffect(() => {
        const ref = inputRef.current;
        ref?.addEventListener('focusin', onFocus)
        ref?.addEventListener('focusout', onUnfocus)

        return () => {
            ref?.removeEventListener('focusin', onFocus)
            ref?.removeEventListener('focusout', onUnfocus)
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputRef.current])

    const activeIndex = isFocused && sanitizedValue.length < maxSize ? sanitizedValue.length : -1;

    const wordStyle = (hover: boolean) => ({
        gap: `${itemGap}rem`,
        zIndex: 10,
        cursor: hover ? 'pointer' : 'default',
      })
    
    const letterStyle = () => ({
        width: `${itemSize}rem`,
        height: `${itemSize}rem`,
    })

    return (
      <>
        <div className={wordProps.hidden ? "hidden" : ""}>
          <div 
            className="absolute flex" 
            style={wordStyle(!!wordProps.hover)} 
            onClick={() => handleFocus()}
          >
            {Array.from(input).map((char, i) => (
              <animated.div
                className="transition-y duration-100 cursor-pointer"
                key={i}
                style={{
                  ...letterStyle(),
                  ...inputHiddenProps[i],
                }}
              >
                <Letter variant="input" blink={activeIndex === i}>{char}</Letter>
              </animated.div>
            ))}
          </div>
          <div 
            className="absolute flex" 
            style={wordStyle(!!wordProps.hover)} 
            onClick={wordProps.onClick}
          >
            {Array.from(sanitizedValue).map((char, i) => (
              <div 
                key={i}
                style={{
                  ...letterStyle(), 
                }}
              >
                <Letter variant="default" animate>{char}</Letter>
              </div>
            ))}
          </div>
        </div>
        <input 
          ref={inputRef} 
          className="absolute opacity-0 pointer-events-none w-full" 
          aria-hidden="true" 
          autoComplete="off" 
          value={sanitizedValue}
          maxLength={maxSize}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
    </>
    )
}