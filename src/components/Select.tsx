import React from "react";

type Option = {
    value: string;
    label: string;
}

type SelectProps = {
    options: Option[];
    onChange: (value: string) => void;
    value: Option['value'];
};

export function Select({
    options,
    onChange,
    value,
}: SelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);

  const handleOptionClick = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  function findLabelByValue(value: string) {
    const option = options.find((option) => option.value === value);
    return option ? option.label : '';
  }

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-900 text-gray-300 px-4 py-2 rounded flex justify-start"
      >
        {findLabelByValue(value).toUpperCase()}
        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-neutral-900 rounded">
          {options.map((option, index) => (
            <div
              key={index}
              onClick={() => handleOptionClick(option.value)}
              className="px-4 py-2 rouded cursor-pointer text-gray-300 hover:opacity-80"
            >
              {option.label.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}