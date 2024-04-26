import "./Select.css";

export function Select<T>({ options, selected, onChange, map = it => it?.toString() ?? "", placeholder }: { options: T[], selected?: T, onChange: (option?: T) => void, map?: (it: T) => string, placeholder: string }) {
    return <select className="select" onChange={e => { if(e.target.selectedIndex > 0) onChange(options[e.target.selectedIndex - 1]); else onChange(); }}>
        <option selected={!selected} className="select-option">{placeholder}</option>
        {options.map((it, index) => <option selected={selected === it} className="select-option" value={index}>{map(it)}</option>)}
    </select>;
}