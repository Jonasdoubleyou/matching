import "./NumberInput.css";

export function NumberInput({ value, setValue, placeholder }: { value: number, setValue: (it: number) => void, placeholder: string }) {
    return <div className="number-input">
        <div className="number-input-placeholder">{placeholder}</div>
        <input className="number-input-value" value={value} onChange={e => setValue(parseInt(e.target.value, 10))} />
    </div>
}