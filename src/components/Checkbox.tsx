type CheckboxProps = {
    label: string;
    onChange: (checked: boolean) => void;
    checked: boolean;
}

export function CheckBox({ label, onChange, checked }: CheckboxProps) {
    return (
      <div className="flex w-full h-10 items-center">
        <div className="flex-1">{label}</div>
        <div className="flex-1 w-full flex justify-end">
          <input type="checkbox" className="w-6 h-6" checked={checked} onChange={() => onChange(!checked)} />
        </div>
      </div>
    )
  }