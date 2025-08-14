import * as React from "react";
import { Letter, WordProps } from "./GridLayout";
import { useWordAnimations } from "@src/hooks/useWordAnimations";
import { animated } from "@react-spring/web";

type CustomInputProps = {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    itemGap,
    itemSize,
    index,
    maxSize = 8,
    ...wordProps
}: CustomInputProps) {
    const {
      word: input,
      hiddenProps: inputHiddenProps,
    } = useWordAnimations({ children: Array.from({ length: maxSize }, () => " ").join(""), itemGap, itemSize, index, ...wordProps });

    const inputRef = React.useRef<HTMLInputElement>(refElement || null);
    const [focused, setFocused] = React.useState<number | false>(false);

    React.useEffect(() => {
      if (!fixedFocus) return; 
      handleFocus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fixedFocus, focused])

    function handleFocus() {
      setFocused(0)
      inputRef.current?.focus();
    }

    function onFocus() {
      setFocused(0)
    }

    function onUnfocus() {
      if (fixedFocus) handleFocus()
      else setFocused(false)
    }

    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
      e.target.value = e.target.value.toLowerCase();
      setFocused(e.target.value.length);
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
                <Letter variant="input" blink={focused === i}>{char}</Letter>
              </animated.div>
            ))}
          </div>
          <div 
            className="absolute flex" 
            style={wordStyle(!!wordProps.hover)} 
            onClick={wordProps.onClick}
          >
            {Array.from(value).map((char, i) => (
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
          value={value}
          onChange={onChange} 
        />
    </>
    )
}