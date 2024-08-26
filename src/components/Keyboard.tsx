import { useKeyboard } from "@src/providers/KeyboardProvider";

export function Keyboard() {
    const { addKey } = useKeyboard();

    const rows = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', '⟵'],
        ['', '', '', '', '', '', '', '⟶']
      ];
    
      const handleKeyClick = (key: string) => {
        navigator.vibrate(5)
        key.length && addKey(key);
      };

      function keyClasses(key: string) {
        switch (key) {
            case '': return 'bg-transparent h-6'
            case '⟵': return 'bg-orange-700'
            case '⟶': return 'bg-teal-700 !max-w-[16vw] h-6'
            default: return 'bg-neutral-700'
        }
      }
    
      return (
        <div className="flex flex-col items-center space-y-2 w-full p-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center space-x-1 w-full">
          {row.map((key, i) => (
            <button
              key={i}
              className={`${keyClasses(key)} active:opacity-80 text-neutral-100 text-[4vw] font-bold rounded aspect-[3/4] w-full max-w-[8vw]`}
              onClick={() => handleKeyClick(key)}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      ))}
    </div>
      );
};